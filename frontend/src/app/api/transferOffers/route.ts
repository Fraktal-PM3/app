import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbService";
import TransferOfferModel from "@/models/transferOffer";

/**
 * GET /api/transferOffers
 * Fetch all transfer offers from the database
 * Optional query param: ?announcementMessageId=xxx to filter by announcement
 */
export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const announcementMessageId = searchParams.get("announcementMessageId");

    // Build query filter
    const filter: Record<string, any> = {};
    if (announcementMessageId) {
      filter.announcementMessageId = announcementMessageId;
    }

    // Fetch transfer offers from database
    const transferOffers = await TransferOfferModel.find(filter)
      .populate("packageId")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(transferOffers);
  } catch (error) {
    console.error("[API] Error fetching transfer offers:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch transfer offers",
      },
      { status: 500 }
    );
  }
}
