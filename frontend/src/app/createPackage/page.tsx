"use client";

import { useState } from "react";

export default function CreatePackagePage() {
  const [form, setForm] = useState({
    id: "",
    price: "",
    size: "medium" as "small" | "medium" | "large",
    urgency: "normal" as "low" | "normal" | "express",
    weightKg: "",
    pickupLat: "",
    pickupLon: "",
    dropLat: "",
    dropLon: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setForm({
      id: "",
      price: "",
      size: "medium",
      urgency: "normal",
      weightKg: "",
      pickupLat: "",
      pickupLon: "",
      dropLat: "",
      dropLon: "",
    });
  };

  const validate = () => {
    if (!form.id.trim()) return "Please enter an ID";
    if (!form.pickupLat.trim() || !form.pickupLon.trim()) return "Please enter pickup latitude and longitude";
    if (!form.dropLat.trim() || !form.dropLon.trim()) return "Please enter drop latitude and longitude";
    const price = Number(form.price);
    const weight = Number(form.weightKg);
    if (Number.isNaN(price) || price < 0) return "Price must be a valid number ≥ 0";
    if (Number.isNaN(weight) || weight <= 0) return "Weight (kg) must be a valid number > 0";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return alert(err);
    setSubmitting(true);
    try {
      const payload = {
        id: form.id.trim(),
        price: Number(form.price),
        size: form.size,
        urgency: form.urgency,
        weightKg: Number(form.weightKg),
        pickup: {
          lat: parseFloat(form.pickupLat),
          lon: parseFloat(form.pickupLon),
        },
        drop: {
          lat: parseFloat(form.dropLat),
          lon: parseFloat(form.dropLon),
        },
      };

      console.log("Create package payload", payload);
      alert("Package created locally with entered coordinates.\nCheck console for payload.");
      reset();
    } catch (e: any) {
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

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Size</span>
              <select
                className="border rounded w-full px-3 py-2 bg-white text-gray-700"
                value={form.size}
                onChange={update("size")}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Urgency</span>
              <select
                className="border rounded w-full px-3 py-2 bg-white text-gray-700"
                value={form.urgency}
                onChange={update("urgency")}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="express">Express</option>
              </select>
            </label>

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
        </div>

        <div className="w-full text-xs text-gray-600">
          <p className="mb-1 font-semibold">Payload example (for your API):</p>
          <pre className="whitespace-pre-wrap break-words border rounded-xl p-3 bg-gray-50">
{`{
  id: "${form.id || "<id>"}",
  price: ${form.price ? Number(form.price) : "<number>"},
  size: "${form.size}",
  urgency: "${form.urgency}",
  weightKg: ${form.weightKg ? Number(form.weightKg) : "<number>"},
  pickup: {
    lat: ${form.pickupLat || "<lat>"},
    lon: ${form.pickupLon || "<lon>"}
  },
  drop: {
    lat: ${form.dropLat || "<lat>"},
    lon: ${form.dropLon || "<lon>"}
  }
}`}
          </pre>
        </div>
      </main>
    </div>
  );
}
