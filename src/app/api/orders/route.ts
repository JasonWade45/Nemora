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
    const doctorId = searchParams.get("doctorId") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    };

    if (session.user.role === "MEDICAL_REP") {
      where.repId = session.user.id;
    }

    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        rep: { select: { id: true, name: true } },
        doctor: { include: { specialty: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "MEDICAL_REP") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { doctorId, items, notes } = body;

    if (!doctorId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "doctorId and items array are required" },
        { status: 400 }
      );
    }

    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, companyId: session.user.companyId },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const totalItems = items.reduce(
      (sum: number, item: { quantity: number }) => sum + (item.quantity || 1),
      0
    );

    const order = await prisma.order.create({
      data: {
        repId: session.user.id,
        doctorId,
        notes: notes || null,
        totalItems,
        companyId: session.user.companyId,
        items: {
          create: items.map((item: { productId: string; quantity?: number }) => ({
            productId: item.productId,
            quantity: item.quantity || 1,
          })),
        },
      },
      include: {
        doctor: { include: { specialty: true } },
        items: { include: { product: true } },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("POST orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
