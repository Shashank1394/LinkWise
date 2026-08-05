import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createLinkAnalysisService } from "../../../lib/recommendations/factory";
import { CurrentPage } from "../../../lib/recommendations/types";

const CurrentPageSchema = z.object({
  id: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(500),
  path: z.string().trim().min(1).max(2_000),
  language: z.string().trim().min(1).max(50),
  siteName: z.string().trim().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let currentPage: CurrentPage;

  try {
    if (Number(request.headers.get("content-length") ?? 0) > 20_000) {
      return NextResponse.json(
        { success: false, error: "Request body is too large.", requestId },
        { status: 413 },
      );
    }
    currentPage = CurrentPageSchema.parse(
      await request.json(),
    );
  } catch (error) {
    console.warn("[LinkWise] Invalid analysis request", { requestId, error });
    return NextResponse.json(
      { success: false, error: "Invalid request.", requestId },
      { status: 400 },
    );
  }

  try {
    const service = createLinkAnalysisService();
    const opportunities = await service.analyze(currentPage);

    return NextResponse.json({
      success: true,
      opportunities,
      requestId,
    });
  } catch (error) {
    console.error("[LinkWise] Link analysis failed", { requestId, error });

    return NextResponse.json(
      {
        success: false,
        error: "Unable to analyze this page right now.",
        requestId,
      },
      { status: 500 },
    );
  }
}
