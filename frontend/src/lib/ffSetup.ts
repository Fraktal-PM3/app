import FireFly, { FireFlyOptionsInput } from "@hyperledger/firefly-sdk"
import { PackageService } from "fraktal-lib"

let ffClient: FireFly | null = null;
let packageService: InstanceType<typeof PackageService> | null = null;
let initializing: Promise<void> | null = null;

export async function initFirefly(options?: Partial<FireFlyOptionsInput>) {
  if (ffClient && packageService) return { ffClient, packageService };

  if (initializing) {
    await initializing;
    return { ffClient: ffClient!, packageService: packageService! };
  }

  initializing = (async () => {
    const FFOptions: FireFlyOptionsInput = {
      host: "http://localhost:8000",
      namespace: "default",
      ...options
    };
    ffClient = new FireFly(FFOptions);
    packageService = new PackageService(ffClient);
    await packageService.initalize(); 
  })();

  await initializing;
  initializing = null;

  return { ffClient: ffClient!, packageService: packageService! };
}