import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbService";
import Package from "@/models/package";
import { getFireFly } from "../../service";

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

    if (!pkg.packageDetails) {
      return NextResponse.json(
        { success: false, error: "Package is missing packageDetails" },
        { status: 400 }
      );
    }

    // Send announcement broadcast with the package details
    const firefly = await getFireFly();
    const broadcast = await firefly.sendBroadcast({
      header: {
        tag: "NewPackage",
      },
      data: [
        {
          datatype: {
            name: "PackageDetails",
            version: "1.0.0",
          },
          value: {
            id: pkg.id,
            pickupLocation: pkg.packageDetails.pickupLocation,
            dropLocation: pkg.packageDetails.dropLocation,
            size: pkg.packageDetails.size,
            weightKg: pkg.packageDetails.weightKg,
            urgency: pkg.packageDetails.urgency,
          },
        },
      ],
    });

    console.log("Package announcement broadcast:", broadcast);

    return NextResponse.json({
      success: true,
      message: "Package announcement sent successfully",
      id: pkg.id,
    });
  } catch (error) {
    console.error("Error sending package announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to send announcement",
      },
      { status: 500 }
    );
  }
}
