"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getPosts() {
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const authorId = formData.get("authorId") as string;

  if (!title || !authorId) throw new Error("Título e autor são obrigatórios");

  await prisma.post.create({
    data: { title, content: content || null, authorId },
  });
  revalidatePath("/posts");
}

export async function togglePublishPost(id: string, published: boolean) {
  await prisma.post.update({
    where: { id },
    data: { published: !published },
  });
  revalidatePath("/posts");
}

export async function deletePost(id: string) {
  await prisma.post.delete({ where: { id } });
  revalidatePath("/posts");
}
