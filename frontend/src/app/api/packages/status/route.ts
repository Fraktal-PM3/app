import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";
import { Status } from "fraktal-lib";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const service = await getPackageService();
    const result = await service.updatePackageStatus(
      id,
      status as Status
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
