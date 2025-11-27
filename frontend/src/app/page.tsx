"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { usePackages } from "@/hooks/usePackages";
import { useTransfers } from "@/hooks/useTransfers";
import { useRoleDetection } from "@/hooks/useRoleDetection";
import { usePackageMetrics } from "@/hooks/usePackageMetrics";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PackageCharts } from "@/components/dashboard/PackageCharts";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RoleToggle } from "@/components/dashboard/RoleToggle";
import { RealtimeIndicator } from "@/components/dashboard/RealtimeIndicator";
import { motion } from "framer-motion";

export default function Home() {
  const { packages, isLoading, isConnected, error } = usePackages();
  const { transfers, isLoading: transfersLoading } = useTransfers();
  const { role, isRoleDetected, setRole } = useRoleDetection(packages);
  const metrics = usePackageMetrics(packages, transfers, role);

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="border border-destructive/50 bg-destructive/10 p-6">
          <h2 className="mb-2 font-mono text-sm font-bold uppercase">
            Connection Error
          </h2>
          <p className="font-mono text-xs text-destructive/90">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading || transfersLoading || !isRoleDetected) {
    return (
      <div className="container mx-auto space-y-8 py-8">
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
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
        >
          <div className="space-y-1">
            <h1 className="font-mono text-3xl font-bold uppercase tracking-tight">
              Dashboard
            </h1>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Package Transportation Hub
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RealtimeIndicator isConnected={isConnected} />
            <RoleToggle currentRole={role} onRoleChange={setRole} />
          </div>
        </motion.div>

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
