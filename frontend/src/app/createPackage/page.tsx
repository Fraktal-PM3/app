"use client";

import React, { useState } from "react";
import { Urgency, type PackagePII } from "fraktal-lib";
import crypto from "crypto";

type UrgencyChoice = "high" | "medium" | "low" | "none";

export default function CreatePackagePage() {
  const [form, setForm] = useState({
    id: "",
    price: "",
    sizeWidth: "",
    sizeHeight: "",
    sizeDepth: "",
    urgency: "medium" as UrgencyChoice,
    weightKg: "",
    pickupAddress: "",
    pickupLat: "",
    pickupLon: "",
    dropAddress: "",
    dropLat: "",
    dropLon: "",
    senderName: "",
    senderPhone: "",
    recipientName: "",
    recipientPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setForm({
      id: "",
      price: "",
      sizeWidth: "",
      sizeHeight: "",
      sizeDepth: "",
      urgency: "medium",
      weightKg: "",
      pickupAddress: "",
      pickupLat: "",
      pickupLon: "",
      dropAddress: "",
      dropLat: "",
      dropLon: "",
      senderName: "",
      senderPhone: "",
      recipientName: "",
      recipientPhone: "",
    });
  };

  const test = () => {
    setForm({
      id: "PKG-67",
      price: "100",
      sizeWidth: "1",
      sizeHeight: "2",
      sizeDepth: "3",
      urgency: "medium" as UrgencyChoice,
      weightKg: "123",
      pickupAddress: "Luleå",
      pickupLat: "65.5848",
      pickupLon: "22.1567",
      dropAddress: "Stockholm",
      dropLat: "59.3327",
      dropLon: "18.0656",
      senderName: "Hej",
      senderPhone: "123",
      recipientName: "Då",
      recipientPhone: "456",
    });
  };

  const validate = () => {
    if (!form.id.trim()) return "Please enter an ID";
    if (!form.pickupAddress.trim()) return "Please enter pickup address";
    if (!form.dropAddress.trim()) return "Please enter drop address";
    if (!form.pickupLat.trim() || !form.pickupLon.trim())
      return "Please enter pickup latitude and longitude";
    if (!form.dropLat.trim() || !form.dropLon.trim())
      return "Please enter drop latitude and longitude";

    if (!form.sizeWidth || !form.sizeHeight || !form.sizeDepth)
      return "Please enter width, height and depth";

    if (!form.senderName.trim() || !form.recipientName.trim())
      return "Please enter sender and recipient names";

    const price = Number(form.price);
    const weight = Number(form.weightKg);
    const width = Number(form.sizeWidth);
    const height = Number(form.sizeHeight);
    const depth = Number(form.sizeDepth);

    if (Number.isNaN(price) || price < 0)
      return "Price must be a valid number ≥ 0";
    if (Number.isNaN(weight) || weight <= 0)
      return "Weight (kg) must be a valid number > 0";
    if (Number.isNaN(width) || width <= 0)
      return "Width must be a valid number > 0";
    if (Number.isNaN(height) || height <= 0)
      return "Height must be a valid number > 0";
    if (Number.isNaN(depth) || depth <= 0)
      return "Depth must be a valid number > 0";

    return null;
  };

  const toUrgencyEnum = (u: UrgencyChoice): Urgency => {
    switch (u) {
      case "low":
        return Urgency.LOW;
      case "high":
        return Urgency.HIGH;
      case "none":
        return Urgency.NONE;
      case "medium":
      default:
        return Urgency.MEDIUM;
    }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return alert(err);

    setSubmitting(true);
    try {
      const packageID = form.id.trim();

      const packageDetails = {
        pickupLocation: {
          address: form.pickupAddress.trim(),
          lat: parseFloat(form.pickupLat),
          lng: parseFloat(form.pickupLon),
        },
        dropLocation: {
          address: form.dropAddress.trim(),
          lat: parseFloat(form.dropLat),
          lng: parseFloat(form.dropLon),
        },
        size: {
          width: Number(form.sizeWidth),
          height: Number(form.sizeHeight),
          depth: Number(form.sizeDepth),
        },
        weightKg: Number(form.weightKg),
        urgency: toUrgencyEnum(form.urgency),
      };

      const pii: PackagePII = {
        senderName: form.senderName.trim(),
        senderContact: form.senderPhone.trim(),      // Changed
        recipientName: form.recipientName.trim(),
        recipientContact: form.recipientPhone.trim(), // Changed
      };

      const price = Number(form.price);
      const salt = crypto.randomBytes(16).toString('hex');
      
      // 1) Call MongoDB API
      const mongoRes = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageID,
          price,
          packageDetails,
          pii,
          salt
        }),
      });

      const mongoData = await mongoRes.json();
      if (!mongoRes.ok || mongoData.error) {
        throw new Error(mongoData.error || "Failed to save to MongoDB");
      }
      const externalId = mongoData.externalId;
      
      console.log("MongoDB package created with externalId:", externalId);
      // 2) Call FireFly createPackage API
      const fireflyRes = await fetch("/api/packages/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: externalId, // externalId for FireFly
          packageDetails,
          pii,
          salt
        }),
      });

      const fireflyData = await fireflyRes.json();
      if (!fireflyRes.ok || fireflyData.success === false) {
        throw new Error(
          fireflyData.error || "Failed to create package on FireFly"
        );
      }

      // Send package broadcast
      const pkgBroadcast = await fetch("/api/packages/create/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: externalId, // externalId for FireFly
          packageDetails,
          pii,
          salt
        }),
      });

      const broadcastResponse = await pkgBroadcast.json();
      if (broadcastResponse.success === false) {
        throw new Error(
          broadcastResponse.error || "Failed to broadcast package on FireFly"
        );
      }
      
      reset();
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e?.message || "Something went wrong"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-xl">
        <h1 className="text-3xl font-bold">Create Package</h1>

        <div className="w-full border rounded-xl p-4 space-y-4 shadow bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ID & Price */}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Package ID</span>
              <input
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. PKG-001"
                value={form.id}
                onChange={update("id")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Price</span>
              <input
                type="number"
                inputMode="decimal"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. 199.99"
                value={form.price}
                onChange={update("price")}
              />
            </label>

            {/* Size (exact dimensions) */}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Width (m)</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 0.40"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                value={form.sizeWidth}
                onChange={update("sizeWidth")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Height (m)</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 0.30"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                value={form.sizeHeight}
                onChange={update("sizeHeight")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Depth (m)</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 0.20"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                value={form.sizeDepth}
                onChange={update("sizeDepth")}
              />
            </label>

            {/* Urgency */}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Urgency</span>
              <select
                className="border rounded w-full px-3 py-2 bg-white text-gray-700"
                value={form.urgency}
                onChange={update("urgency")}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">None</option>
              </select>
            </label>

            {/* Weight */}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Weight (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. 3.5"
                value={form.weightKg}
                onChange={update("weightKg")}
              />
            </label>

            {/* Pickup address + coords */}
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm text-gray-700">Pickup Address</span>
              <input
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. 10 Market St, Stockholm"
                value={form.pickupAddress}
                onChange={update("pickupAddress")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Pickup Latitude</span>
              <input
                type="number"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. 59.3293"
                value={form.pickupLat}
                onChange={update("pickupLat")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Pickup Longitude</span>
              <input
                type="number"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. 18.0686"
                value={form.pickupLon}
                onChange={update("pickupLon")}
              />
            </label>

            {/* Drop address + coords */}
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm text-gray-700">Drop Address</span>
              <input
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. 5 Main St, Stockholm"
                value={form.dropAddress}
                onChange={update("dropAddress")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Drop Latitude</span>
              <input
                type="number"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. 59.3346"
                value={form.dropLat}
                onChange={update("dropLat")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Drop Longitude</span>
              <input
                type="number"
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                placeholder="e.g. 18.0632"
                value={form.dropLon}
                onChange={update("dropLon")}
              />
            </label>

            {/* PII */}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Sender Name</span>
              <input
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                value={form.senderName}
                onChange={update("senderName")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Sender Phone</span>
              <input
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                value={form.senderPhone}
                onChange={update("senderPhone")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Recipient Name</span>
              <input
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                value={form.recipientName}
                onChange={update("recipientName")}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Recipient Phone</span>
              <input
                className="border rounded w-full px-3 py-2 text-gray-700 placeholder:text-gray-400"
                value={form.recipientPhone}
                onChange={update("recipientPhone")}
              />
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 text-white rounded px-4 py-2 w-full hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : "Create Package"}
          </button>

          <button
            type="button"
            onClick={reset}
            className="mt-2 border rounded px-4 py-2 w-full hover:bg-gray-50 text-black"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={test}
            className="mt-2 border rounded px-4 py-2 w-full hover:bg-gray-50 text-black"
          >
            Test
          </button>
        </div>
      </main>
    </div>
  );
}
