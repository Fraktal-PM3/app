import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import dbConnect from "@/lib/dbService";
import Package from "@/models/package";
import { CreatePackageRequestSchema } from "@/lib/packageSchemas";

export async function GET() {
  await dbConnect();
  const packages = await Package.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(packages);
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    // Validate request body against schema
    const validationResult = CreatePackageRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { name, packageDetails, pii, salt } = validationResult.data;

    // Generate UUID automatically
    const packageId = randomUUID();

    // Create package in database
    const newPackage = await Package.create({
      id: packageId,
      name,
      packageDetails,
      pii,
      salt,
    });

    return NextResponse.json(
      {
        id: newPackage.id,
        name: newPackage.name,
        message: "Package created successfully. Submit to blockchain to finalize.",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating package:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create package" },
      { status: 500 },
    );
  }
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

