import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Package ID is required" },
        { status: 400 }
      );
    }
    
    const service = await getPackageService();
    const pkg = await service.readPackageDetailsAndPII(id);

    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Package not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      package: pkg,
    });
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch package" },
      { status: 500 }
    );
  }
}