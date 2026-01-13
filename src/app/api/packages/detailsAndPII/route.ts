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
    const pkg = await service.readPackageDetailsAndPII(externalId);

    console.log('Fetched private package details:', pkg);
    return NextResponse.json({
      success: true,
      package: pkg,
      source: "private",
      externalId: externalId,
    });
  } catch (error: any) {
    console.error(`Error in /api/packages/detailsAndPII:`, error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}