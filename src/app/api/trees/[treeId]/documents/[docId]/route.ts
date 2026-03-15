import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { treeId: string; docId: string } }) {
  const { treeId, docId } = params;
  const doc = await prisma.document.findFirst({ where: { id: docId, treeId } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // In a real implementation, fetch the file from storage using storageKey
  return NextResponse.json({ document: doc });
}
