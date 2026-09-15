import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { isOnline, latitude, longitude } = body;

    const log = await prisma.connectivityLog.create({
      data: {
        userId: session.user.id,
        isOnline: isOnline !== false,
        latitude: latitude || null,
        longitude: longitude || null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("POST connectivity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reps = await prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
        role: "MEDICAL_REP",
      },
      select: {
        id: true,
        name: true,
      },
    });

    const repIds = reps.map((r) => r.id);

    const latestLogs = await prisma.$queryRaw`
      SELECT cl1.*
      FROM ConnectivityLog cl1
      INNER JOIN (
        SELECT userId, MAX(createdAt) as maxDate
        FROM ConnectivityLog
        WHERE userId IN (${repIds.join(",")})
        GROUP BY userId
      ) cl2 ON cl1.userId = cl2.userId AND cl1.createdAt = cl2.maxDate
    ` as Array<{
      id: string;
      userId: string;
      isOnline: boolean;
      latitude: number | null;
      longitude: number | null;
      createdAt: Date;
    }>;

    const result = reps.map((rep) => {
      const log = latestLogs.find((l) => l.userId === rep.id);
      return {
        ...rep,
        isOnline: log?.isOnline ?? false,
        lastLatitude: log?.latitude ?? null,
        lastLongitude: log?.longitude ?? null,
        lastSeen: log?.createdAt ?? null,
      };
    });

    return NextResponse.json({ reps: result });
  } catch (error) {
    console.error("GET connectivity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
