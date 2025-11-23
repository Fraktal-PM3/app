import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const externalId = searchParams.get("externalId") || searchParams.get("id");

    if (!externalId) {
      return NextResponse.json(
        { success: false, error: "externalId is required" },
        { status: 400 }
      );
    }

    const service = await getPackageService();
    const blockchainData = await service.readBlockchainPackage(externalId);

    return NextResponse.json({
      success: true,
      package: blockchainData,
      source: "blockchain",
      externalId: externalId,
    });
  } catch (error: any) {
    console.error(`Error in /api/packages/blockchainInfo:`, error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}