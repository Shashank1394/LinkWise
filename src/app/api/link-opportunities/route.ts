import { NextRequest, NextResponse } from "next/server";

import { createLinkAnalysisService } from "../../../lib/recommendations/factory";
import { LinkAnalysisRequest } from "../../../lib/recommendations/types";

export async function POST(request: NextRequest) {
  console.log("========== Link Opportunities API ==========");

  try {
    const body = (await request.json()) as LinkAnalysisRequest;

    console.log("Request received");
    console.log("Current Page:", body.currentPage.title);
    console.log("Candidate Pages:", body.candidatePages.length);

    const service = createLinkAnalysisService();

    const opportunities = await service.analyze(
      body.currentPage,
      body.candidatePages,
    );

    console.log(`Generated ${opportunities.length} link opportunities.`);

    return NextResponse.json({
      success: true,
      opportunities,
    });
  } catch (error) {
    console.error("========== API ERROR ==========");
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
