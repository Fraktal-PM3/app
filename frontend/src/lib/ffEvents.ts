import { initFirefly } from "./ffSetup"
import { PackageService } from "fraktal-lib"

export interface PackageEventData {
  output?: {
    packageType?: string;
    pickupLocation?: {
      name: string;
      address: string;
      lat: number;
      lng: number;
    };
    dropoffLocation?: {
      name: string;
      address: string;
      lat: number;
      lng: number;
    };
    pickupTime?: string;
    deliveryDeadline?: string;
    urgency?: string;
    reward?: number;
    distance?: number;
    weight?: number;
    size?: string;
    customerRating?: number;
  };
  txid?: string;
  blockchainId?: string;
  timestamp?: string;
}

export type PackageEventCallback = (packageData: PackageEventData) => void;

/**
 * Sets up an event listener for PackageCreated events from FireFly
 * @param onPackageCreated - Callback function to handle new package events
 * @param packageService - Optional PackageService instance (will be initialized if not provided)
 * @returns Object containing success status and the packageService instance
 */
export async function setupPackageEventListener(
  onPackageCreated: PackageEventCallback,
  packageService?: InstanceType<typeof PackageService>
) {
  try {
    // Use provided packageService or initialize a new one
    const svc = packageService || (await initFirefly()).packageService;
    
    if (!svc) {
      throw new Error('Failed to initialize PackageService');
    }
    
    console.log('Registering PackageCreated event listener...');
    
    // Set up event listener for new packages
    await svc.onEvent("CreatePackage", (e: PackageEventData) => {
      console.log("PackageCreated event received:", {
        txid: e.txid,
        timestamp: e.timestamp,
        packageType: e.output?.packageType
      });
      
      try {
        onPackageCreated(e);
      } catch (callbackError) {
        console.error('Error in PackageCreated callback:', callbackError);
      }
    });
    
    console.log('PackageCreated event listener registered successfully');
    
    return { success: true, packageService: svc };
  } catch (error) {
    console.error('Failed to setup package event listener:', error);
    throw error;
  }
}

/**
 * Sets up multiple event listeners for package-related events
 * @param callbacks - Object containing callback functions for different event types
 * @param packageService - Optional PackageService instance
 */
export async function setupAllPackageEventListeners(
  callbacks: {
    onPackageCreated?: PackageEventCallback;
    onPackageUpdated?: PackageEventCallback;
    onPackageDelivered?: PackageEventCallback;
  },
  packageService?: InstanceType<typeof PackageService>
) {
  try {
    const svc = packageService || (await initFirefly()).packageService;
    
    if (!svc) {
      throw new Error('Failed to initialize PackageService');
    }

    const promises: Promise<void>[] = [];

    if (callbacks.onPackageCreated) {
      promises.push(
        svc.onEvent("PackageCreated", callbacks.onPackageCreated)
      );
    }

    if (callbacks.onPackageUpdated) {
      promises.push(
        svc.onEvent("PackageUpdated", callbacks.onPackageUpdated)
      );
    }

    if (callbacks.onPackageDelivered) {
      promises.push(
        svc.onEvent("PackageDelivered", callbacks.onPackageDelivered)
      );
    }

    await Promise.all(promises);
    
    console.log('All package event listeners set up successfully');
    
    return { success: true, packageService: svc };
  } catch (error) {
    console.error('Failed to setup all package event listeners:', error);
    throw error;
  }
}


