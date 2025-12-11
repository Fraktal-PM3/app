import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";

export const runtime = "nodejs";

interface Body {
  externalId?: string;
  termsId?: string;
  transferTerms?: {
    externalPackageId: string;
    fromMSP: string;
    toMSP: string;
    expiryISO: string;
    price: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { externalId, termsId, transferTerms } = body ?? {};

    if (!externalId || !termsId || !transferTerms) {
      return NextResponse.json(
        {
          success: false,
          error: "`externalId`, `termsId`, and `transferTerms` are required.",
        },
        { status: 400 },
      );
    }

    if (
      !transferTerms.externalPackageId ||
      !transferTerms.fromMSP ||
      !transferTerms.toMSP ||
      !transferTerms.expiryISO ||
      typeof transferTerms.price !== "number"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid `transferTerms` structure." },
        { status: 400 },
      );
    }

    const service = await getPackageService();

    const acceptResult = await service.acceptTransfer(
      externalId,
      termsId,
      transferTerms,
    );

    const statusResult = await service.updateStatusAfterAccept(
      externalId,
      termsId,
    );

    return NextResponse.json(
      {
        success: true,
        externalId,
        termsId,
        acceptResult,
        statusResult,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error in /api/packages/accept:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unexpected server error",
      },
      { status: 500 },
    );
  }
}

