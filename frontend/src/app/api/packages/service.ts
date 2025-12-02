import FireFly from "@hyperledger/firefly-sdk";
import { PackageService } from "fraktal-lib";

let packageService: PackageService | null = null;
let fireflyInstance: FireFly | null = null;
let cachedMspIdentity: { mspId: string; nodeOrg: string } | null = null;

export async function getPackageService(): Promise<PackageService> {
  if (!packageService) {
    // Use port 8000 for transporters, 8001 for others
    const defaultHost =
      process.env.NEXT_PUBLIC_TRANSPORTER === "TRUE"
        ? "http://localhost:8000"
        : "http://localhost:8001";
    const fireflyHost = process.env.FIREFLY_HOST;
    if (!fireflyHost) {
      throw new Error("FIREFLY_HOST environment variable is required");
    }

    fireflyInstance = new FireFly({
      host: fireflyHost,
      namespace: process.env.FIREFLY_NAMESPACE || "default",
    });

    packageService = new PackageService(fireflyInstance);
    await packageService.initalize();

    // Register event handlers that will broadcast to connected clients
    console.log("PackageService initialized and ready");
  }

  return packageService;
}

export async function getFireFly(): Promise<FireFly> {
  // Ensure the package service is initialized first
  await getPackageService();

  if (!fireflyInstance) {
    throw new Error("FireFly instance not initialized");
  }

  return fireflyInstance;
}

/**
 * Get the MSP identity of the current Firefly node
 * Uses the same approach as the event listener service
 */
export async function getMspIdentity(): Promise<{
  mspId: string;
  nodeOrg: string;
}> {
  // Return cached value if available
  if (cachedMspIdentity) {
    return cachedMspIdentity;
  }

  // Ensure Firefly is initialized
  const firefly = await getFireFly();

  try {
    // Get status to extract verifier MSP
    const status = await firefly.getStatus();

    if (
      !status ||
      !status.org.verifiers ||
      status.org.verifiers.length === 0 ||
      !status.org.name
    ) {
      throw new Error("No verifiers found for this Firefly node");
    }

    // Get the first verifier (our node)
    const ourVerifier = status.org.verifiers[0];
    const ourIdentity = status.org.name;

    // Extract MSP from the verifier's value (signing key)
    // Format: "MSP_ID:certificate..."
    if (!ourVerifier.value) {
      throw new Error("Could not extract MSP from verifier");
    }

    const mspId = ourVerifier.value.split(":")[0];

    // Cache the result
    cachedMspIdentity = {
      mspId,
      nodeOrg: ourIdentity,
    };

    console.log(
      `[getMspIdentity] Detected node MSP: ${mspId}, Org: ${ourIdentity}`
    );

    return cachedMspIdentity;
  } catch (error) {
    console.error("[getMspIdentity] Failed to fetch node identity:", error);
    throw new Error(
      `Failed to get MSP identity: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
