import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await getPackageService();
    const pkg = await service.readBlockchainPackage(id);

    return NextResponse.json({
      success: true,
      package: pkg,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
