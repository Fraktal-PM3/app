import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbService";
import Package from "@/models/package";

export async function GET() {
  await dbConnect();
  const packages = await Package.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(packages);
}

// Update active status
export async function PATCH(req: Request) {
  await dbConnect();
  const { id, active, termsId } = await req.json();

  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 },
    );
  }

  if (active === undefined && termsId === undefined) {
    return NextResponse.json(
      { error: "active or termsId field is required" },
      { status: 400 },
    );
  }

  const updateFields: any = { updatedAt: new Date() };

  if (active !== undefined) {
    updateFields.active = active;
  }

  if (termsId !== undefined) {
    updateFields.termsId = termsId;
  }

  const updatedPkg = await Package.findOneAndUpdate(
    { id },
    updateFields,
    { new: true },
  );

  if (!updatedPkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  console.log("Updated package:", updatedPkg.id);
  return NextResponse.json(updatedPkg, { status: 200 });
}

