"use client";

export default function TestAiPage() {
  async function test() {
    const currentPage = {
      id: "home",
      title: "The Ultimate Guide to Buying Your First Home in Australia",
      path: "/blogs/the-ultimate-guide-to-buying-your-first-home-in-australia",
      language: "en",
      siteName: "propzen",
      plainTextContent: `
Buying your first home in Australia requires careful financial planning.
This guide covers home loans, government schemes,
property inspections, budgeting and settlement.
      `,
    };

    const response = await fetch("/api/link-opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(currentPage),
    });

    const json = await response.json();

    console.log(json);
  }

  return (
    <main style={{ padding: 40 }}>
      <button onClick={test}>Test LinkWise AI</button>
    </main>
  );
}
