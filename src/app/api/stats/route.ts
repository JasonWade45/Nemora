import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalDoctors,
      visitsToday,
      monthlyVisits,
      activeReps,
      pendingFollowUps,
      completedFollowUps,
      monthlyTargets,
    ] = await Promise.all([
      prisma.doctor.count({ where: { companyId } }),
      prisma.visit.count({
        where: {
          companyId,
          startTime: { gte: today, lt: tomorrow },
        },
      }),
      prisma.visit.count({
        where: {
          companyId,
          startTime: { gte: monthStart },
        },
      }),
      prisma.user.count({
        where: { companyId, role: "MEDICAL_REP", isActive: true },
      }),
      prisma.followUp.count({
        where: { companyId, status: "PENDING" },
      }),
      prisma.followUp.count({
        where: {
          companyId,
          status: "COMPLETED",
          completedAt: { gte: monthStart },
        },
      }),
      prisma.target.findMany({
        where: {
          companyId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      }),
    ]);

    const totalTargetVisits = monthlyTargets.reduce((sum, t) => sum + t.totalVisits, 0);
    const targetAchievement = totalTargetVisits > 0
      ? Math.round((monthlyVisits / totalTargetVisits) * 100)
      : 0;

    const visitsTodayList = await prisma.visit.findMany({
      where: {
        companyId,
        startTime: { gte: today, lt: tomorrow },
      },
      select: { duration: true },
    });

    const avgDuration = visitsTodayList.length > 0
      ? Math.round(
          visitsTodayList.reduce((sum, v) => sum + (v.duration || 0), 0) / visitsTodayList.length
        )
      : 0;

    const uniqueDoctorsThisMonth = await prisma.visit.findMany({
      where: {
        companyId,
        startTime: { gte: monthStart },
      },
      select: { doctorId: true },
      distinct: ["doctorId"],
    });

    return NextResponse.json({
      totalDoctors,
      visitsToday,
      monthlyVisits,
      activeReps,
      pendingFollowUps,
      completedFollowUps,
      targetAchievement,
      avgVisitDuration: avgDuration,
      uniqueDoctorsThisMonth: uniqueDoctorsThisMonth.length,
    });
  } catch (error) {
    console.error("GET stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
