"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import crypto from "crypto";
import { Urgency, type PackagePII } from "fraktal-lib";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Package as PackageIcon,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast, Toaster } from "sonner";

type UrgencyChoice = "high" | "medium" | "low" | "none";

type Identity = {
  name: string;
  mspID: string;
};

export default function CreatePackagePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [submitting, setSubmitting] = useState(false);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loadingIdentities, setLoadingIdentities] = useState(true);

  const [form, setForm] = useState({
    name: "",
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
    recipientOrgMSP: "",
  });

  // Fetch identities on mount
  useEffect(() => {
    const fetchIdentities = async () => {
      try {
        const response = await fetch("/api/identities");
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched identities:", data);
          setIdentities(
            data.filter((id: Identity | undefined) => id !== undefined),
          );
        } else {
          toast.error("Failed to load recipient organizations");
        }
      } catch (error) {
        console.error("Error fetching identities:", error);
        toast.error("Failed to load recipient organizations");
      } finally {
        setLoadingIdentities(false);
      }
    };

    fetchIdentities();
  }, []);

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setForm({
      name: "",
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
      recipientOrgMSP: "",
    });
    setActiveTab("details");
  };

  const fillTestData = () => {
    setForm({
      name: `PKG-${Date.now().toString().slice(-6)}`,
      sizeWidth: "40",
      sizeHeight: "30",
      sizeDepth: "20",
      urgency: "medium" as UrgencyChoice,
      weightKg: "5",
      pickupAddress: "Luleå University of Technology, Luleå, Sweden",
      pickupLat: "65.6178",
      pickupLon: "22.1401",
      dropAddress: "Kungliga Tekniska Högskolan, Stockholm, Sweden",
      dropLat: "59.3498",
      dropLon: "18.0686",
      senderName: "John Doe",
      senderPhone: "+46701234567",
      recipientName: "Jane Smith",
      recipientPhone: "+46709876543",
      recipientOrgMSP: identities.length > 0 ? identities[0].mspID : "",
    });
    toast.success("Test data filled");
  };

  const validateDetails = () => {
    if (!form.name.trim()) return "Package name is required";
    if (!form.sizeWidth || !form.sizeHeight || !form.sizeDepth)
      return "All dimensions are required";
    if (!form.weightKg) return "Weight is required";

    const weight = Number(form.weightKg);
    const width = Number(form.sizeWidth);
    const height = Number(form.sizeHeight);
    const depth = Number(form.sizeDepth);

    if (Number.isNaN(weight) || weight <= 0)
      return "Weight must be greater than 0";
    if (Number.isNaN(width) || width <= 0)
      return "Width must be greater than 0";
    if (Number.isNaN(height) || height <= 0)
      return "Height must be greater than 0";
    if (Number.isNaN(depth) || depth <= 0)
      return "Depth must be greater than 0";

    return null;
  };

  const validateLocations = () => {
    if (!form.pickupAddress.trim()) return "Pickup address is required";
    if (!form.dropAddress.trim()) return "Drop-off address is required";
    if (!form.pickupLat.trim() || !form.pickupLon.trim())
      return "Pickup coordinates are required";
    if (!form.dropLat.trim() || !form.dropLon.trim())
      return "Drop-off coordinates are required";

    return null;
  };

  const validateContact = () => {
    if (!form.senderName.trim()) return "Sender name is required";
    if (!form.recipientName.trim()) return "Recipient name is required";
    if (!form.recipientOrgMSP) return "Recipient organization is required";

    return null;
  };

  const validateAll = () => {
    return validateDetails() || validateLocations() || validateContact();
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

  const handleNext = () => {
    if (activeTab === "details") {
      const error = validateDetails();
      if (error) {
        toast.error(error);
        return;
      }
      setActiveTab("locations");
    } else if (activeTab === "locations") {
      const error = validateLocations();
      if (error) {
        toast.error(error);
        return;
      }
      setActiveTab("contact");
    }
  };

  const handleBack = () => {
    if (activeTab === "locations") {
      setActiveTab("details");
    } else if (activeTab === "contact") {
      setActiveTab("locations");
    }
  };

  const handleSubmit = async () => {
    const err = validateAll();
    if (err) {
      toast.error(err);
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Creating package...");
    router.push("/packages");
    try {
      const name = form.name.trim();

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
        senderContact: form.senderPhone.trim(),
        recipientName: form.recipientName.trim(),
        recipientContact: form.recipientPhone.trim(),
      };

      const salt = crypto.randomBytes(16).toString("hex");

      // Create on blockchain
      toast.loading("Creating on blockchain...", { id: loadingToast });
      const fireflyRes = await fetch("/api/packages/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          packageDetails,
          pii,
          salt,
          recipientOrgMSP: form.recipientOrgMSP,
        }),
      });

      const fireflyData = await fireflyRes.json();
      if (!fireflyRes.ok || fireflyData.success === false) {
        throw new Error(fireflyData.error || "Failed to create on blockchain");
      }

      // Announce package (optional - user can trigger later)
      toast.success(
        "Package created successfully! You can announce it later.",
        { id: loadingToast },
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create package", {
        id: loadingToast,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-3">
            <PackageIcon className="h-8 w-8 text-primary" />
            <h1 className="font-mono text-3xl font-bold uppercase tracking-tight">
              Create Package
            </h1>
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Fill in the details to create a new package
          </p>
        </motion.div>

        <Separator className="bg-border" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto max-w-3xl"
        >
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-lg uppercase tracking-wider">
                  Package Information
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fillTestData}
                  className="font-mono text-xs uppercase"
                >
                  Fill Test Data
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 font-mono">
                  <TabsTrigger value="details" className="text-xs uppercase">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="locations" className="text-xs uppercase">
                    Locations
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs uppercase">
                    Contact
                  </TabsTrigger>
                </TabsList>

                {/* Package Details Tab */}
                <TabsContent value="details" className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 mb-4">
                      <p className="font-mono text-xs text-blue-900">
                        <span className="font-bold">Note:</span> A unique
                        identifier (UUID) will be automatically generated for
                        your package and used for blockchain operations.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="font-mono text-xs uppercase"
                        >
                          Package Name *
                        </Label>
                        <Input
                          id="name"
                          placeholder="e.g., PKG-001"
                          value={form.name}
                          onChange={update("name")}
                          className="font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="urgency"
                          className="font-mono text-xs uppercase"
                        >
                          Urgency *
                        </Label>
                        <select
                          id="urgency"
                          value={form.urgency}
                          onChange={update("urgency")}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="high">HIGH</option>
                          <option value="medium">MEDIUM</option>
                          <option value="low">LOW</option>
                          <option value="none">NONE</option>
                        </select>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="mb-3 font-mono text-sm font-bold uppercase">
                        Dimensions (cm)
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label
                            htmlFor="width"
                            className="font-mono text-xs uppercase"
                          >
                            Width *
                          </Label>
                          <Input
                            id="width"
                            type="number"
                            placeholder="e.g., 40"
                            value={form.sizeWidth}
                            onChange={update("sizeWidth")}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="height"
                            className="font-mono text-xs uppercase"
                          >
                            Height *
                          </Label>
                          <Input
                            id="height"
                            type="number"
                            placeholder="e.g., 30"
                            value={form.sizeHeight}
                            onChange={update("sizeHeight")}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="depth"
                            className="font-mono text-xs uppercase"
                          >
                            Depth *
                          </Label>
                          <Input
                            id="depth"
                            type="number"
                            placeholder="e.g., 20"
                            value={form.sizeDepth}
                            onChange={update("sizeDepth")}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="weight"
                        className="font-mono text-xs uppercase"
                      >
                        Weight (kg) *
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="e.g., 5.0"
                        value={form.weightKg}
                        onChange={update("weightKg")}
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleNext}
                      className="font-mono uppercase"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Locations Tab */}
                <TabsContent value="locations" className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <div className="rounded-md border p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <h3 className="font-mono text-sm font-bold uppercase">
                          Pickup Location
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="font-mono text-xs uppercase">
                            Address *
                          </Label>
                          <Input
                            placeholder="e.g., Luleå University, Luleå, Sweden"
                            value={form.pickupAddress}
                            onChange={update("pickupAddress")}
                            className="font-mono"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase">
                              Latitude *
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 65.6178"
                              value={form.pickupLat}
                              onChange={update("pickupLat")}
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase">
                              Longitude *
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 22.1401"
                              value={form.pickupLon}
                              onChange={update("pickupLon")}
                              className="font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border  p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-600" />
                        <h3 className="font-mono text-sm font-bold uppercase">
                          Drop-off Location
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="font-mono text-xs uppercase ">
                            Address *
                          </Label>
                          <Input
                            placeholder="e.g., KTH, Stockholm, Sweden"
                            value={form.dropAddress}
                            onChange={update("dropAddress")}
                            className="font-mono"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase">
                              Latitude *
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 59.3498"
                              value={form.dropLat}
                              onChange={update("dropLat")}
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase">
                              Longitude *
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g., 18.0686"
                              value={form.dropLon}
                              onChange={update("dropLon")}
                              className="font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="font-mono uppercase"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="font-mono uppercase"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact" className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <div className="rounded-md border border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-mono text-sm font-bold uppercase">
                          Sender Information
                        </h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="font-mono text-xs uppercase">
                            Name *
                          </Label>
                          <Input
                            placeholder="e.g., John Doe"
                            value={form.senderName}
                            onChange={update("senderName")}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-mono text-xs uppercase">
                            Phone
                          </Label>
                          <Input
                            placeholder="e.g., +46701234567"
                            value={form.senderPhone}
                            onChange={update("senderPhone")}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-mono text-sm font-bold uppercase">
                          Recipient Information
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label
                            htmlFor="recipientOrg"
                            className="font-mono text-xs uppercase"
                          >
                            Recipient Organization *
                          </Label>
                          {loadingIdentities ? (
                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-muted-foreground">
                              Loading organizations...
                            </div>
                          ) : (
                            <select
                              id="recipientOrg"
                              value={form.recipientOrgMSP}
                              onChange={update("recipientOrgMSP")}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">Select organization...</option>
                              {identities.map((identity) => (
                                <option
                                  key={identity.mspID}
                                  value={identity.mspID}
                                >
                                  {identity.name} ({identity.mspID})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase">
                              Name *
                            </Label>
                            <Input
                              placeholder="e.g., Jane Smith"
                              value={form.recipientName}
                              onChange={update("recipientName")}
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-mono text-xs uppercase">
                              Phone
                            </Label>
                            <Input
                              placeholder="e.g., +46709876543"
                              value={form.recipientPhone}
                              onChange={update("recipientPhone")}
                              className="font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="font-mono uppercase"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="font-mono uppercase"
                    >
                      {submitting ? (
                        "Creating..."
                      ) : (
                        <>
                          Create Package
                          <Check className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
