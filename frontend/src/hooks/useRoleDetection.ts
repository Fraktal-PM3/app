"use client";

import { useState, useEffect } from "react";
import type { Package } from "@/types/package";

export type UserRole = "sender" | "transporter";

export function useRoleDetection(packages: Package[]) {
  const [role, setRole] = useState<UserRole>("sender");
  const [isRoleDetected, setIsRoleDetected] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // 1. Check localStorage for saved preference (highest priority)
    const savedRole = localStorage.getItem("preferredRole");
    if (savedRole === "sender" || savedRole === "transporter") {
      setRole(savedRole);
      setIsRoleDetected(true);
      return;
    }

    // 2. Analyze package history to detect primary role
    if (packages.length > 0) {
      const detectedRole = analyzePackageActivity(packages);
      setRole(detectedRole);
      setIsRoleDetected(true);
      return;
    }

    // 3. Fall back to environment variable
    const envRole =
      process.env.NEXT_PUBLIC_TRANSPORTER === "TRUE"
        ? "transporter"
        : "sender";
    setRole(envRole);
    setIsRoleDetected(true);
  }, [packages]);

  const setPreferredRole = (newRole: UserRole) => {
    setRole(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferredRole", newRole);
    }
  };

  return {
    role,
    isRoleDetected,
    setRole: setPreferredRole,
  };
}

function analyzePackageActivity(packages: Package[]): UserRole {
  // For now, we'll use a simple heuristic based on package creation
  // In a real app, we would track which packages the user created vs. transported
  // Since we don't have user IDs yet, we'll use the environment variable as a proxy

  // Count packages with different characteristics
  const recentPackages = packages.slice(0, 10); // Look at most recent 10 packages

  // Heuristic: If more than half of recent packages have price set,
  // assume user is more involved in transport (accepting/proposing)
  const packagesWithPrice = recentPackages.filter((pkg) => pkg.price && pkg.price > 0);

  if (packagesWithPrice.length > recentPackages.length / 2) {
    return "transporter";
  }

  // If most packages are active, assume user is a sender waiting for transport
  const activePackages = recentPackages.filter(
    (pkg) => pkg.active === "true" || pkg.active === "pending"
  );

  if (activePackages.length > recentPackages.length / 2) {
    return "sender";
  }

  // Default: check environment variable
  return process.env.NEXT_PUBLIC_TRANSPORTER === "TRUE"
    ? "transporter"
    : "sender";
}
