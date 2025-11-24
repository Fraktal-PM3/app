import { NextRequest, NextResponse } from "next/server";
import { getPackageService } from "../service";

export const runtime = "nodejs";

interface Body {
    externalId?: string;
    toMSP?: string;
    termsId?: string;
    price : number;
    expiryISO?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Body;
        const { externalId, toMSP, termsId, expiryISO, price } = body ?? {};
        const terms: { price: number; id: string } = {
            price: body.price,
            id: body.termsId!
        };

        if (!externalId || !toMSP) {
            return NextResponse.json(
            { success: false, error: "`externalId` and `toMSP` are required." },
            { status: 400 }
            );
        }

        if (!terms || !terms.id || typeof terms.price !== 'number') {
            return NextResponse.json(
            { success: false, error: "`terms` with `id` and `price` are required." },
            { status: 400 }
            );
        }

        const service = await getPackageService();

        const result = await service.proposeTransfer(
            externalId,
            toMSP,
            terms,
            expiryISO
        );

        return NextResponse.json(
            {
            success: true,
            externalId,
            toMSP,
            termsId: terms.id,
            result,
            },
            { status: 200 }
        );
        } catch (error: any) {
        console.error("Error in /api/packages/propose:", error);
        return NextResponse.json(
            {
            success: false,
            error: error?.message || "Unexpected server error",
            },
            { status: 500 }
        );
    }
}