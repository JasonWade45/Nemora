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
    const otherUserId = searchParams.get("userId");

    if (!otherUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, content } = body;

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: "receiverId and content are required" },
        { status: 400 }
      );
    }

    // Verify receiver exists and is in same company
    const receiver = await prisma.user.findFirst({
      where: { id: receiverId, companyId: session.user.companyId },
    });

    if (!receiver) {
      return NextResponse.json({ error: "Receiver not found" }, { status: 404 });
    }

    // Reps can only message their manager, managers/admins can message their subordinates
    if (session.user.role === "MEDICAL_REP") {
      if (receiver.role !== "MANAGER" && receiver.role !== "ADMIN") {
        return NextResponse.json({ error: "Can only message managers" }, { status: 403 });
      }
      if (receiver.id !== session.user.managerId) {
        return NextResponse.json({ error: "Can only message your manager" }, { status: 403 });
      }
    } else if (session.user.role === "MANAGER") {
      // Managers can message their subordinates or admins
      const isSubordinate = await prisma.user.findFirst({
        where: { id: receiverId, managerId: session.user.id },
      });
      const isAdmin = receiver.role === "ADMIN";
      if (!isSubordinate && !isAdmin) {
        return NextResponse.json({ error: "Can only message your team or admins" }, { status: 403 });
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("POST messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}