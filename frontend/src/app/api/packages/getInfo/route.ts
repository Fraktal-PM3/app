import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";
import type { BlockchainPackage } from "fraktal-lib";

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
    
    try {
      // try to get private details and PII, if we are correct org
      const pkg = await service.readPackageDetailsAndPII(externalId);
      console.log('Fetched private package details: total', pkg);
      return NextResponse.json({
        success: true,
        package: pkg,
        source: "private",
        externalId: externalId,
      });
    } catch (piiError: any) {
      console.warn(`Failed to read PII for package ${externalId}, falling back to blockchain:`, piiError?.message);
      
      // get public blockchain data if other fails
      const pkg: BlockchainPackage = await service.readBlockchainPackage(externalId);
      return NextResponse.json({
        success: true,
        package: pkg,
        source: "blockchain",
        externalId: externalId,
      });
    }
  } catch (error: any) {
    console.error(`Error in /api/packages/getInfo:`, error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}