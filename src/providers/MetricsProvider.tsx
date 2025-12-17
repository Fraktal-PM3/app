"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { usePackages, useTransfers } from "./PackageProvider";
import { useAnnouncements } from "./AuctionProvider";
import { addHours, differenceInHours, format, startOfWeek } from "date-fns";
import type { Package, Transfer } from "@/types/package";
import { Status } from "fraktal-lib";

export type UserRole = "sender" | "transporter";

export type PackageMetrics = {
  activeShipments: number;
  totalEarnings: number;
  totalSpending: number;
  acceptanceRate: number;
  onTimeRate: number;
  deliveryEstimates: Array<{
    packageId: string;
    estimatedDelivery: Date;
    hoursRemaining: number;
  }>;
  packagesOverTime: Array<{
    date: string;
    count: number;
  }>;
  earningsByWeek: Array<{
    week: string;
    amount: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
  // New auction metrics
  totalAnnouncements: number;
  activeAuctions: number;
};

interface MetricsContextValue {
  role: UserRole;
  isRoleDetected: boolean;
  setRole: (role: UserRole) => void;
  metrics: PackageMetrics;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(
  undefined,
);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("sender");
  const [isRoleDetected, setIsRoleDetected] = useState(false);

  const { packages } = usePackages();
  const { transfers } = useTransfers();
  const { announcements } = useAnnouncements(); // Get all announcements

  // Role detection logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check localStorage for saved preference (highest priority)
    const savedRole = localStorage.getItem("preferredRole");
    if (savedRole === "sender" || savedRole === "transporter") {
      setRoleState(savedRole);
      setIsRoleDetected(true);
      return;
    }

    // 2. Analyze package history to detect primary role
    if (packages.length > 0) {
      const detectedRole = analyzePackageActivity(packages);
      setRoleState(detectedRole);
      setIsRoleDetected(true);
      return;
    }

    // 3. Fall back to environment variable
    const envRole =
      process.env.NEXT_PUBLIC_TRANSPORTER === "TRUE" ? "transporter" : "sender";
    setRoleState(envRole);
    setIsRoleDetected(true);
  }, [packages]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferredRole", newRole);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    // Active shipments
    const activeShipments = packages.filter(
      (pkg) => pkg.active === "true" && pkg.packageDetails,
    ).length;

    // Get only SUCCEEDED transfers for financial calculations
    const executedTransfers = transfers.filter(
      (t) => t.status === "executed" && t.price && t.price > 0,
    );

    // Total earnings and spending
    const totalEarnings = executedTransfers.reduce(
      (sum, transfer) => sum + (transfer.price || 0),
      0,
    );
    const totalSpending = executedTransfers.reduce(
      (sum, transfer) => sum + (transfer.price || 0),
      0,
    );

    // Acceptance rate
    const packagesWithTerms = packages.filter(
      (pkg) => pkg.termsId && pkg.termsId !== "null",
    );
    const acceptanceRate =
      packages.length > 0
        ? (packagesWithTerms.length / packages.length) * 100
        : 0;

    // On-time delivery rate
    const completedPackages = packages.filter((pkg) => pkg.active === "false");
    const onTimePackages = completedPackages.filter((pkg) => {
      if (!pkg.createdAt || !pkg.updatedAt || !pkg.packageDetails) return false;
      const created = new Date(pkg.createdAt);
      const completed = new Date(pkg.updatedAt);
      const expectedHours = getExpectedHours(pkg.packageDetails.urgency);
      const actualHours = differenceInHours(completed, created);
      return actualHours <= expectedHours;
    });
    const onTimeRate =
      completedPackages.length > 0
        ? (onTimePackages.length / completedPackages.length) * 100
        : 100;

    // Delivery estimates for active packages
    const deliveryEstimates = packages
      .filter(
        (pkg) => pkg.active === "true" && pkg.packageDetails && pkg.createdAt,
      )
      .map((pkg) => {
        const createdAt = new Date(pkg.createdAt!);
        const expectedHours = getExpectedHours(pkg.packageDetails!.urgency);
        const estimatedDelivery = addHours(createdAt, expectedHours);
        const hoursRemaining = differenceInHours(estimatedDelivery, new Date());

        return {
          packageId: pkg.id,
          estimatedDelivery,
          hoursRemaining: Math.max(0, hoursRemaining),
        };
      })
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining);

    // Packages over time
    const packagesOverTime = getPackagesOverTime(packages);

    // Earnings by week
    const earningsByWeek = getEarningsByWeek(executedTransfers);

    // Status distribution
    const statusDistribution = getStatusDistribution(packages);

    // Auction metrics
    const totalAnnouncements = announcements.length;
    const activeAuctions = announcements.filter((a) => a.isActive).length;

    return {
      activeShipments,
      totalEarnings,
      totalSpending,
      acceptanceRate: Math.round(acceptanceRate),
      onTimeRate: Math.round(onTimeRate),
      deliveryEstimates,
      packagesOverTime,
      earningsByWeek,
      statusDistribution,
      totalAnnouncements,
      activeAuctions,
    };
  }, [packages, transfers, announcements, role]);

  const value = useMemo(
    () => ({
      role,
      isRoleDetected,
      setRole,
      metrics,
    }),
    [role, isRoleDetected, metrics],
  );

  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
}

