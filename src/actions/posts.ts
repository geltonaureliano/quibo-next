"use server";

// Posts removidos do schema — este arquivo está mantido por compatibilidade.
// Use as actions de transactions para movimentações financeiras.

export async function getPosts() { return [] }
export async function getPostById(_id: string) { return null }
export async function createPost(_formData: FormData) {}
export async function deletePost(_id: string) {}
export async function togglePublishPost(_id: string) {}
