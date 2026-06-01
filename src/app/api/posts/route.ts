import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, content, authorId } = body;

  if (!title || !authorId) {
    return NextResponse.json(
      { error: "Título e autorId são obrigatórios" },
      { status: 400 }
    );
  }

  const post = await prisma.post.create({
    data: { title, content, authorId },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(post, { status: 201 });
}
