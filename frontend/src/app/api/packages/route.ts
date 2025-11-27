import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbService";
import Package, { Urgency } from "@/models/package";

export async function GET() {
    await dbConnect();
    const packages = await Package.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(packages);
}

export async function POST(req: Request) {
        console.log("POST /api/packages called");
        await dbConnect();
        const body = await req.json();
        console.log("Creating package with data:", body);

        const { packageID, externalId, termsId, active, fromAddress, packageDetails, price, salt, pii } = body || {};
        if (!packageID) {
                return NextResponse.json({ error: "packageID is required" }, { status: 400 });
        }
        
        // Validate packageDetails if provided
        if (packageDetails) {
                const { pickupLocation, dropLocation, size, weightKg, urgency } = packageDetails;
                
                if (!pickupLocation?.address || !dropLocation?.address) {
                        return NextResponse.json({ error: "Pickup and drop locations are required" }, { status: 400 });
                }
                
                if (!size?.width || !size?.height || !size?.depth) {
                        return NextResponse.json({ error: "Size dimensions (width, height, depth) are required" }, { status: 400 });
                }
                
                if (!weightKg || weightKg <= 0) {
                        return NextResponse.json({ error: "Valid weight is required" }, { status: 400 });
                }
                
                if (!urgency || !Object.values(Urgency).includes(urgency)) {
                        return NextResponse.json({ error: "Valid urgency level is required" }, { status: 400 });
                }
        }

        const existingPkg = await Package.findOne({ packageID });
        
        if (existingPkg) {
                console.log("Updating existing package:", existingPkg.packageID);
                
                // Update packageDetails if provided
                if (packageDetails) {
                        existingPkg.packageDetails = packageDetails;
                }
                
                // Update pii if provided
                if (pii) {
                        existingPkg.pii = pii;
                }
                
                await existingPkg.save();
                return NextResponse.json(existingPkg, { status: 200 });
        }


        // Create new package with default price of 0 and salt
        const pkg = await Package.create({ 
                packageID,
                externalId: body.externalId || `EXT-${packageID}`,
                termsId: body.termsId || "default-terms",
                active: body.active ?? "false",
                fromAddress: body.fromAddress || packageDetails?.pickupLocation?.address || "N/A",
                packageDetails: packageDetails || undefined,
                price: body.price ?? 0,
                salt: salt || undefined,
                pii: pii || undefined
        });
        console.log("Created new package:", pkg.packageID);
        return NextResponse.json(pkg, { status: 201 });
}

// Update active status
export async function PATCH(req: Request) {
        await dbConnect();
        const { packageID, active, termsId } = await req.json();

        if (!packageID) {
                return NextResponse.json({ error: "packageID is required" }, { status: 400 });
        }

        if (active === undefined && termsId === undefined) {
                return NextResponse.json({ error: "active or termsId field is required" }, { status: 400 });
        }

        const updateFields: any = { updatedAt: new Date() };
        
        if (active !== undefined) {
                updateFields.active = active;
        }
        
        if (termsId !== undefined) {
                updateFields.termsId = termsId;
        }

        const updatedPkg = await Package.findOneAndUpdate(
                { packageID },
                updateFields,
                { new: true }
        );

        if (!updatedPkg) {
                return NextResponse.json({ error: "Package not found" }, { status: 404 });
        }

        console.log("Updated package:", updatedPkg.packageID);
        return NextResponse.json(updatedPkg, { status: 200 });
}

// Update price
export async function PUT(req: Request) {
        await dbConnect();
        const { packageID, price } = await req.json();

        if (!packageID) {
                return NextResponse.json({ error: "packageID is required" }, { status: 400 });
        }

        if (price === undefined || price < 0) {
                return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
        }

        const updatedPkg = await Package.findOneAndUpdate(
                { packageID },
                { 
                        price,
                        updatedAt: new Date()
                },
                { new: true }
        );

        if (!updatedPkg) {
                return NextResponse.json({ error: "Package not found" }, { status: 404 });
        }

        console.log("Updated price for package:", updatedPkg.packageID);
        return NextResponse.json(updatedPkg, { status: 200 });
}