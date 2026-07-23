import { NextResponse } from "next/server";
import { AgentApiClient } from "../../../../lib/sitecore/AgentApiClient";

export async function GET() {
  try {
    const client = new AgentApiClient();

    const sites = await client.getSites();

    return NextResponse.json({
      success: true,
      data: sites,
    });
  } catch (error) {
    console.error(error);

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
