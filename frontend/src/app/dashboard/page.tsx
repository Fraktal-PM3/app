"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePackages } from "./components/PackageContext";
import { PackageDetailsFromEvent } from "@/types/delivery";

const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full bg-slate-100 rounded-lg flex items-center justify-center border border-border">
      <div className="text-center text-muted-foreground">Loading map...</div>
    </div>
  ),
});

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [offers, setOffers] = useState<PackageDetailsFromEvent[]>([]);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  // No transient banner notification; new packages are shown as delivery offers
  const { packages, events, connected } = usePackages();

  // Store package details from events separately
  const [packageDetailsMap, setPackageDetailsMap] = useState<
    Map<string, PackageDetailsFromEvent>
  >(new Map());

  // Extract and store package details from message events with NewPackage tag
  useEffect(() => {
    const detailsMap = new Map();

    events.forEach((event) => {
      const output = event.output;
      console.log("output:", output)
      const packageId = output?.externalId || output?.id;

      if (packageId && (output?.pickupLocation || output?.dropLocation)) {
        detailsMap.set(packageId, {
          pickupLocation: output.pickupLocation,
          dropLocation: output.dropLocation,
          size: output.size,
          weightKg: output.weightKg,
          urgency: output.urgency,
          timestamp: event.timestamp,
          author: output.author as string | undefined,
        });
      }
    });

    setPackageDetailsMap(detailsMap);
  }, [events]);

  // Create offers from NewPackage message events
  useEffect(() => {
    const packageOffers: PackageDetailsFromEvent[] = [];

    // Convert packageDetailsMap to array of offers
    packageDetailsMap.forEach((details) => {
      packageOffers.push(details);
    });

    setOffers(packageOffers);
    console.log(
      `Created ${packageOffers.length} delivery offers from NewPackage messages`
    );
  }, [packages, packageDetailsMap]);

  // New packages are reflected in `events` -> `packageDetailsMap` -> `offers`.
  // We intentionally do not show a transient notification banner; the
  // delivery offer component itself represents the available work item.

  // Filter offers based on search and urgency
  const filteredOffers = offers.filter((offer: PackageDetailsFromEvent) => {
    const pickupName = offer.pickupLocation?.address?.split(",")[0] || "";
    const dropName = offer.dropLocation?.address?.split(",")[0] || "";
    
    const matchesSearch =
      pickupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dropName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency =
      filterUrgency === "all" || offer.urgency === filterUrgency;
    return matchesSearch && matchesUrgency;
  });

  // Accept offer function - shows price dialog first
  const acceptOffer = (details: PackageDetailsFromEvent) => {
    // Find the package ID from the map
    let foundId: string | null = null;
    packageDetailsMap.forEach((value, key) => {
      if (value === details) {
        foundId = key;
      }
    });
    setSelectedOfferId(foundId);
    setProposedPrice("");
    setShowPriceDialog(true);
  };

  

  // Submit the price proposal to blockchain
  const submitProposal = async () => {
    if (!selectedOfferId || !proposedPrice) return;

    try {
      const price = parseFloat(proposedPrice);
      if (isNaN(price) || price <= 0) {
        alert("Please enter a valid price");
        return;
      }

      // Make API call to send a private message with price
      const response = await fetch(`/api/packages/${selectedOfferId}/privateMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }  

      // Fetch all packages and find the one matching selectedOfferId
      const mongoID = await fetch(`/api/packages`);
      const allPackages = await mongoID.json();
      const matchingPackage = allPackages.find(
        (pkg: { externalId: string; packageID: string }) => pkg.externalId === selectedOfferId
      );
      const packageID = matchingPackage?.packageID;

      if (!packageID) {
        throw new Error("Package not found in database");
      }

      const mongoRes = await fetch("/api/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageID: packageID,
          price: price,
        }),
      });

      const mongoData = await mongoRes.json();
      if (!mongoRes.ok || mongoData.error) {
        throw new Error(mongoData.error || "Failed to save to MongoDB");
      }
      

      // Close dialog and reset
      setShowPriceDialog(false);
      setSelectedOfferId(null);
      setProposedPrice("");

      console.log(`Proposed transfer for package ${selectedOfferId} at ${price} kr`);
    } catch (error) {
      console.error("Failed to propose transfer:", error);
      alert("Failed to propose transfer. Please try again.");
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      case "none":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSizeIcon = (size: string) => {
    switch (size) {
      case "small":
        return "📦";
      case "medium":
        return "📫";
      case "large":
        return "📦";
      default:
        return "📦";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Active Delivery Offers
            </h1>
            <p className="text-muted-foreground">
              Browse and accept available package delivery opportunities in your
              area.
            </p>
          </div>
          {/* Real-time connection status */}
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-blue-500" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-muted-foreground">
                Firefly: {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="text-muted-foreground text-xs">
              {packages.size} packages tracked • {events.length} events received
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by package type or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filter */}
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Urgency</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
          <option value="none">No Urgency</option>
        </select>
      </div>

      {/* Delivery Offers List */}
      <div className="space-y-4">
        {filteredOffers.map((offer: PackageDetailsFromEvent, index: number) => (
          <div
            key={index}
            className="rounded-lg border bg-card hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Left: Map Section */}
              <div className="lg:w-1/3 p-4">
                <DeliveryMap
                  pickup={{
                    name: offer.pickupLocation?.address?.split(",")[0] || "Pickup",
                    address: offer.pickupLocation?.address || "",
                    lat: offer.pickupLocation?.lat || 0,
                    lng: offer.pickupLocation?.lng || 0,
                  }}
                  dropoff={{
                    name: offer.dropLocation?.address?.split(",")[0] || "Dropoff",
                    address: offer.dropLocation?.address || "",
                    lat: offer.dropLocation?.lat || 0,
                    lng: offer.dropLocation?.lng || 0,
                  }}
                />
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Pickup:</span>
                    <span className="text-muted-foreground truncate">
                      {offer.pickupLocation?.address?.split(",")[0] || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-medium">Dropoff:</span>
                    <span className="text-muted-foreground truncate">
                      {offer.dropLocation?.address?.split(",")[0] || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Package Info Section */}
              <div className="lg:w-2/3 p-4 lg:pl-0">
                <div className="flex flex-col h-full">
                  {/* Header with urgency */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getSizeIcon(
                          offer.size
                            ? offer.size.width > 50
                              ? "large"
                              : offer.size.width > 30
                              ? "medium"
                              : "small"
                            : "medium"
                        )}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-400">
                          {offer.size && offer.size.width > 40
                            ? "Large Package"
                            : offer.size && offer.size.width > 20
                            ? "Standard Package"
                            : "Small Package"}
                        </h3>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(
                            offer.urgency || "medium"
                          )}`}
                        >
                          {offer.urgency || "medium"} priority
                        </span>
                        {offer.author && (
                          <div className="text-xs text-muted-foreground mt-1">
                            From: {offer.author}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Package Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-neutral-400">
                    <div>
                      <span className="text-muted-foreground">Weight</span>
                      <div className="font-medium">{offer.weightKg || 0} kg</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size</span>
                      <div className="font-medium">
                        {offer.size
                          ? `${offer.size.width}×${offer.size.height}×${offer.size.depth} cm`
                          : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-auto text-neutral-400">
                    <button
                      onClick={() => acceptOffer(offer)}
                      className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors text-center"
                    >
                      Accept Delivery
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOffers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchTerm || filterUrgency !== "all"
              ? "No delivery offers match your current filters."
              : "No active delivery offers available at the moment."}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Check back soon for new delivery opportunities!
          </p>
        </div>
      )}

      {/* Price Dialog */}
      {showPriceDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Propose Delivery Price</h2>
            <p className="text-muted-foreground mb-4">
              Enter your proposed price for this delivery:
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Price (kr)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                placeholder="Enter price..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitProposal();
                  if (e.key === "Escape") setShowPriceDialog(false);
                }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPriceDialog(false)}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitProposal}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
              >
                Submit Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
