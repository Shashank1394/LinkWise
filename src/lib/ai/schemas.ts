import { z } from "zod";

export const PageReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  path: z.string(),
});

export const LinkOpportunitySchema = z.object({
  sourceText: z.string().min(1, "Source text cannot be empty"),

  anchorText: z.string().min(1, "Anchor text cannot be empty"),

  destination: PageReferenceSchema,

  score: z.number().min(0).max(100),

  reason: z.string().min(1, "Reason cannot be empty"),

  seoBenefit: z.string().min(1, "SEO benefit cannot be empty"),
});

export const LinkOpportunitiesSchema = z.array(LinkOpportunitySchema);

export type LinkOpportunityResponse = z.infer<typeof LinkOpportunitiesSchema>;
