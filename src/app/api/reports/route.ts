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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "visits";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const repId = searchParams.get("repId");

    const companyId = session.user.companyId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const start = startDate ? new Date(startDate) : monthStart;
    const end = endDate ? new Date(endDate) : now;

    const whereBase = { companyId, startTime: { gte: start, lte: end } };
    if (repId) Object.assign(whereBase, { repId });

    switch (type) {
      case "visits": {
        const visits = await prisma.visit.findMany({
          where: whereBase,
          include: {
            rep: { select: { id: true, name: true } },
            doctor: { include: { specialty: true } },
            visitProducts: { include: { product: true } },
          },
          orderBy: { startTime: "desc" },
        });

        const summary = {
          total: visits.length,
          completed: visits.filter((v) => v.status === "COMPLETED").length,
          inProgress: visits.filter((v) => v.status === "IN_PROGRESS").length,
          cancelled: visits.filter((v) => v.status === "CANCELLED").length,
          avgDuration: visits.length > 0
            ? Math.round(visits.reduce((sum, v) => sum + (v.duration || 0), 0) / visits.length)
            : 0,
          verified: visits.filter((v) => v.isVerified).length,
        };

        return NextResponse.json({ type: "visits", summary, data: visits });
      }

      case "performance": {
        const reps = await prisma.user.findMany({
          where: { companyId, role: "MEDICAL_REP", isActive: true },
          select: { id: true, name: true },
        });

        const performance = await Promise.all(
          reps.map(async (rep) => {
            const visitCount = await prisma.visit.count({
              where: { ...whereBase, repId: rep.id },
            });

            const completedVisits = await prisma.visit.count({
              where: { ...whereBase, repId: rep.id, status: "COMPLETED" },
            });

            const uniqueDoctors = await prisma.visit.findMany({
              where: { ...whereBase, repId: rep.id },
              select: { doctorId: true },
              distinct: ["doctorId"],
            });

            const target = await prisma.target.findFirst({
              where: {
                repId: rep.id,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
              },
            });

            const achievement = target && target.totalVisits > 0
              ? Math.round((visitCount / target.totalVisits) * 100)
              : 0;

            return {
              repId: rep.id,
              repName: rep.name,
              totalVisits: visitCount,
              completedVisits,
              uniqueDoctors: uniqueDoctors.length,
              targetVisits: target?.totalVisits || 0,
              achievement,
            };
          })
        );

        return NextResponse.json({ type: "performance", data: performance });
      }

      case "doctors": {
        const doctors = await prisma.doctor.findMany({
          where: { companyId },
          include: {
            specialty: true,
            visits: {
              where: { startTime: { gte: start, lte: end } },
            },
          },
        });

        const doctorSummary = doctors.map((doc) => ({
          id: doc.id,
          name: doc.name,
          specialty: doc.specialty.name,
          priority: doc.priority,
          totalVisits: doc.visits.length,
          lastVisit: doc.visits.length > 0
            ? doc.visits.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0].startTime
            : null,
        }));

        return NextResponse.json({ type: "doctors", data: doctorSummary });
      }

      case "territory": {
        const governorates = await prisma.doctor.groupBy({
          by: ["governorate"],
          where: { companyId },
          _count: { id: true },
        });

        const visitsByTerritory = await prisma.visit.groupBy({
          by: ["doctorId"],
          where: whereBase,
          _count: { id: true },
        });

        return NextResponse.json({
          type: "territory",
          data: {
            doctorDistribution: governorates.map((g) => ({
              governorate: g.governorate || "Unknown",
              doctorCount: g._count.id,
            })),
            visitsByTerritory: visitsByTerritory.length,
          },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error) {
    console.error("GET reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
