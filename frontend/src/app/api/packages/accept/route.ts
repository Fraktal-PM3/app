import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPackageService } from "../service";
import type { PackageDetails, PackagePII } from "fraktal-lib";

export const runtime = "nodejs";

interface Body {
  externalId?: string;
  packageDetails?: PackageDetails;
  pii?: PackagePII;
  salt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { externalId, packageDetails, pii, salt } = body ?? {};

    // Basic input validation
    if (!packageDetails || !pii || !externalId) {
      return NextResponse.json(
        { success: false, error: "`packageDetails`, `pii`, and `externalId` are required." },
        { status: 400 }
      );
    }
    
    if (!salt) {
      return NextResponse.json(
      { success: false, error: "salt is required" },
      { status: 400 }
      );
    }


    const service = await getPackageService();

    const result = await service.createPackage(
      externalId,
      packageDetails,
      pii,
      salt
    );

    return NextResponse.json(
      {
        success: true,
        externalId,
        result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in /api/packages/create:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
