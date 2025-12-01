import { NextResponse } from "next/server";
import { getMspIdentity } from "../../packages/service";

/**
 * GET /api/identities/current
 * Returns the current node's MSP identity
 */
export async function GET() {
  try {
    const identity = await getMspIdentity();
    
    if (!identity.mspId) {
      return NextResponse.json(
        { error: "Could not determine MSP identity" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mspId: identity.mspId,
      nodeOrg: identity.nodeOrg,
    });
  } catch (error) {
    console.error("[API] Error fetching current MSP identity:", error);
    return NextResponse.json(
      { error: "Failed to fetch current MSP identity", details: error },
      { status: 500 }
    );
  }
}
