"use server";

import { getMspIdentity, getPackageService } from "@/app/api/packages/service";
import dbConnect from "@/lib/dbService";
import PackageModel from "@/models/package";
import { TransferOffer } from "@/types/package";
import { randomBytes, randomUUID } from "crypto";
import { Status, TransferTerms } from "fraktal-lib";

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
 * Server action to check if current user is the sender (original creator) of a package
 * @param senderOrgMSP - The MSP ID of the package sender/creator
 * @returns true if current user is the sender
 */
export async function checkIsSender(
  senderOrgMSP: string | undefined,
): Promise<boolean> {
  if (!senderOrgMSP) {
    return false;
  }

  try {
    const identity = await getMspIdentity();
    return identity.mspId === senderOrgMSP;
  } catch (error) {
    console.error("Failed to check sender:", error);
    return false;
  }
}

/**
 * Propose Transfer Action
 */
export async function proposeTransfer(offer: TransferOffer) {
  console.log("Proposing transfer for offer:", offer);
  const termsId = randomUUID();
  const transferTerms: TransferTerms = {
    externalPackageId: offer.externalPackageId,
    fromMSP: offer.fromMSP,
    toMSP: offer.toMSP,
    price: offer.price,
    expiryISO: offer.expiryISO,
  };

  const packageService = await getPackageService();
  await packageService.proposeTransfer(
    offer.externalPackageId,
    termsId,
    transferTerms,
  );

  await packageService.updateStatusAfterPropose(
    offer.externalPackageId,
    termsId,
    transferTerms.toMSP,
    transferTerms.expiryISO,
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
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!externalId) {
      return {
        success: false,
        error: "Package ID and Terms ID are required",
      };
    }

    console.log(
      `[confirmPackageReceipt] Confirming receipt for package ${externalId}`,
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
  const transferTerms = await packageService.readPrivateTransferTerms(
    externalId,
    transferId,
  );

  const res = await packageService.executeTransfer(
    externalId,
    transferId,
    storeObject as any,
    transferTerms as TransferTerms,
  );
  console.log("ExecuteTransfer - result:", res);
}

/**
 * Server action to mark package as in transit
 * Called when transporter starts moving the package to destination
 * @param externalId - The blockchain package ID
 */
export async function markPackageInTransit(externalId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!externalId) {
      return {
        success: false,
        error: "Package ID is required",
      };
    }
    console.log(
      `[markPackageInTransit] Marking package ${externalId} as in transit`,
    );

    const packageService = await getPackageService();

    await packageService.updatePackageStatus(externalId, Status.IN_TRANSIT);

    return { success: true };
  } catch (error) {
    console.error("[markPackageInTransit] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark package in transit",
    };
  }
}

/**
 * Server action to initiate delivery package to recipient
 * @param externalId - The blockchain package ID
 * @returns Success status
 */
export async function initiateDelivery(externalId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!externalId) {
      return {
        success: false,
        error: "Package ID is required",
      };
    }

    console.log(
      `[initiateDelivery] Initiating delivery for package ${externalId}`,
    );

    const packageService = await getPackageService();
    const blockchainPackage =
      await packageService.readBlockchainPackage(externalId);

    if (!blockchainPackage) {
      return {
        success: false,
        error: "Package not found",
      };
    }

    const identity = await getMspIdentity();
    const termsId = randomUUID();
    const transferTerms: TransferTerms = {
      externalPackageId: externalId,
      fromMSP: identity.mspId,
      toMSP: blockchainPackage.recipientOrgMSP,
      price: 0,
      expiryISO: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await packageService.proposeTransfer(externalId, termsId, transferTerms);
    await packageService.updateStatusAfterPropose(
      externalId,
      termsId,
      transferTerms.toMSP,
      transferTerms.expiryISO,
    );

    return { success: true };
  } catch (error) {
    console.error("[initiateDelivery] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to initiate delivery",
    };
  }
}
