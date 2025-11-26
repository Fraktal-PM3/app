import { NextRequest, NextResponse } from "next/server";
import { getFireFly } from "../../service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { pkg } = await params;

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
            id: "string",
            pickupLocation: null,
            dropLocation: null,
            size: null,
            weightKg: 50.5,
            urgency: null,
          },
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Broadcast successful",
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
