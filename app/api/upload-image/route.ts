import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, data } = body || {};
    if (!filename || !data) {
      return NextResponse.json(
        { ok: false, error: "Missing filename or data" },
        { status: 400 }
      );
    }

    // sanitize filename: keep lowercase letters, numbers, underscore and dot
    const safe = String(filename)
      .toLowerCase()
      .replace(/[^a-z0-9_\.]/g, "_")
      .replace(/__+/g, "_");

    // ensure png extension
    const outName = safe.endsWith(".png") ? safe : `${safe}.png`;

    const outDir = path.join(process.cwd(), "public", "img");
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, outName);

    // data is base64
    const buffer = Buffer.from(data, "base64");
    await fs.writeFile(outPath, buffer);

    return NextResponse.json({ ok: true, filename: outName });
  } catch (err: any) {
    console.error("/api/upload-image error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
