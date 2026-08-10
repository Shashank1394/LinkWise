import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createLinkAnalysisService } from "../../../../lib/service";

const CurrentPageSchema = z.object({
  id: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(500),
  path: z.string().trim().min(1).max(2_000),
  language: z.string().trim().min(1).max(50),
  siteName: z.string().trim().min(1).max(200),
});

const LinkOpportunitySchema = z.object({
  sourceText: z.string().min(1),
  anchorText: z.string().min(1),
  destination: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    path: z.string().min(1),
  }),
  score: z.number(),
  reason: z.string(),
  seoBenefit: z.string(),
});

const ApprovalRequestSchema = z.object({
  currentPage: CurrentPageSchema,
  opportunity: LinkOpportunitySchema,
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  let approvalRequest: z.infer<typeof ApprovalRequestSchema>;

  try {
    approvalRequest = ApprovalRequestSchema.parse(
      await request.json(),
    );
  } catch (error) {
    console.warn("[LinkWise] Invalid approval request", { requestId, error });
    return NextResponse.json(
      { success: false, error: "Invalid request.", requestId },
      { status: 400 },
    );
  }

  try {
    await createLinkAnalysisService().approveLink(
      approvalRequest.currentPage,
      approvalRequest.opportunity,
    );

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    console.error("[LinkWise] Link approval failed", { requestId, error });

    return NextResponse.json(
      {
        success: false,
        error: "Unable to add the link right now.",
        requestId,
      },
      { status: 500 },
    );
  }
}
