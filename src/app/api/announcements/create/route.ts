import { NextRequest, NextResponse } from "next/server";
import { getFireFly, getPackageService } from "../../packages/service";

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

    // Get package from blockchain
    const packageService = await getPackageService();
    const storeObject = await packageService.readPackageDetailsAndPII(packageId);

    if (!storeObject || !storeObject.packageDetails) {
      return NextResponse.json(
        { success: false, error: "Package not found or missing details" },
        { status: 404 }
      );
    }

    const packageDetails = storeObject.packageDetails;

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
            id: packageId,
            pickupLocation: packageDetails.pickupLocation,
            dropLocation: packageDetails.dropLocation,
            size: packageDetails.size,
            weightKg: packageDetails.weightKg,
            urgency: packageDetails.urgency,
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
