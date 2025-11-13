import FireFly from "@hyperledger/firefly-sdk";
import { PackageService } from "fraktal-lib";

let packageService: PackageService | null = null;

export async function getPackageService(): Promise<PackageService> {
  if (!packageService) {
    const firefly = new FireFly({
      host: process.env.FIREFLY_HOST || "http://localhost:8000",
      namespace: process.env.FIREFLY_NAMESPACE || "default",
    });

    packageService = new PackageService(firefly);
    await packageService.initalize();

    // Register event handlers that will broadcast to connected clients
    console.log("PackageService initialized and ready");
  }

  return packageService;
}
