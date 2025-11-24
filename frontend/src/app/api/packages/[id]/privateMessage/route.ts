import { NextRequest, NextResponse } from "next/server";
import { getPackageService, getFireFly } from "../../service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { price } = await request.json();

    if (!price || typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid price is required" },
        { status: 400 }
      );
    }

    const service = await getPackageService();

    // Get the package to verify it exists
    const pkg = await service.readBlockchainPackage(id);

    console.log("pkg:", pkg)
    
    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Package not found" },
        { status: 404 }
      );
    }
    
    // Send a private message with the specified price
    const firefly = await getFireFly();
    const msg = await firefly.sendPrivateMessage({
        header: {
            
        },
        group: {
            //TODO: Get target from pkg.ownerOrgMSP
            members: [{ identity: "did:firefly:org/org_c0fd19" }],
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

    console.log("msg:", msg)
    
    console.log(`Transfer proposed for package ${id} at price ${price}`);

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
        error: error instanceof Error ? error.message : "Failed to propose transfer",
      },
      { status: 500 }
    );
  }
}
