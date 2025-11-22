import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPackageService } from "../service";
import type { PackageDetails, PackagePII } from "fraktal-lib";

export const runtime = "nodejs";

interface Body {
  packageId?: string;
  packageDetails?: PackageDetails;
  pii?: PackagePII;
  salt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { packageId, packageDetails, pii, salt } = body ?? {};

    // Basic input validation
    if (!packageDetails || !pii) {
      return NextResponse.json(
        { success: false, error: "`packageDetails` and `pii` are required." },
        { status: 400 }
      );
    }
    
    if (!salt) {
      return NextResponse.json(
      { success: false, error: "salt is required" },
      { status: 400 }
      );
    }

    // FireFly wants a UUID for the external ID
    const externalId = crypto.randomUUID();

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
        packageId: packageId ?? null,
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
