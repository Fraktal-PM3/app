import { CreatePackageRequestSchema } from "@/lib/packageSchemas";
import { NextRequest, NextResponse } from "next/server";
import { getMspIdentity, getPackageService } from "../service";
import dbConnect from "@/lib/dbService";
import Package from "@/models/package";
import { randomUUID } from "crypto";

type Body = {
  id: string; // Package ID from DB
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json()
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const validationResult = CreatePackageRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error,
        },
        { status: 400 },
      );
    }

    const { name, packageDetails, pii, salt } = validationResult.data;

    // Generate UUID automatically
    const packageId = randomUUID();
    const mspIdentity = await getMspIdentity();

    const newPackage = await Package.create({
      id: packageId,
      name,
      packageDetails,
      pii,
      salt,
      mspId: mspIdentity.mspId,
    });

    if (!newPackage.packageDetails || !newPackage.pii || !newPackage.salt) {
      return NextResponse.json(
        { success: false, error: "Package is missing required fields" },
        { status: 400 }
      );
    }

    // Submit to blockchain
    const service = await getPackageService();
    const result = await service.createPackage(
      newPackage.id,
      newPackage.packageDetails,
      newPackage.pii,
      newPackage.salt,
      false
    );

    return NextResponse.json({
      success: true,
      id: newPackage.id,
      name: newPackage.name,
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
