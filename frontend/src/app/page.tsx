"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PackageCharts } from "@/components/dashboard/PackageCharts";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RealtimeIndicator } from "@/components/dashboard/RealtimeIndicator";
import { RoleToggle } from "@/components/dashboard/RoleToggle";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics, usePackages, useRoleDetection } from "@/providers";
import { motion } from "framer-motion";
import { getCurrentMspId } from "./packages/[id]/actions";
import { useEffect, useState } from "react";

export default function Home() {
  const { packages, isLoading, isConnected, error } = usePackages();
  const { role, isRoleDetected, setRole } = useRoleDetection();
  const metrics = useMetrics();
  const [currentMspId, setCurrentMspId] = useState<string | null>(null);

  // Get current MSP ID on mount
  useEffect(() => {
    getCurrentMspId().then(setCurrentMspId);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="border border-destructive/50 bg-destructive/10 p-6">
            <h2 className="mb-2 font-mono text-sm font-bold uppercase">
              Connection Error
            </h2>
            <p className="font-mono text-xs text-destructive/90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !isRoleDetected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Separator className="bg-border" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[500px]" />
            <Skeleton className="h-[500px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
        {/* Header */}
        <PageHeader
          title={`Dashboard for ${currentMspId || "..."}`}
          subtitle="Package Transportation Hub"
          showBreadcrumbs={false}
          rightContent={
            <>
              <RealtimeIndicator isConnected={isConnected} />
              <RoleToggle currentRole={role} onRoleChange={setRole} />
            </>
          }
        />

        <Separator className="bg-border" />

        {/* Stats Cards */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <StatsCards metrics={metrics} role={role} />
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
              Quick Actions
            </h2>
          </div>
          <QuickActions role={role} />
        </motion.div>

        <Separator className="bg-border" />

        {/* Charts and Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-4">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
              Overview
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <PackageCharts metrics={metrics} role={role} />
            <ActivityFeed />
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="border border-border bg-muted/20 p-4 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {packages.length} {packages.length === 1 ? "package" : "packages"}
            {isConnected && (
              <span className="ml-2 text-foreground">• Live</span>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
