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
        employeeId: true,
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
      const lastSeen = log?.createdAt ? new Date(log.createdAt) : null;
      const minutesAgo = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / 60000) : null;
      
      let status: 'active' | 'idle' | 'offline' = 'offline';
      if (log?.isOnline) {
        if (minutesAgo !== null && minutesAgo <= 5) {
          status = 'active';
        } else {
          status = 'idle';
        }
      }

      return {
        id: rep.id,
        name: rep.name,
        employeeId: rep.employeeId,
        status,
        latitude: log?.latitude ?? 31.2001,
        longitude: log?.longitude ?? 29.9187,
        lastUpdate: minutesAgo !== null ? `${minutesAgo} دقيقة` : 'غير معروف',
        lastSeen: log?.createdAt ?? null,
        isOnline: log?.isOnline ?? false,
      };
    });

    return NextResponse.json({ employees: result });
  } catch (error) {
    console.error("GET employees/location error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}