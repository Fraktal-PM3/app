import dbConnect from "@/lib/dbService";
import PackageAnnouncementModel from "@/models/packageAnnouncement";
import { NextResponse } from "next/server";

/**
 * GET /api/announcements
 * Retrieve all package announcements, optionally filtered by active status
 */
export async function GET(request: Request) {
  try {
    await dbConnect();


    const announcements = await PackageAnnouncementModel.find()
      .populate("packageId")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("Error fetching package announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch package announcements" },
      { status: 500 }
    );
  }
}
