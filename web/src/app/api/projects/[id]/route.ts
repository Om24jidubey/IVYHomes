import { NextRequest } from 'next/server';
import { proxyRequest } from '../../proxy';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRequest(request, `/v1/projects/${id}`);
}