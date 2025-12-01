"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageMetrics, UserRole } from "@/providers";
import {
  Package,
  TrendingUp,
  CheckCircle,
  DollarSign,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

type StatsCardsProps = {
  metrics: PackageMetrics;
  role: UserRole;
};

export function StatsCards({ metrics, role }: StatsCardsProps) {
  const stats = role === "sender"
    ? [
        {
          title: "Active Shipments",
          value: metrics.activeShipments,
          icon: Package,
          description: "Currently in transit",
          highlight: metrics.activeShipments > 0,
        },
        {
          title: "Total Spending",
          value: `${metrics.totalSpending.toLocaleString()} kr`,
          icon: DollarSign,
          description: "Total package costs",
          highlight: false,
        },
        {
          title: "Next Delivery",
          value:
            metrics.deliveryEstimates[0]?.hoursRemaining !== undefined
              ? `${metrics.deliveryEstimates[0].hoursRemaining}h`
              : "N/A",
          icon: Clock,
          description: "Estimated time",
          highlight: metrics.deliveryEstimates[0]?.hoursRemaining !== undefined && metrics.deliveryEstimates[0].hoursRemaining < 24,
        },
        {
          title: "On-Time Rate",
          value: `${metrics.onTimeRate}%`,
          icon: CheckCircle,
          description: "Delivery reliability",
          highlight: metrics.onTimeRate >= 90,
        },
      ]
    : [
        {
          title: "Active Deliveries",
          value: metrics.activeShipments,
          icon: Package,
          description: "Currently delivering",
          highlight: metrics.activeShipments > 0,
        },
        {
          title: "Total Earnings",
          value: `${metrics.totalEarnings.toLocaleString()} kr`,
          icon: DollarSign,
          description: "Revenue earned",
          highlight: false,
        },
        {
          title: "Acceptance Rate",
          value: `${metrics.acceptanceRate}%`,
          icon: TrendingUp,
          description: "Jobs accepted",
          highlight: metrics.acceptanceRate >= 80,
        },
        {
          title: "On-Time Rate",
          value: `${metrics.onTimeRate}%`,
          icon: CheckCircle,
          description: "Delivery performance",
          highlight: metrics.onTimeRate >= 90,
        },
      ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden border-border bg-card transition-all hover:border-foreground/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-sm p-1.5 ${stat.highlight ? 'bg-foreground text-background' : 'bg-muted'}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold tracking-tight ${stat.highlight ? 'text-foreground' : ''}`}>
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
