import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbService";
import Package from "@/models/package";
import { getPackageService } from "../service";

export const runtime = "nodejs";

type Body = {
  id: string; // Package ID from DB
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = (await request.json()) as Body;
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    // Fetch package from database
    const pkg = await Package.findOne({ id });

    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Package not found" },
        { status: 404 }
      );
    }

    if (!pkg.packageDetails || !pkg.pii || !pkg.salt) {
      return NextResponse.json(
        { success: false, error: "Package is missing required fields" },
        { status: 400 }
      );
    }

    // Submit to blockchain
    const service = await getPackageService();
    const result = await service.createPackage(
      pkg.id,
      pkg.packageDetails,
      pkg.pii,
      pkg.salt,
    );

    return NextResponse.json({
      success: true,
      id: pkg.id,
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
