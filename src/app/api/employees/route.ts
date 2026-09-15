import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
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
    const role = searchParams.get("role") || "";
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    };

    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        employeeId: true,
        role: true,
        jobTitle: true,
        isActive: true,
        profileImage: true,
        managerId: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("GET employees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, phone, role, jobTitle, employeeId, managerId } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "email, password, name, and role are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const employee = await prisma.user.create({
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
        phone: true,
        employeeId: true,
        role: true,
        jobTitle: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("POST employees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
