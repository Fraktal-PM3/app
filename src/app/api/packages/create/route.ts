import { CreatePackageRequestSchema } from "@/lib/packageSchemas";
import { NextRequest, NextResponse } from "next/server";
import { getMspIdentity, getPackageService } from "../service";
import { randomUUID } from "crypto";
import { Urgency, Status } from "fraktal-lib";
import convexServerClient from "@/lib/convexServerClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = CreatePackageRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error,
        },
        { status: 400 },
      );
    }

    const { name, packageDetails, pii, salt, recipientOrgMSP } =
      validationResult.data;

    if (!packageDetails || !pii || !salt) {
      return NextResponse.json(
        { success: false, error: "Package details, PII, and salt are required" },
        { status: 400 },
      );
    }

    // Generate UUID automatically
    const packageId = randomUUID();
    const mspIdentity = await getMspIdentity();

    // Convert urgency string to Urgency enum
    const urgencyMap: Record<string, Urgency> = {
      "high": Urgency.HIGH,
      "medium": Urgency.MEDIUM,
      "low": Urgency.LOW,
      "none": Urgency.NONE,
    };

    // Create package in Convex immediately (don't wait for blockchain event)
    await convexServerClient.createPackage({
      externalId: packageId,
      name: name,
      recipientOrgMSP: recipientOrgMSP,
      ownerOrgMSP: mspIdentity.mspId,
      senderOrgMSP: mspIdentity.mspId,
      status: Status.PENDING,
      mspId: mspIdentity.mspId,
      packageDetails: packageDetails, // Include all form details
      pii: pii, // Include PII data
      salt: salt, // Include salt for verification
    });

    console.log(`[API] Package created in Convex: ${packageId}`);

    // Submit to blockchain - EventListener will update status when blockchain confirms
    const service = await getPackageService();
    const result = await service.createPackage(
      packageId,
      recipientOrgMSP,
      {
        ...packageDetails,
        urgency: urgencyMap[packageDetails.urgency] || Urgency.NONE,
      },
      pii,
      salt,
      false,
    );

    console.log(`[API] Package submitted to blockchain: ${packageId}`);

    return NextResponse.json({
      success: true,
      id: packageId,
      name: name,
      result,
    });
  } catch (error: any) {
    console.error("Error in /api/packages/create:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
