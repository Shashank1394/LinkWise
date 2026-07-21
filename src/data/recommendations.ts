import { Recommendation } from "../components/suggestions/Recommendation";

export const recommendations: Recommendation[] = [
  {
    id: "1",
    title: "About Us",
    path: "/about",
    score: 0.96,
    reason: "Frequently linked from similar landing pages.",
  },
  {
    id: "2",
    title: "Pricing",
    path: "/pricing",
    score: 0.91,
    reason: "High semantic similarity.",
  },
  {
    id: "3",
    title: "Contact",
    path: "/contact",
    score: 0.84,
    reason: "Common next step for visitors.",
  },
];
