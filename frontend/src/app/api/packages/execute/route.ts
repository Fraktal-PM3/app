import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";
import type { PackageDetails, PackagePII } from "fraktal-lib";

export const runtime = "nodejs";

interface Body {
  externalId?: string;
  termsId?: string;
  salt?: string;
  pii?: PackagePII;
  packageDetails?: PackageDetails;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { externalId, termsId, salt, pii, packageDetails } = body ?? {};

    if (!externalId || !termsId) {
      return NextResponse.json(
        { success: false, error: "`externalId` and `termsId` are required." },
        { status: 400 }
      );
    }

    if (!salt || !pii || !packageDetails) {
      return NextResponse.json(
        { success: false, error: "`salt`, `pii`, and `packageDetails` are required." },
        { status: 400 }
      );
    }

    const storeObject = {
      salt,
      pii,
      packageDetails
    };

    const service = await getPackageService();

    const result = await service.executeTransfer(
      externalId,
      termsId,
      storeObject
    );

    return NextResponse.json(
      {
        success: true,
        externalId,
        termsId,
        result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in /api/packages/execute:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unexpected server error",
      },
      { status: 500 }
    );
  }
}