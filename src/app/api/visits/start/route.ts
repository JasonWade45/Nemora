import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "MEDICAL_REP") {
      return NextResponse.json({ error: "Only medical reps can start visits" }, { status: 403 });
    }

    const body = await req.json();
    const { doctorId, latitude, longitude, visitPurpose } = body;

    if (!doctorId || !latitude || !longitude || !visitPurpose) {
      return NextResponse.json(
        { error: "doctorId, latitude, longitude, and visitPurpose are required" },
        { status: 400 }
      );
    }

    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, companyId: session.user.companyId },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    let distanceFromDoctor = 0;
    let isVerified = false;

    if (doctor.latitude && doctor.longitude) {
      distanceFromDoctor = haversineDistance(latitude, longitude, doctor.latitude, doctor.longitude);
      isVerified = distanceFromDoctor <= 200;
    }

    const visit = await prisma.visit.create({
      data: {
        repId: session.user.id,
        doctorId,
        visitPurpose,
        status: "IN_PROGRESS",
        startTime: new Date(),
        latitude,
        longitude,
        distanceFromDoctor,
        isVerified,
        companyId: session.user.companyId,
      },
      include: {
        doctor: { include: { specialty: true } },
      },
    });

    return NextResponse.json({
      visitId: visit.id,
      visit,
      distanceFromDoctor,
      isVerified,
    }, { status: 201 });
  } catch (error) {
    console.error("POST start visit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
