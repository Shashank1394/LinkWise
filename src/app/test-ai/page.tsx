"use client";

export default function TestAiPage() {
  async function test() {
    const response = await fetch("/api/link-opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPage: {
          id: "home",
          title: "AI Workflows",
          path: "/ai-workflows",
          language: "en",
          plainTextContent:
            "Sitecore Stream integrates with XM Cloud and Sitecore Search to build AI-powered marketing workflows.",
        },
        candidatePages: [
          {
            id: "1",
            title: "Sitecore Stream",
            path: "/sitecore-stream",
            plainTextContent:
              "Sitecore Stream enables AI-powered content workflows.",
          },
          {
            id: "2",
            title: "XM Cloud",
            path: "/xm-cloud",
            plainTextContent: "XM Cloud is Sitecore's SaaS CMS.",
          },
          {
            id: "3",
            title: "Sitecore Search",
            path: "/sitecore-search",
            plainTextContent: "Enterprise search platform from Sitecore.",
          },
        ],
      }),
    });

    const json = await response.json();

    console.log(json);
    console.log("Button clicked");
  }

  return (
    <main style={{ padding: 40 }}>
      <button onClick={test}>Test LinkWise AI</button>
    </main>
  );
}
