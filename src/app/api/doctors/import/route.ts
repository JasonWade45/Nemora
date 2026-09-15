import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const COLUMN_MAP: Record<string, string> = {
  "doctor name": "name",
  "doctor": "name",
  "name": "name",
  "specialty": "specialty",
  "speciality": "specialty",
  "phone": "phone",
  "phone number": "phone",
  "telephone": "phone",
  "email": "email",
  "email address": "email",
  "clinic": "clinicName",
  "clinic name": "clinicName",
  "address": "address",
  "city": "city",
  "governorate": "governorate",
  "state": "governorate",
  "working days": "workingDays",
  "working hours": "workingHours",
  "days": "workingDays",
  "hours": "workingHours",
};

function mapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (COLUMN_MAP[normalized]) {
      mapping[header] = COLUMN_MAP[normalized];
    }
  }
  return mapping;
}

function parseWorkingDays(value: string): number[] {
  if (!value) return [0, 1, 2, 3, 4];
  const dayMap: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };
  const parts = value.split(/[,;\/\s]+/).map((s) => s.trim().toLowerCase());
  const days: number[] = [];
  for (const part of parts) {
    if (dayMap[part] !== undefined) {
      days.push(dayMap[part]);
    } else if (!isNaN(parseInt(part))) {
      days.push(parseInt(part));
    }
  }
  return days.length > 0 ? days : [0, 1, 2, 3, 4];
}

function parseWorkingHours(value: string): { start: string; end: string } {
  if (!value) return { start: "09:00", end: "17:00" };
  const match = value.match(/(\d{1,2}:\d{2})\s*[-–to]+\s*(\d{1,2}:\d{2})/i);
  if (match) {
    return { start: match[1], end: match[2] };
  }
  return { start: "09:00", end: "17:00" };
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const columnMappingsRaw = formData.get("columnMappings") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: .xlsx, .xls, .csv" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "File is empty or has no data rows" },
        { status: 400 }
      );
    }

    const headers = Object.keys(rawData[0]);
    const autoMapping = mapColumns(headers);
    const columnMappings: Record<string, string> = columnMappingsRaw
      ? JSON.parse(columnMappingsRaw)
      : autoMapping;

    const companyId = session.user.companyId;

    const existingSpecialties = await prisma.specialty.findMany({
      where: { companyId },
    });
    const specialtyMap = new Map(
      existingSpecialties.map((s) => [s.name.toLowerCase(), s.id])
    );

    const existingDoctors = await prisma.doctor.findMany({
      where: { companyId },
      select: { name: true, phone: true, clinicName: true, id: true },
    });
    const existingSet = new Set(
      existingDoctors.map(
        (d) => `${d.name.toLowerCase()}|${d.phone || ""}|${d.clinicName || ""}`
      )
    );

    const imported: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      try {
        const mapped: Record<string, string> = {};
        for (const [csvCol, dbField] of Object.entries(columnMappings)) {
          if (row[csvCol] !== undefined && row[csvCol] !== "") {
            mapped[dbField] = String(row[csvCol]).trim();
          }
        }

        const name = mapped.name;
        if (!name) {
          errors.push(`Row ${i + 2}: Missing doctor name`);
          continue;
        }

        const phone = mapped.phone || null;
        const clinicName = mapped.clinicName || null;

        const dedupeKey = `${name.toLowerCase()}|${phone || ""}|${clinicName || ""}`;
        if (existingSet.has(dedupeKey)) {
          skipped.push(`Row ${i + 2}: "${name}" (duplicate)`);
          continue;
        }

        let specialtyId = "";
        if (mapped.specialty) {
          const found = specialtyMap.get(mapped.specialty.toLowerCase());
          if (found) {
            specialtyId = found;
          } else {
            const newSpecialty = await prisma.specialty.create({
              data: { name: mapped.specialty, companyId },
            });
            specialtyMap.set(mapped.specialty.toLowerCase(), newSpecialty.id);
            specialtyId = newSpecialty.id;
          }
        } else {
          const defaultSpecialty = await prisma.specialty.upsert({
            where: { id: "default" },
            update: {},
            create: { name: "General", companyId },
          }).catch(async () => {
            const existing = await prisma.specialty.findFirst({
              where: { companyId, name: "General" },
            });
            if (existing) return existing;
            return prisma.specialty.create({
              data: { name: "General", companyId },
            });
          });
          specialtyId = defaultSpecialty.id;
        }

        const doctor = await prisma.doctor.create({
          data: {
            name,
            phone,
            email: mapped.email || null,
            specialtyId,
            clinicName,
            address: mapped.address || null,
            city: mapped.city || null,
            governorate: mapped.governorate || null,
            priority: "B",
            companyId,
          },
        });

        const doctorId = doctor.id;

        if (mapped.workingDays) {
          const days = parseWorkingDays(mapped.workingDays);
          const hours = parseWorkingHours(mapped.workingHours || "");
          for (const day of days) {
            await prisma.doctorSchedule.create({
              data: {
                doctorId,
                dayOfWeek: day,
                startTime: hours.start,
                endTime: hours.end,
              },
            });
          }
        }

        existingSet.add(dedupeKey);
        imported.push(name);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${i + 2}: ${msg}`);
      }
    }

    return NextResponse.json({
      imported: imported.length,
      skipped: skipped.length,
      errors,
      skippedDetails: skipped,
    });
  } catch (error) {
    console.error("Import doctors error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
