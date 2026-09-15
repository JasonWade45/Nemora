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
    const repId = searchParams.get("repId") || "";
    const doctorId = searchParams.get("doctorId") || "";
    const status = searchParams.get("status") || "";
    const date = searchParams.get("date") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    };

    if (session.user.role === "MEDICAL_REP") {
      where.repId = session.user.id;
    } else if (repId) {
      where.repId = repId;
    }

    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.startTime = { gte: start, lte: end };
    }

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: {
          rep: { select: { id: true, name: true, profileImage: true } },
          doctor: { include: { specialty: true } },
          visitProducts: { include: { product: true } },
        },
        orderBy: { startTime: "desc" },
        skip,
        take: limit,
      }),
      prisma.visit.count({ where }),
    ]);

    return NextResponse.json({
      visits,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET visits error:", error);
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
    const { doctorId, visitPurpose, latitude, longitude, distanceFromDoctor, isVerified } = body;

    if (!doctorId || !visitPurpose) {
      return NextResponse.json({ error: "doctorId and visitPurpose are required" }, { status: 400 });
    }

    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, companyId: session.user.companyId },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const visit = await prisma.visit.create({
      data: {
        repId: session.user.id,
        doctorId,
        visitPurpose,
        status: "IN_PROGRESS",
        startTime: new Date(),
        latitude: latitude || null,
        longitude: longitude || null,
        distanceFromDoctor: distanceFromDoctor || null,
        isVerified: isVerified || false,
        companyId: session.user.companyId,
      },
      include: {
        doctor: { include: { specialty: true } },
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error("POST visits error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
