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
    const search = searchParams.get("search") || "";
    const specialtyId = searchParams.get("specialtyId") || "";
    const priority = searchParams.get("priority") || "";
    const governorate = searchParams.get("governorate") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { clinicName: { contains: search } },
      ];
    }

    if (specialtyId) where.specialtyId = specialtyId;
    if (priority) where.priority = priority;
    if (governorate) where.governorate = governorate;

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        include: { specialty: true },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.doctor.count({ where }),
    ]);

    return NextResponse.json({
      doctors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET doctors error:", error);
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
    const { name, phone, email, specialtyId, subSpecialty, gender, clinicName, address, governorate, city, latitude, longitude, priority } = body;

    if (!name || !specialtyId) {
      return NextResponse.json({ error: "Name and specialty are required" }, { status: 400 });
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        specialtyId,
        subSpecialty: subSpecialty || null,
        gender: gender || null,
        clinicName: clinicName || null,
        address: address || null,
        governorate: governorate || null,
        city: city || null,
        latitude: latitude || null,
        longitude: longitude || null,
        priority: priority || "B",
        companyId: session.user.companyId,
      },
      include: { specialty: true },
    });

    return NextResponse.json(doctor, { status: 201 });
  } catch (error) {
    console.error("POST doctors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
