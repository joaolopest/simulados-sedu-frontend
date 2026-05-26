import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
  return NextResponse.json({
    id,
    status: "liberado",
    liberadoEm: new Date().toISOString(),
  });
}
