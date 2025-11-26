import { NextRequest, NextResponse } from "next/server";
import { getFireFly } from "../../service";
import type { PackageDetails, PackagePII } from "fraktal-lib";

type Body = {
  externalId?: string;
  packageDetails: PackageDetails;
  pii: PackagePII;
  salt: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    const body = (await request.json()) as Body;
    const { externalId, packageDetails, pii, salt } = body;

    if (!packageDetails || !pii) {
      return NextResponse.json(
      { success: false, error: "packageDetails and pii are required" },
      { status: 400 }
      );
    }

    if (!externalId) {
      return NextResponse.json(
      { success: false, error: "externalId is required" },
      { status: 400 }
      );
    }

    // Send a broadcast with the specified package details
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
            id: externalId,
            pickupLocation: packageDetails.pickupLocation,
            dropLocation: packageDetails.dropLocation,
            size: packageDetails.size,
            weightKg: packageDetails.weightKg,
            urgency: packageDetails.urgency,
          },
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Broadcast successful",
      broadcast,
    });
  } catch (error) {
    console.error("Error sending broadcast:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to broadcast",
      },
      { status: 500 }
    );
  }
}
