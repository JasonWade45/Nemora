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

    const links = await prisma.repDoctor.findMany({
      where: { repId: session.user.id },
      include: {
        doctor: {
          include: { specialty: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ doctors: links });
  } catch (error) {
    console.error("GET my-doctors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { repId, doctorId, interestLevel, notes } = body;

    if (!repId || !doctorId) {
      return NextResponse.json({ error: "repId and doctorId are required" }, { status: 400 });
    }

    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, companyId: session.user.companyId },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const existing = await prisma.repDoctor.findUnique({
      where: { repId_doctorId: { repId, doctorId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Doctor already assigned to this rep" }, { status: 409 });
    }

    const link = await prisma.repDoctor.create({
      data: {
        repId,
        doctorId,
        interestLevel: interestLevel || "MEDIUM",
        notes: notes || null,
      },
      include: { doctor: { include: { specialty: true } } },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("POST my-doctors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
