'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

// Simple SWR fetcher
const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch');
    return r.json();
  });

type PackageItem = {
  _id?: string;
  packageID: string;
  price?: number;
  size?: 'small' | 'medium' | 'large';
  urgency?: 'low' | 'normal' | 'express';
  weightKg?: number;
  pickup?: { lat: number; lon: number };
  drop?: { lat: number; lon: number };
  status?: 'active' | 'in_transit' | 'available' | 'accepted' | 'completed' | 'canceled';
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export default function ActivePackagePage() {
  const { data, error, isLoading, mutate } = useSWR<PackageItem[]>('/api/packages', fetcher);
  const [query, setQuery] = useState('');

  // Parse date strings for display
  const packages = (data ?? []).map((p) => ({
    ...p,
    createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
    updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
  }));

  // Filter to only active and matching search
  const filtered = packages.filter(
    (p) =>
      (!query.trim() || p.packageID.toLowerCase().includes(query.toLowerCase())) &&
      (p.status === 'active' || !p.status)
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Active Packages</h1>
        <div className="flex gap-2">
          <button
            onClick={() => mutate()}
            className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          className="border rounded px-3 py-2 text-gray-700 placeholder:text-gray-400 w-full sm:w-1/3"
          placeholder="Search by package ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="text-sm text-gray-500">
          {isLoading ? 'Loading…' : error ? 'Failed to load' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Package List */}
    <div className="space-y-3">
      {filtered.map((p) => {
        console.log('ID:', p.packageID);
        return (
        <div key={p._id ?? p.packageID} className="border rounded-xl p-4 shadow-sm bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
            <div className="font-semibold text-black">ID: {p.packageID}</div>
            <div className="text-xs text-black">
              Created: {p.createdAt ? new Date(p.createdAt).toLocaleString() : '–'} • Updated:{' '}
              {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '–'}
            </div>
            <div className="text-sm text-gray-700">
              {typeof p.price === 'number' && <span className="mr-3">Price: {p.price}</span>}
              {typeof p.weightKg === 'number' && <span className="mr-3">Weight: {p.weightKg} kg</span>}
              {p.size && <span className="mr-3">Size: {p.size}</span>}
              {p.urgency && <span>Urgency: {p.urgency}</span>}
            </div>
            {(p.pickup || p.drop) && (
              <div className="text-xs text-gray-600">
                {p.pickup && (
                <span className="mr-3">
                  Pickup: {p.pickup.lat.toFixed(5)}, {p.pickup.lon.toFixed(5)}
                </span>
                )}
                {p.drop && (
                <span>
                  Drop: {p.drop.lat.toFixed(5)}, {p.drop.lon.toFixed(5)}
                </span>
                )}
              </div>
            )}
            </div>
            <div className="flex flex-col items-end gap-2 text-black">
            <span className="text-xs px-2 py-1 rounded-full border bg-white">
              {p.status ?? 'active'}
            </span>
            <Link
              href={`/activePackage/package/${p.packageID}`}
              className="text-sm border rounded px-3 py-1 hover:bg-gray-50 text-gray-700"
            >
              Details
            </Link>
            </div>
          </div>
        </div>
        );
      })}

        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center">No active packages found.</p>
        )}
      </div>
    </div>
  );
}
