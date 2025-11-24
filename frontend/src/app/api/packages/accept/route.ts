import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";

export const runtime = "nodejs";

interface Body {
  externalId?: string;
  termsId?: string;
  price : number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const { externalId, termsId, price } = body ?? {};
    const privateTransferTerms = {
      price: body.price
    };

    if (!externalId || !termsId) {
      return NextResponse.json(
        { success: false, error: "`externalId` and `termsId` are required." },
        { status: 400 }
      );
    }
    
    if (!privateTransferTerms || typeof privateTransferTerms.price !== 'number') {
      return NextResponse.json(
        { success: false, error: "`privateTransferTerms` is required." },
        { status: 400 }
      );
    }

    const service = await getPackageService();

    const result = await service.acceptTransfer(
      externalId,
      termsId,
      privateTransferTerms
    );

    return NextResponse.json(
      {
        success: true,
        externalId,
        termsId,
        result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in /api/packages/accept:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unexpected server error",
      },
      { status: 500 }
    );
  }
}