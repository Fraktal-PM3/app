import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbService";
import Package from "@/models/package";

export async function GET() {
  await dbConnect();
  const packages = await Package.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(packages);
}

export async function POST(req: Request) {
    console.log("POST /api/packages called");
    await dbConnect();
    const { id } = await req.json();
    console.log("Creating/updating package with id:", id);

    if (!id) {
        return NextResponse.json({ error: "Id is required" }, { status: 400 });
    }

    const existingPkg = await Package.findOne({ id });
    
    if (existingPkg) {
        console.log("Updating existing package:", existingPkg._id);
        await existingPkg.save();
        return NextResponse.json(existingPkg, { status: 200 });
    }

    const pkg = await Package.create({ id });
    console.log("Created new package:", pkg._id);
    return NextResponse.json(pkg, { status: 201 });
}
