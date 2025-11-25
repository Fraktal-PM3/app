import FireFly from "@hyperledger/firefly-sdk";
import { PackageService } from "fraktal-lib";

let packageService: PackageService | null = null;
let fireflyInstance: FireFly | null = null;

export async function getPackageService(): Promise<PackageService> {
  if (!packageService) {
    // Use port 8000 for transporters, 8001 for others
    const defaultHost = process.env.NEXT_PUBLIC_TRANSPORTER === "TRUE" 
      ? "http://localhost:8000" 
      : "http://localhost:8001";
    
    fireflyInstance = new FireFly({
      host: process.env.FIREFLY_HOST || defaultHost,
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
