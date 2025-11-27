"use client";

import { useMemo } from "react";
import { UserRole } from "./useRoleDetection";
import { addHours, differenceInHours, format, startOfWeek } from "date-fns";
import { Package } from "@/types/package";

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
};

export function usePackageMetrics(
  packages: Package[],
  role: UserRole,
): PackageMetrics {
  return useMemo(() => {
    // Active shipments - packages that are currently active
    const activeShipments = packages.filter(
      (pkg) => pkg.active === "true" && pkg.packageDetails,
    ).length;

    // Earnings - for transporters (packages with price set)
    const totalEarnings = packages
      .filter((pkg) => pkg.price && pkg.price > 0)
      .reduce((sum, pkg) => sum + (pkg.price || 0), 0);

    // Spending - for senders (all packages they created)
    // Note: In a real app, we'd filter by user ID
    const totalSpending = packages
      .filter((pkg) => pkg.price && pkg.price > 0)
      .reduce((sum, pkg) => sum + (pkg.price || 0), 0);

    // Acceptance rate - for transporters
    // Simplified: ratio of packages with terms vs total packages
    const packagesWithTerms = packages.filter(
      (pkg) => pkg.termsId && pkg.termsId !== "null",
    );
    const acceptanceRate =
      packages.length > 0
        ? (packagesWithTerms.length / packages.length) * 100
        : 0;

    // On-time delivery rate - simplified calculation
    // Assume packages completed within expected time based on urgency
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
          packageId: pkg.packageID,
          estimatedDelivery,
          hoursRemaining: Math.max(0, hoursRemaining),
        };
      })
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining);

    // Packages over time - group by date
    const packagesOverTime = getPackagesOverTime(packages);

    // Earnings by week
    const earningsByWeek = getEarningsByWeek(packages);

    // Status distribution
    const statusDistribution = getStatusDistribution(packages);

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
    };
  }, [packages, role]);
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
  // Group packages by creation date
  const dateGroups = new Map<string, number>();

  packages.forEach((pkg) => {
    if (!pkg.createdAt) return;
    const date = format(new Date(pkg.createdAt), "MMM dd");
    dateGroups.set(date, (dateGroups.get(date) || 0) + 1);
  });

  // Convert to array and sort by date
  return Array.from(dateGroups.entries())
    .map(([date, count]) => ({ date, count }))
    .slice(-7) // Last 7 days
    .reverse();
}

function getEarningsByWeek(
  packages: Package[],
): Array<{ week: string; amount: number }> {
  // Group packages with prices by week
  const weekGroups = new Map<string, number>();

  packages
    .filter((pkg) => pkg.price && pkg.price > 0 && pkg.updatedAt)
    .forEach((pkg) => {
      const updated = new Date(pkg.updatedAt!);
      const weekStart = startOfWeek(updated, { weekStartsOn: 1 });
      const week = format(weekStart, "MMM dd");
      weekGroups.set(week, (weekGroups.get(week) || 0) + (pkg.price || 0));
    });

  // Convert to array and sort
  return Array.from(weekGroups.entries())
    .map(([week, amount]) => ({ week, amount }))
    .slice(-4) // Last 4 weeks
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
      fill: "hsl(142, 76%, 36%)", // Green
    },
    {
      name: "Pending",
      value: pending,
      fill: "hsl(48, 96%, 53%)", // Yellow
    },
    {
      name: "Completed",
      value: completed,
      fill: "hsl(215, 20%, 65%)", // Gray
    },
  ].filter((item) => item.value > 0); // Only include non-zero values
}
