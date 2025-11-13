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
    const { packageID } = await req.json();
    console.log("Creating/updating package with id:", packageID);

    if (!packageID) {
        return NextResponse.json({ error: "packageID is required" }, { status: 400 });
    }

    const existingPkg = await Package.findOne({ packageID });
    
    if (existingPkg) {
        console.log("Updating existing package:", existingPkg._id);
        await existingPkg.save();
        return NextResponse.json(existingPkg, { status: 200 });
    }

    const pkg = await Package.create({ packageID });
    console.log("Created new package:", pkg._id);
    return NextResponse.json(pkg, { status: 201 });
}

export async function PATCH(req: Request) {
    await dbConnect();
    const { packageID, active } = await req.json();

    if (!packageID) {
        return NextResponse.json({ error: "packageID is required" }, { status: 400 });
    }

    const updatedPkg = await Package.findOneAndUpdate(
        { packageID },
        { 
            active: active ?? true,
            updatedAt: new Date()
        },
        { new: true }
    );

    if (!updatedPkg) {
        return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(updatedPkg, { status: 200 });
}

