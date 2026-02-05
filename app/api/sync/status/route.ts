import { NextResponse } from "next/server";
import { getCacheStatus } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getCacheStatus());
}
