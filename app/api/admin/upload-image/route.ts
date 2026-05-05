import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BODY = {
  error:   "deprecated",
  message: "This route was replaced by the uploadPhoto server action (Phase 9d.5). Use PhotoUploader component or call uploadPhoto() directly.",
  docs:    "/admin/assets/upload",
};

export async function POST() {
  return NextResponse.json(BODY, { status: 410 });
}

export async function GET() {
  return NextResponse.json(BODY, { status: 410 });
}
