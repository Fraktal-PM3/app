"use server";

import { getMspIdentity, getPackageService } from "@/app/api/packages/service";
import { TransferOffer } from "@/types/package";
import { randomUUID } from "crypto";

/**
 * Server action to get the current node's MSP identity
 * This is called from client components but executes on the server
 */
export async function getCurrentMspId(): Promise<string | null> {
  try {
    const identity = await getMspIdentity();
    return identity.mspId;
  } catch (error) {
    console.error("Failed to get MSP identity:", error);
    return null;
  }
}

/**
 * Server action to check if current user owns a package
 * @param packageMspId - The MSP ID of the package owner
 * @returns true if current user owns the package
 */
export async function checkPackageOwnership(
  packageMspId: string | undefined,
): Promise<boolean> {
  console.log("Checking package ownership for MSP ID:", packageMspId);
  if (!packageMspId) {
    return false;
  }

  try {
    const identity = await getMspIdentity();
    console.log(
      `Checking ownership: node MSP=${identity.mspId}, package MSP=${packageMspId}`,
    );
    return identity.mspId === packageMspId;
  } catch (error) {
    console.error("Failed to check package ownership:", error);
    return false;
  }
}

/**
 * Propose Transfer Action
 */
export async function proposeTransfer(offer: TransferOffer) {
  console.log("Proposing transfer for offer:", offer);
  const terms = {
    price: offer.price,
    id: randomUUID(),
    salt: crypto.getRandomValues(new Uint8Array(16)).toString(),
  };

  const packageService = await getPackageService();
  await packageService.proposeTransfer(
    offer.externalPackageId,
    offer.toMSP,
    terms,
    new Date(Date.now() + 24 * 7 * 60 * 60 * 1000).toISOString(),
  );
}
