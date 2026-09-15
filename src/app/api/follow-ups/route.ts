import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const repId = searchParams.get("repId") || "";

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    };

    if (session.user.role === "MEDICAL_REP") {
      where.repId = session.user.id;
    } else if (repId) {
      where.repId = repId;
    }

    if (status) where.status = status;

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        rep: { select: { id: true, name: true } },
        doctor: true,
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({ followUps });
  } catch (error) {
    console.error("GET follow-ups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { repId, doctorId, visitId, dueDate, actionType, notes } = body;

    if (!repId || !doctorId || !dueDate || !actionType) {
      return NextResponse.json(
        { error: "repId, doctorId, dueDate, and actionType are required" },
        { status: 400 }
      );
    }

    const followUp = await prisma.followUp.create({
      data: {
        repId,
        doctorId,
        visitId: visitId || null,
        dueDate: new Date(dueDate),
        actionType,
        notes: notes || null,
        status: "PENDING",
        companyId: session.user.companyId,
      },
      include: {
        rep: { select: { id: true, name: true } },
        doctor: true,
      },
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch (error) {
    console.error("POST follow-ups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const followUp = await prisma.followUp.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
      include: {
        rep: { select: { id: true, name: true } },
        doctor: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT follow-ups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
