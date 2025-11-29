"use server";

import { getMspIdentity } from "@/app/api/packages/service";

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
    console.log(`Checking ownership: node MSP=${identity.mspId}, package MSP=${packageMspId}`);
    return identity.mspId === packageMspId;
  } catch (error) {
    console.error("Failed to check package ownership:", error);
    return false;
  }
}
