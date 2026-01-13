import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";
import { Status } from "fraktal-lib";

export const runtime = "nodejs";

interface Body {
  externalId?: string;
  status?: Status;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { externalId, status } = body ?? {};

    if (!externalId || !status) {
      return NextResponse.json(
        { success: false, error: "`externalId` and `status` are required." },
        { status: 400 }
      );
    }

    const service = await getPackageService();
    const result = await service.updatePackageStatus(externalId, status);

    return NextResponse.json({
      success: true,
      externalId,
      status,
      result,
    });
  } catch (error: any) {
    console.error("Error in /api/packages/status:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}