from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.models.doctor import Doctor
from app.models.doctor_assignment import DoctorAssignment
from app.models.enums import AssignmentStatus, PriorityLevel
from app.models.user import User, UserRole
from app.modules.audit.service import create_audit_log
from app.schemas.doctor_assignment import (
    DoctorAssignmentCreateRequest,
    DoctorAssignmentListResponse,
    DoctorAssignmentResponse,
    DoctorAssignmentUpdateRequest,
)

router = APIRouter(prefix="/my-doctors", tags=["doctor-assignments"])


def _target_rep_id(current_user: User, payload_rep_id: str | None) -> str:
    if current_user.role.value == Role.MEDICAL_REP.value:
        if payload_rep_id and payload_rep_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only manage your own doctor assignments")
        return current_user.id

    if payload_rep_id:
        return payload_rep_id

    raise HTTPException(
        status_code=400,
        detail="medical_rep_id is required for ADMIN and MANAGER when assigning doctors",
    )


def _validate_rep(db: Session, org_id: str, medical_rep_id: str) -> User:
    rep = (
        db.query(User)
        .filter(
            User.id == medical_rep_id,
            User.organization_id == org_id,
            User.role == UserRole.MEDICAL_REP,
            User.is_active.is_(True),
        )
        .first()
    )
    if not rep:
        raise HTTPException(status_code=404, detail="Medical rep not found in your organization")
    return rep


def _get_doctor(db: Session, org_id: str, doctor_id: str) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.organization_id == org_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


def _to_assignment_response(assignment: DoctorAssignment, doctor: Doctor, rep: User) -> DoctorAssignmentResponse:
    return DoctorAssignmentResponse(
        id=assignment.id,
        organization_id=assignment.organization_id,
        doctor_id=assignment.doctor_id,
        doctor_name=doctor.full_name,
        doctor_specialty=doctor.specialty,
        medical_rep_id=assignment.medical_rep_id,
        medical_rep_name=rep.full_name,
        priority=assignment.priority,
        notes=assignment.notes,
        follow_up_date=assignment.follow_up_date,
        visit_frequency_days=assignment.visit_frequency_days,
        last_visit_at=assignment.last_visit_at,
        next_visit_at=assignment.next_visit_at,
        status=assignment.status,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


def _assignment_query_for_user(db: Session, current_user: User):
    query = (
        db.query(DoctorAssignment, Doctor, User)
        .join(Doctor, Doctor.id == DoctorAssignment.doctor_id)
        .join(User, User.id == DoctorAssignment.medical_rep_id)
        .filter(DoctorAssignment.organization_id == current_user.organization_id)
    )

    if current_user.role.value == Role.MEDICAL_REP.value:
        query = query.filter(DoctorAssignment.medical_rep_id == current_user.id)

    return query


@router.get("", response_model=DoctorAssignmentListResponse)
def list_my_doctors(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    medical_rep_id: str | None = Query(default=None),
    doctor_id: str | None = Query(default=None),
    status_filter: AssignmentStatus | None = Query(default=None, alias="status"),
    priority_filter: PriorityLevel | None = Query(default=None, alias="priority"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> DoctorAssignmentListResponse:
    query = _assignment_query_for_user(db, current_user)

    if medical_rep_id and current_user.role.value != Role.MEDICAL_REP.value:
        query = query.filter(DoctorAssignment.medical_rep_id == medical_rep_id)

    if doctor_id:
        query = query.filter(DoctorAssignment.doctor_id == doctor_id)

    if status_filter:
        query = query.filter(DoctorAssignment.status == status_filter)

    if priority_filter:
        query = query.filter(DoctorAssignment.priority == priority_filter)

    total = query.count()
    rows = (
        query.order_by(DoctorAssignment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return DoctorAssignmentListResponse(
        items=[_to_assignment_response(assignment, doctor, rep) for assignment, doctor, rep in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=DoctorAssignmentResponse, status_code=status.HTTP_201_CREATED)
def add_to_my_doctors(
    payload: DoctorAssignmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> DoctorAssignmentResponse:
    target_rep_id = _target_rep_id(current_user, payload.medical_rep_id)
    rep = _validate_rep(db, current_user.organization_id, target_rep_id)
    doctor = _get_doctor(db, current_user.organization_id, payload.doctor_id)

    existing = (
        db.query(DoctorAssignment)
        .filter(
            DoctorAssignment.organization_id == current_user.organization_id,
            DoctorAssignment.doctor_id == payload.doctor_id,
            DoctorAssignment.medical_rep_id == target_rep_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Doctor is already assigned to this medical rep")

    assignment = DoctorAssignment(
        organization_id=current_user.organization_id,
        doctor_id=payload.doctor_id,
        medical_rep_id=target_rep_id,
        priority=payload.priority,
        notes=payload.notes,
        follow_up_date=payload.follow_up_date,
        visit_frequency_days=payload.visit_frequency_days,
        next_visit_at=payload.next_visit_at,
        status=payload.status,
    )

    db.add(assignment)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCTOR_ASSIGNED_TO_REP",
        entity="DoctorAssignment",
        entity_id=assignment.id,
        metadata={
            "doctor_id": assignment.doctor_id,
            "medical_rep_id": assignment.medical_rep_id,
            "priority": assignment.priority.value,
        },
    )

    db.commit()
    db.refresh(assignment)

    return _to_assignment_response(assignment, doctor, rep)


@router.get("/{assignment_id}", response_model=DoctorAssignmentResponse)
def get_my_doctor_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> DoctorAssignmentResponse:
    row = (
        _assignment_query_for_user(db, current_user)
        .filter(DoctorAssignment.id == assignment_id)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment, doctor, rep = row
    return _to_assignment_response(assignment, doctor, rep)


@router.patch("/{assignment_id}", response_model=DoctorAssignmentResponse)
def update_my_doctor_assignment(
    assignment_id: str,
    payload: DoctorAssignmentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> DoctorAssignmentResponse:
    assignment = (
        db.query(DoctorAssignment)
        .filter(
            DoctorAssignment.id == assignment_id,
            DoctorAssignment.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_user.role.value == Role.MEDICAL_REP.value and assignment.medical_rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own assignments")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(assignment, field, value)

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCTOR_ASSIGNMENT_UPDATED",
        entity="DoctorAssignment",
        entity_id=assignment.id,
        metadata={"updated_fields": list(updates.keys())},
    )

    db.commit()
    db.refresh(assignment)

    doctor = _get_doctor(db, current_user.organization_id, assignment.doctor_id)
    rep = _validate_rep(db, current_user.organization_id, assignment.medical_rep_id)
    return _to_assignment_response(assignment, doctor, rep)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_my_doctors(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> None:
    assignment = (
        db.query(DoctorAssignment)
        .filter(
            DoctorAssignment.id == assignment_id,
            DoctorAssignment.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_user.role.value == Role.MEDICAL_REP.value and assignment.medical_rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only remove your own assignments")

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCTOR_ASSIGNMENT_REMOVED",
        entity="DoctorAssignment",
        entity_id=assignment.id,
        metadata={"doctor_id": assignment.doctor_id, "medical_rep_id": assignment.medical_rep_id},
    )

    db.delete(assignment)
    db.commit()
