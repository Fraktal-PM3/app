import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbService";
import TransferModel from "@/models/transfer";

export async function GET() {
  await dbConnect();
  const transfers = await TransferModel.find()
    .populate("packageId")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(transfers);
}
