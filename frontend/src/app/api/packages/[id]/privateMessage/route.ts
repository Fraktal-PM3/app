import dbConnect from "@/lib/dbService";
import PackageAnnouncementModel from "@/models/packageAnnouncement";
import { TransferOffer, TransferOfferSchema } from "@/types/package";
import { NextRequest, NextResponse } from "next/server";
import { getFireFly, getPackageService } from "../../service";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: TransferOffer = await request.json();

    try {
      TransferOfferSchema.parse(body);
    } catch (validationError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
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

    // Look up the package announcement to get the announcer's identity
    await dbConnect();
    const announcement = await PackageAnnouncementModel.findOne({
      packageExternalId: id,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!announcement || !announcement.announcerNode) {
      return NextResponse.json(
        {
          success: false,
          error: "Package announcement not found or announcer identity unavailable",
        },
        { status: 404 }
      );
    }

    // Send a private message with the specified price to the announcer
    const firefly = await getFireFly();
    const msg = await firefly.sendPrivateMessage({
      header: {
        tag: "TRANSFER_OFFER",
      },
      group: {
        members: [{ identity: announcement.announcerNode }],
      },
      data: [
        {
          datatype: {
            name: "TransferOffer",
            version: "1.0.0",
          },
          value: body
        },
      ],
    });


    return NextResponse.json({
      success: true,
      message: "Transfer proposed successfully",
      txid: msg.txid,
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
