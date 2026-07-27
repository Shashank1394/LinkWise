import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createLinkAnalysisService } from "../../../../lib/recommendations/factory";

const CurrentPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  language: z.string().min(1),
  siteName: z.string().min(1),
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
  try {
    const { currentPage, opportunity } = ApprovalRequestSchema.parse(
      await request.json(),
    );

    await createLinkAnalysisService().approveLink(currentPage, opportunity);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to add the link.",
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
