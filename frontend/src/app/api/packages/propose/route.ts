import { NextRequest, NextResponse } from "next/server";
import { getPackageService, getMspIdentity } from "../service";

export const runtime = "nodejs";

interface Body {
    externalId?: string;
    toMSP?: string;
    termsId?: string;
    price: number;
    expiryISO?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Body;
        const { externalId, toMSP, termsId, expiryISO, price } = body ?? {};

        if (!externalId || !toMSP || !termsId) {
            return NextResponse.json(
                { success: false, error: "`externalId`, `toMSP`, and `termsId` are required." },
                { status: 400 }
            );
        }

        if (typeof price !== 'number' || price < 0) {
            return NextResponse.json(
                { success: false, error: "`price` must be a non-negative number." },
                { status: 400 }
            );
        }

        const service = await getPackageService();
        const { mspId: fromMSP } = await getMspIdentity();

        const transferTerms = {
            externalPackageId: externalId,
            fromMSP,
            toMSP,
            createdISO: new Date().toISOString(),
            expiryISO: expiryISO || null,
            price,
        };

        const proposeResult = await service.proposeTransfer(
            externalId,
            termsId,
            transferTerms
        );

        const statusResult = await service.updateStatusAfterPropose(
            externalId,
            termsId,
            toMSP
        );

        return NextResponse.json(
            {
                success: true,
                externalId,
                toMSP,
                termsId,
                proposeResult,
                statusResult,
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