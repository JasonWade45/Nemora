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
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const repId = searchParams.get("repId");

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    };

    if (session.user.role === "MEDICAL_REP") {
      where.repId = session.user.id;
    } else if (repId) {
      where.repId = repId;
    }

    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const targets = await prisma.target.findMany({
      where,
      include: {
        rep: { select: { id: true, name: true, profileImage: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json({ targets });
  } catch (error) {
    console.error("GET targets error:", error);
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
    const { repId, month, year, totalVisits, totalDoctors, newDoctors, followUps } = body;

    if (!repId || !month || !year) {
      return NextResponse.json({ error: "repId, month, and year are required" }, { status: 400 });
    }

    const existing = await prisma.target.findUnique({
      where: { repId_month_year: { repId, month: parseInt(month), year: parseInt(year) } },
    });

    if (existing) {
      const updated = await prisma.target.update({
        where: { id: existing.id },
        data: {
          totalVisits: totalVisits ?? existing.totalVisits,
          totalDoctors: totalDoctors ?? existing.totalDoctors,
          newDoctors: newDoctors ?? existing.newDoctors,
          followUps: followUps ?? existing.followUps,
        },
        include: {
          rep: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(updated);
    }

    const target = await prisma.target.create({
      data: {
        repId,
        month: parseInt(month),
        year: parseInt(year),
        totalVisits: totalVisits || 0,
        totalDoctors: totalDoctors || 0,
        newDoctors: newDoctors || 0,
        followUps: followUps || 0,
        companyId: session.user.companyId,
      },
      include: {
        rep: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(target, { status: 201 });
  } catch (error) {
    console.error("POST targets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
