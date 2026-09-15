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

    if (session.user.role !== "MEDICAL_REP") {
      return NextResponse.json({ error: "Only medical reps can complete visits" }, { status: 403 });
    }

    const body = await req.json();
    const {
      visitId,
      doctorResponse,
      notes,
      products,
      nextFollowUpDate,
      nextFollowUpType,
      nextFollowUpNotes,
    } = body;

    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        repId: session.user.id,
        status: "IN_PROGRESS",
      },
    });

    if (!visit) {
      return NextResponse.json(
        { error: "Active visit not found for this rep" },
        { status: 404 }
      );
    }

    const endTime = new Date();
    const duration = Math.round(
      (endTime.getTime() - new Date(visit.startTime).getTime()) / 60000
    );

    const updatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: "COMPLETED",
        endTime,
        duration,
        doctorResponse: doctorResponse || null,
        notes: notes || null,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        nextFollowUpType: nextFollowUpType || null,
        nextFollowUpNotes: nextFollowUpNotes || null,
      },
    });

    if (products && Array.isArray(products) && products.length > 0) {
      await prisma.visitProduct.createMany({
        data: products.map((productId: string) => ({
          visitId,
          productId,
        })),
      });
    }

    if (nextFollowUpDate && nextFollowUpType) {
      await prisma.followUp.create({
        data: {
          repId: session.user.id,
          doctorId: visit.doctorId,
          visitId,
          dueDate: new Date(nextFollowUpDate),
          actionType: nextFollowUpType,
          notes: nextFollowUpNotes || null,
          status: "PENDING",
          companyId: session.user.companyId,
        },
      });
    }

    return NextResponse.json({
      visit: updatedVisit,
      duration,
    });
  } catch (error) {
    console.error("POST complete visit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
