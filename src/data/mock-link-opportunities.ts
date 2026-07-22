import { LinkOpportunity } from "../lib/recommendations/types";

export const mockLinkOpportunities: LinkOpportunity[] = [
  {
    sourceText: "About Us",
    anchorText: "About Us",

    destination: {
      id: "1",
      title: "About Us",
      path: "/about",
    },

    score: 96,

    reason: "Frequently linked from similar landing pages.",

    seoBenefit: "Helps users learn more about your organization.",
  },

  {
    sourceText: "Pricing",
    anchorText: "Pricing",

    destination: {
      id: "2",
      title: "Pricing",
      path: "/pricing",
    },

    score: 91,

    reason: "Users reading this topic often compare pricing.",

    seoBenefit: "Improves internal navigation to commercial pages.",
  },

  {
    sourceText: "Contact",
    anchorText: "Contact",

    destination: {
      id: "3",
      title: "Contact",
      path: "/contact",
    },

    score: 84,

    reason: "Natural next step after reading this content.",

    seoBenefit: "Encourages conversions through internal navigation.",
  },
];
