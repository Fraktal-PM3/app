import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPackageService } from "../service";
import type { PackageDetails, PackagePII } from "fraktal-lib";

export const runtime = "nodejs";

type Body = {
  packageId?: string;
  packageDetails: PackageDetails;
  pii: PackagePII;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { packageId, packageDetails, pii } = body;

    if (!packageDetails || !pii) {
      return NextResponse.json(
        { success: false, error: "packageDetails and pii are required" },
        { status: 400 }
      );
    }

    //firefly want UUID
    const externalId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");

    const service = await getPackageService();

  
    const result = await service.createPackage(
      externalId,
      packageDetails,
      pii,
      salt
    );

    return NextResponse.json({
      success: true,
      // blockchain id
      externalId,
      packageId: packageId ?? null,
      result,
    });
  } catch (error: any) {
    console.error("Error in /api/packages/create:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
