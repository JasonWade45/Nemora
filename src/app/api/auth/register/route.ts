import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Only admins can create users." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, name, phone, role, jobTitle, employeeId, managerId } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name, role" },
        { status: 400 }
      );
    }

    const validRoles = ["ADMIN", "MANAGER", "MEDICAL_REP"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN, MANAGER, or MEDICAL_REP" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role,
        jobTitle: jobTitle || null,
        employeeId: employeeId || null,
        managerId: managerId || null,
        companyId: session.user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        employeeId: true,
        jobTitle: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        metadata: JSON.stringify({ action: `Created user ${user.name} (${user.role})` }),
        companyId: session.user.companyId,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
