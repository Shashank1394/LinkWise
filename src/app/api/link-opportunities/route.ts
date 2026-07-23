import { NextRequest, NextResponse } from "next/server";

import { createLinkAnalysisService } from "../../../lib/recommendations/factory";
import { CurrentPage } from "../../../lib/recommendations/types";

export async function POST(request: NextRequest) {
  try {
    const currentPage = (await request.json()) as CurrentPage;

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
        status: 500,
      },
    );
  }
}
