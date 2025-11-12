"use client";

import { useEffect, useState } from "react";

type Pkg = {
  _id: string;
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function Home() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [pkgId, setPkgId] = useState("");

  // Load all packages
  const load = async () => {
    const res = await fetch("/api/packages", { cache: "no-store" }); // ✅ fixed path
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

  // Create or update a package
  const createOrTouch = async () => {
    if (!pkgId.trim()) return alert("Please enter an ID");
    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkgId.trim() }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Error: ${err.error || res.statusText}`);
      return;
    }
    setPkgId("");
    await load();
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-xl">
        <h1 className="text-3xl font-bold">Fraktal</h1>

        {/* Input Form */}
        <div className="w-full border rounded-xl p-4 space-y-2 shadow">
          <input
            className="border rounded w-full px-3 py-2"
            placeholder="Package ID"
            value={pkgId}
            onChange={(e) => setPkgId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createOrTouch()}
          />
          <button
            onClick={createOrTouch}
            className="bg-blue-600 text-white rounded px-4 py-2 w-full hover:bg-blue-700"
          >
            Create or Update Timestamp
          </button>
        </div>

        {/* Package List */}
        <div className="w-full space-y-3">
          {packages.map((p) => (
            <div key={p._id} className="border rounded-xl p-4 shadow-sm">
              <div className="font-semibold">ID: {p.id}</div>
              <div className="text-sm text-gray-600">
                Created: {p.createdAt ? new Date(p.createdAt).toLocaleString() : "–"}
              </div>
              <div className="text-sm text-gray-600">
                Updated: {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "–"}
              </div>
            </div>
          ))}

          {packages.length === 0 && (
            <p className="text-gray-500 text-sm text-center">
              No packages yet. Add one above!
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
