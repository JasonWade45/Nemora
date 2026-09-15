import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const doctor = await prisma.doctor.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        specialty: true,
        visits: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { rep: { select: { id: true, name: true } } },
        },
        locations: true,
        schedules: true,
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json(doctor);
  } catch (error) {
    console.error("GET doctor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.doctor.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        phone: body.phone ?? existing.phone,
        email: body.email ?? existing.email,
        specialtyId: body.specialtyId ?? existing.specialtyId,
        subSpecialty: body.subSpecialty ?? existing.subSpecialty,
        gender: body.gender ?? existing.gender,
        clinicName: body.clinicName ?? existing.clinicName,
        address: body.address ?? existing.address,
        governorate: body.governorate ?? existing.governorate,
        city: body.city ?? existing.city,
        latitude: body.latitude ?? existing.latitude,
        longitude: body.longitude ?? existing.longitude,
        priority: body.priority ?? existing.priority,
      },
      include: { specialty: true },
    });

    return NextResponse.json(doctor);
  } catch (error) {
    console.error("PUT doctor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.doctor.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    await prisma.doctor.delete({ where: { id } });

    return NextResponse.json({ message: "Doctor deleted" });
  } catch (error) {
    console.error("DELETE doctor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
