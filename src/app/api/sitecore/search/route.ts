import { NextRequest, NextResponse } from "next/server";
import { AgentApiClient } from "../../../../lib/sitecore/AgentApiClient";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";

    const client = new AgentApiClient();

    const results = await client.searchPages("propzen", query);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