// Hook to access metrics
export function useMetrics() {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error("useMetrics must be used within MetricsProvider");
  }
  return context.metrics;
}

// Hook to access role detection
export function useRoleDetection() {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error("useRoleDetection must be used within MetricsProvider");
  }
  return {
    role: context.role,
    isRoleDetected: context.isRoleDetected,
    setRole: context.setRole,
  };
}

// Helper functions

function analyzePackageActivity(packages: Package[]): UserRole {
  const recentPackages = packages.slice(0, 10);

  // Heuristic: If more than half of recent packages have price set,
  // assume user is more involved in transport
  const packagesWithPrice = recentPackages.filter(
    (pkg) => pkg.price && pkg.price > 0,
  );

  if (packagesWithPrice.length > recentPackages.length / 2) {
    return "transporter";
  }

  // If most packages are active, assume user is a sender waiting for transport
  const activePackages = recentPackages.filter(
    (pkg) => pkg.active === "true" || pkg.active === "pending",
  );

  if (activePackages.length > recentPackages.length / 2) {
    return "sender";
  }

  // Default: check environment variable
  return process.env.NEXT_PUBLIC_TRANSPORTER === "TRUE"
    ? "transporter"
    : "sender";
}

function getExpectedHours(urgency: string): number {
  switch (urgency) {
    case "high":
      return 24;
    case "medium":
      return 48;
    case "low":
      return 72;
    default:
      return 72;
  }
}

function getPackagesOverTime(
  packages: Package[],
): Array<{ date: string; count: number }> {
  const dateGroups = new Map<string, number>();

  packages.forEach((pkg) => {
    if (!pkg.createdAt) return;
    const date = format(new Date(pkg.createdAt), "MMM dd");
    dateGroups.set(date, (dateGroups.get(date) || 0) + 1);
  });

  return Array.from(dateGroups.entries())
    .map(([date, count]) => ({ date, count }))
    .slice(-7)
    .reverse();
}

function getEarningsByWeek(
  transfers: Transfer[],
): Array<{ week: string; amount: number }> {
  const weekGroups = new Map<string, number>();

  transfers
    .filter(
      (transfer) => transfer.price && transfer.price > 0 && transfer.updatedAt,
    )
    .forEach((transfer) => {
      const updated = new Date(transfer.updatedAt!);
      const weekStart = startOfWeek(updated, { weekStartsOn: 1 });
      const week = format(weekStart, "MMM dd");
      weekGroups.set(week, (weekGroups.get(week) || 0) + (transfer.price || 0));
    });

  return Array.from(weekGroups.entries())
    .map(([week, amount]) => ({ week, amount }))
    .slice(-4)
    .reverse();
}

function getStatusDistribution(
  packages: Package[],
): Array<{ name: string; value: number; fill: string }> {
  const active = packages.filter((pkg) => pkg.active === "true").length;
  const pending = packages.filter((pkg) => pkg.active === "pending").length;
  const completed = packages.filter((pkg) => pkg.active === "false").length;

  return [
    {
      name: "Active",
      value: active,
      fill: "hsl(142, 76%, 36%)",
    },
    {
      name: "Pending",
      value: pending,
      fill: "hsl(48, 96%, 53%)",
    },
    {
      name: "Completed",
      value: completed,
      fill: "hsl(215, 20%, 65%)",
    },
  ].filter((item) => item.value > 0);
}
