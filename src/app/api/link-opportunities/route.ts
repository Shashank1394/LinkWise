import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createLinkAnalysisService } from "../../../lib/recommendations/factory";
import { CurrentPage } from "../../../lib/recommendations/types";

const CurrentPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  language: z.string().min(1),
  siteName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const currentPage = CurrentPageSchema.parse(
      await request.json(),
    ) as CurrentPage;

    const service = createLinkAnalysisService();

    const opportunities = await service.analyze(currentPage);

    return NextResponse.json({
      success: true,
      opportunities,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown server error.",
      },
      {
        status: error instanceof z.ZodError ? 400 : 500,
      },
    );
  }
}
