"use client";

import { useEffect, useState } from "react";

type Pkg = {
  _id: string;
  packageID: string;
  active: boolean;
  packageDetails?: {
    pickupLocation: {
      address: string;
      lat?: number;
      lng?: number;
    };
    dropLocation: {
      address: string;
      lat?: number;
      lng?: number;
    };
    size: {
      width: number;
      height: number;
      depth: number;
    };
    weightKg: number;
    urgency: string;
    price?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

export default function Home() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [pkgId, setPkgId] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [price, setPrice] = useState("");

  // Load all packages
  const load = async () => {
    const res = await fetch("/api/packages", { cache: "no-store" });
    if (!res.ok) {
      console.error("Failed to load packages");
      return;
    }
    const data = await res.json();
    setPackages(data);
  };

  useEffect(() => {
    load();
  }, []);

  // POST: Create package with hardcoded details
  const createPackage = async () => {
    if (!pkgId.trim()) return alert("Please enter a package ID");
    
    const packageDetails = {
      pickupLocation: {
        address: "Drottninggatan 95, Stockholm",
        lat: 59.3293,
        lng: 18.0686
      },
      dropLocation: {
        address: "Avenyn 41, Göteborg",
        lat: 57.7089,
        lng: 11.9746
      },
      size: {
        width: 30,
        height: 20,
        depth: 15
      },
      weightKg: 5,
      urgency: "medium"
    };

    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        packageID: pkgId.trim(),
        packageDetails
      }),
    });
    
    if (!res.ok) {
      try {
        const err = await res.json();
        alert(`Error: ${err.error || res.statusText}`);
      } catch {
        alert(`Error: ${res.statusText}`);
      }
      return;
    }
    
    alert("✅ Package created!");
    setPkgId("");
    await load();
  };

  // PATCH: Update active status
  const updateActive = async (packageID: string, active: boolean) => {
    const res = await fetch("/api/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageID, active }),
    });
    
    if (!res.ok) {
      try {
        const err = await res.json();
        alert(`Error: ${err.error || res.statusText}`);
      } catch {
        alert(`Error: ${res.statusText}`);
      }
      return;
    }
    
    alert(`✅ Package ${active ? 'activated' : 'deactivated'}!`);
    await load();
  };

  // PUT: Update price
  const updatePrice = async () => {
    if (!selectedPkg) return alert("Please select a package");
    if (!price) return alert("Please enter a price");
    
    const res = await fetch("/api/packages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        packageID: selectedPkg, 
        price: parseFloat(price) 
      }),
    });
    
    if (!res.ok) {
      try {
        const err = await res.json();
        alert(`Error: ${err.error || res.statusText}`);
      } catch {
        alert(`Error: ${res.statusText}`);
      }
      return;
    }
    
    alert("✅ Price updated!");
    setPrice("");
    setSelectedPkg("");
    await load();
  };

  return (
    <div className="font-sans min-h-screen p-8 pb-20">
      <main className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Fraktal Package Manager</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* POST: Create Package */}
          <div className="border rounded-xl p-6 space-y-4 shadow">
            <h2 className="text-xl font-semibold">📦 Create Package (POST)</h2>
            
            <input
              className="border rounded w-full px-3 py-2"
              placeholder="Package ID *"
              value={pkgId}
              onChange={(e) => setPkgId(e.target.value)}
            />
            
            <div className="bg-gray-50 p-3 rounded text-black space-y-1">
              <p className="font-medium text-black">Hardcoded Details:</p>
              <p>📍 Pickup: Drottninggatan 95, Stockholm</p>
              <p>📍 Drop: Avenyn 41, Göteborg</p>
              <p>📏 Size: 30x20x15 cm</p>
              <p>⚖️ Weight: 5 kg</p>
              <p>🚨 Urgency: Medium</p>
            </div>
            
            <button
              onClick={createPackage}
              className="bg-blue-600 text-white rounded px-4 py-2 w-full hover:bg-blue-700"
            >
              Create Package
            </button>
          </div>

          {/* PUT: Update Price */}
          <div className="border rounded-xl p-6 space-y-4 shadow">
            <h2 className="text-xl font-semibold">💰 Update Price (PUT)</h2>
            
            <select
              className="border rounded w-full px-3 py-2 text-white"
              value={selectedPkg}
              onChange={(e) => setSelectedPkg(e.target.value)}
            >
                <option value="" className="text-white">Select a package...</option>
              {packages.map((p) => (
                <option key={p._id} value={p.packageID}>
                  {p.packageID} {p.packageDetails?.price ? `(${p.packageDetails.price} kr)` : '(no price)'}
                </option>
              ))}
            </select>
            
            <input
              className="border rounded w-full px-3 py-2"
              placeholder="New Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            
            <button
              onClick={updatePrice}
              className="bg-green-600 text-white rounded px-4 py-2 w-full hover:bg-green-700"
            >
              Update Price
            </button>
          </div>
        </div>

        {/* Package List with PATCH buttons */}
        <div className="border rounded-xl p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">📋 All Packages (GET)</h2>
          
          <div className="space-y-3">
            {packages.map((p) => (
              <div key={p._id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-black">ID: {p.packageID}</div>
                    <div className={`text-sm font-medium ${p.active ? 'text-green-600' : 'text-red-600'}`}>
                      Status: {p.active ? '✅ Active' : '❌ Inactive'}
                    </div>
                  </div>
                  
                  {/* PATCH: Toggle Active */}
                  <button
                    onClick={() => updateActive(p.packageID, !p.active)}
                    className={`px-3 py-1 rounded text-sm ${
                      p.active 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
                
                {p.packageDetails && (
                  <div className="mt-3 text-black space-y-1 border-t pt-2">
                    <div><strong>Pickup:</strong> {p.packageDetails.pickupLocation.address}</div>
                    <div><strong>Drop:</strong> {p.packageDetails.dropLocation.address}</div>
                    <div><strong>Size:</strong> {p.packageDetails.size.width}x{p.packageDetails.size.height}x{p.packageDetails.size.depth} cm</div>
                    <div><strong>Weight:</strong> {p.packageDetails.weightKg} kg</div>
                    <div><strong>Urgency:</strong> {p.packageDetails.urgency}</div>
                    {p.packageDetails.price && (
                      <div><strong>Price:</strong> {p.packageDetails.price} kr</div>
                    )}
                  </div>
                )}
                
                <div className="mt-2 text-xs text-gray-500">
                  <div>Created: {p.createdAt ? new Date(p.createdAt).toLocaleString() : "–"}</div>
                  <div>Updated: {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "–"}</div>
                </div>
              </div>
            ))}

            {packages.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No packages yet. Create one above!
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}