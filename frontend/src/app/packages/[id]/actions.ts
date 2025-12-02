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
  packageMspId: string | undefined
): Promise<boolean> {
  console.log("Checking package ownership for MSP ID:", packageMspId);
  if (!packageMspId) {
    return false;
  }

  try {
    const identity = await getMspIdentity();
    console.log(
      `Checking ownership: node MSP=${identity.mspId}, package MSP=${packageMspId}`
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
    new Date(Date.now() + 24 * 7 * 60 * 60 * 1000).toISOString()
  );
}

/**
 * Server action to confirm package receipt (TransferPM3)
 * This is called when the receiver finally receives the package
 * @param externalId - The blockchain package ID
 * @param termsId - The transfer terms ID
 * @returns Success status
 */
export async function confirmPackageReceipt(
  externalId: string,
  termsId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!externalId || !termsId) {
      return {
        success: false,
        error: "Package ID and Terms ID are required",
      };
    }

    console.log(
      `[confirmPackageReceipt] Confirming receipt for package ${externalId}, terms ${termsId}`
    );
    const service = await getPackageService();
    const identity = await getMspIdentity();
    const blockchainPackage = await service.readBlockchainPackage(externalId);

    if (blockchainPackage.ownerOrgMSP !== identity.mspId) {
      return {
        success: false,
        error: "Current user is not the owner of the package",
      };
    }
    if (blockchainPackage.recipientOrgMSP !== identity.mspId) {
      return {
        success: false,
        error: "Current user is not the recipient of the package",
      };
    }

    await service.transferToPM3(externalId);

    return { success: true };
  } catch (error) {
    console.error("[confirmPackageReceipt] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to confirm receipt",
    };
  }
}

/**
 * Server action to execute transfer after acceptance
 * @param transferId - The transfer terms ID
 * @param externalId - The blockchain package ID
 */
export async function executeTransfer(transferId: string, externalId: string) {
  const packageService = await getPackageService();
  const storeObject = await packageService.readPackageDetailsAndPII(externalId);

  const res = await packageService.executeTransfer(
    externalId,
    transferId,
    storeObject as any
  );
  console.log("ExecuteTransfer - result:", res);
}
