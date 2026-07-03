import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "mentik-api",
    cluster: "devnet",
    timestamp: Date.now(),
  });
}
