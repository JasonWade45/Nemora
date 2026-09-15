import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const link = await prisma.repDoctor.findFirst({
      where: { id, repId: session.user.id },
    });

    if (!link && session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!link) {
      const adminLink = await prisma.repDoctor.findUnique({ where: { id } });
      if (!adminLink) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }
      await prisma.repDoctor.delete({ where: { id } });
    } else {
      await prisma.repDoctor.delete({ where: { id } });
    }

    return NextResponse.json({ message: "Doctor removed from my doctors" });
  } catch (error) {
    console.error("DELETE my-doctors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
