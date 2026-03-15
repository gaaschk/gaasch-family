import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';

export async function GET(req: NextRequest, { params }: { params: { treeId: string } }) {
  const { treeId } = params;
  const docs = await prisma.document.findMany({ where: { treeId } });
  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest, { params }: { params: { treeId: string } }) {
  // Minimal: accept JSON payload describing a document to create metadata; actual file upload can be wired later
  const body = await req.json();
  const { title, filename, mimeType, size, storageKey } = body;
  if (!title || !filename) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const doc = await prisma.document.create({ data: { treeId, title, filename, mimeType, size: size ?? 0, storageKey, uploadedBy: 'system' } });
  return NextResponse.json({ document: doc });
}
