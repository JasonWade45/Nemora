import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const visit = await prisma.visit.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        rep: { select: { id: true, name: true, profileImage: true, phone: true } },
        doctor: { include: { specialty: true } },
        visitProducts: { include: { product: true } },
        followUps: true,
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    return NextResponse.json(visit);
  } catch (error) {
    console.error("GET visit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.visit.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.status) updateData.status = body.status;
    if (body.endTime) updateData.endTime = new Date(body.endTime);
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.doctorResponse) updateData.doctorResponse = body.doctorResponse;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.nextFollowUpDate) updateData.nextFollowUpDate = new Date(body.nextFollowUpDate);
    if (body.nextFollowUpType) updateData.nextFollowUpType = body.nextFollowUpType;
    if (body.nextFollowUpNotes !== undefined) updateData.nextFollowUpNotes = body.nextFollowUpNotes;

    if (body.status === "COMPLETED" && !body.endTime) {
      updateData.endTime = new Date();
      updateData.duration = Math.round(
        (Date.now() - new Date(existing.startTime).getTime()) / 60000
      );
    }

    if (body.products && Array.isArray(body.products)) {
      await prisma.visitProduct.deleteMany({ where: { visitId: id } });
      if (body.products.length > 0) {
        await prisma.visitProduct.createMany({
          data: body.products.map((productId: string) => ({
            visitId: id,
            productId,
          })),
        });
      }
    }

    const visit = await prisma.visit.update({
      where: { id },
      data: updateData,
      include: {
        rep: { select: { id: true, name: true } },
        doctor: { include: { specialty: true } },
        visitProducts: { include: { product: true } },
      },
    });

    return NextResponse.json(visit);
  } catch (error) {
    console.error("PUT visit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
