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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = parseFloat(searchParams.get("radius") || "50000");
    const specialtyId = searchParams.get("specialtyId") || "";

    if (!lat || !lng) {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
      latitude: { not: null },
      longitude: { not: null },
    };

    if (specialtyId) where.specialtyId = specialtyId;

    const doctors = await prisma.doctor.findMany({
      where,
      include: { specialty: true },
    });

    const doctorsWithDistance = doctors
      .map((doctor) => {
        const distance = haversineDistance(lat, lng, doctor.latitude!, doctor.longitude!);
        return { ...doctor, distance };
      })
      .filter((doctor) => doctor.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ doctors: doctorsWithDistance });
  } catch (error) {
    console.error("GET nearby doctors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
