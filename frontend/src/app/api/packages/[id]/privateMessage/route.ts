import { NextRequest, NextResponse } from "next/server";
import { getPackageService, getFireFly } from "../../service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { price, author } = await request.json();

    if (!price || typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid price is required" },
        { status: 400 }
      );
    }

    if (!author) {
      return NextResponse.json(
        { success: false, error: "Author is required" },
        { status: 400 }
      );
    }

    const service = await getPackageService();

    // Get the package to verify it exists
    const pkg = await service.readBlockchainPackage(id);

    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Package not found" },
        { status: 404 }
      );
    }

    // Send a private message with the specified price
    const firefly = await getFireFly();
    await firefly.sendPrivateMessage({
      header: {},
      group: {
        members: [{ identity: author }],
      },
      data: [
        {
          value: {
            PID: id,
            price: price,
          },
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Transfer proposed successfully",
      packageId: id,
      price,
    });
  } catch (error) {
    console.error("Error proposing transfer:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to propose transfer",
      },
      { status: 500 }
    );
  }
}
