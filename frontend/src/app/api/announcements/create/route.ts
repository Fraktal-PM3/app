import dbConnect from "@/lib/dbService";
import PackageModel from "@/models/package";
import { NextRequest, NextResponse } from "next/server";
import { getFireFly } from "../../packages/service";

type Body = {
  packageId: string;
  price: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { packageId, price } = body;

    if (!packageId) {
      return NextResponse.json(
        { success: false, error: "packageId is required" },
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid price is required" },
        { status: 400 }
      );
    }

    // Get package from MongoDB
    await dbConnect();
    const pkg = await PackageModel.findOne({ id: packageId });

    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Package not found" },
        { status: 404 }
      );
    }

    if (!pkg.packageDetails) {
      return NextResponse.json(
        { success: false, error: "Package details are required for announcement" },
        { status: 400 }
      );
    }

    // Send a broadcast with PACKAGE_ANNOUNCE tag
    const firefly = await getFireFly();
    const broadcast = await firefly.sendBroadcast({
      header: {
        tag: "PACKAGE_ANNOUNCE",
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
            price: price,
          },
        },
      ],
    });

    console.log("Package announcement broadcast:", broadcast);

    return NextResponse.json({
      success: true,
      message: "Package announcement broadcast successful",
      broadcast,
    });
  } catch (error) {
    console.error("Error broadcasting package announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to broadcast announcement",
      },
      { status: 500 }
    );
  }
}
