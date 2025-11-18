import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";
import crypto from "crypto";
import { PackageDetails, PackagePII, Urgency } from "fraktal-lib";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageDetails, pii } = body;

    const service = await getPackageService();

    const packageId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");

    const result = await service.createPackage(
      packageId,
      packageDetails as PackageDetails,
      pii as PackagePII,
      salt
    );

    return NextResponse.json({
      success: true,
      packageId,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
