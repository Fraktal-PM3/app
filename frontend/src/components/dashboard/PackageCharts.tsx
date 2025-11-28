"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageMetrics, UserRole } from "@/providers";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
} from "recharts";
import { subDays, startOfWeek, subWeeks, format } from "date-fns";
import { TrendingUp, DollarSign, PieChartIcon, BarChart3 } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegendContent,
} from "../ui/chart";

type PackageChartsProps = {
  metrics: PackageMetrics;
  role: UserRole;
};

export function PackageCharts({ metrics, role }: PackageChartsProps) {
  const chartConfig = {
    count: {
      label: "Packages",
      color: "var(--foreground)",
    },
    amount: {
      label: "Amount",
      color: "var(--foreground)",
    },
  } satisfies ChartConfig;
  const financialLabel = role === "sender" ? "SPENDING" : "EARNINGS";
  const financialDescription =
    role === "sender" ? "Spending by week" : "Earnings by week";

  // compute axis tick labels to match the formatted data produced by the
  // `usePackageMetrics` helper (it formats dates as "MMM dd"). We only
  // compute ticks for display — we do not mutate or add data points.
  const dayTicks: string[] = Array.from({ length: 7 }).map((_, i) =>
    format(subDays(new Date(), 7 - 1 - i), "MMM dd")
  );

  const weekTicks: string[] = Array.from({ length: 4 }).map((_, i) =>
    format(startOfWeek(subWeeks(new Date(), 4 - 1 - i), { weekStartsOn: 1 }), "MMM dd")
  );

  // Build display-only datasets that include zeroed entries for missing ticks.
  // We don't mutate the original `metrics` — these are derived for rendering only.
  const renderPackagesOverTime = dayTicks.map((d) => {
    const found = metrics.packagesOverTime.find((p) => p.date === d);
    return found ?? { date: d, count: 0 };
  });

  const renderEarningsByWeek = weekTicks.map((w) => {
    const found = metrics.earningsByWeek.find((e) => e.week === w);
    return found ?? { week: w, amount: 0 };
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger
              value="timeline"
              className="font-mono text-xs data-[state=active]:bg-foreground data-[state=active]:text-background"
            >
              <TrendingUp className="mr-2 h-3 w-3" />
              TIMELINE
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="font-mono text-xs data-[state=active]:bg-foreground data-[state=active]:text-background"
            >
              <DollarSign className="mr-2 h-3 w-3" />
              {financialLabel}
            </TabsTrigger>
            <TabsTrigger
              value="status"
              className="font-mono text-xs data-[state=active]:bg-foreground data-[state=active]:text-background"
            >
              <PieChartIcon className="mr-2 h-3 w-3" />
              STATUS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-muted-foreground uppercase">
                Packages created over time
              </p>
              {metrics.packagesOverTime.length > 0 && (
                <p className="font-mono text-xs text-muted-foreground">
                  Last 7 days
                </p>
              )}
            </div>
            {metrics.packagesOverTime.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={renderPackagesOverTime}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    className="font-mono text-xs color-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    ticks={dayTicks}
                    tickCount={7}
                    tickFormatter={(value) => String(value)}
                  />

                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="w-[150px]"
                        nameKey="count"
                        labelFormatter={(value) => String(value)}
                      />
                    }
                  />
                  <Bar dataKey="count" fill="var(--color-count)" radius={8} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center border border-dashed border-border">
                <p className="font-mono text-xs text-muted-foreground">
                  NO DATA
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-muted-foreground uppercase">
                {financialDescription}
              </p>
              {metrics.earningsByWeek.length > 0 && (
                <p className="font-mono text-xs text-muted-foreground">
                  Last 4 weeks
                </p>
              )}
            </div>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              {metrics.earningsByWeek.length > 0 ? (
                <AreaChart data={renderEarningsByWeek}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="week"
                    className="font-mono text-xs"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    ticks={weekTicks}
                    tickFormatter={(value) => String(value)}
                  />
                  <YAxis
                    className="font-mono text-xs"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent className="w-[150px]" nameKey="amount" />}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-amount)"
                    fill="var(--color-amount)"
                    fillOpacity={0.12}
                    name={`Amount (kr)`}
                  />
                </AreaChart>
              ) : (
                <div className="flex h-[300px] items-center justify-center border border-dashed border-border">
                  <p className="font-mono text-xs text-muted-foreground">
                    NO DATA
                  </p>
                </div>
              )}
            </ChartContainer>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-muted-foreground uppercase">
                Package status distribution
              </p>
            </div>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              {metrics.statusDistribution.length > 0 ? (
                <PieChart>
                  <Pie
                    data={metrics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="hsl(var(--foreground))"
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {metrics.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend content={<ChartLegendContent />} />
                </PieChart>
              ) : (
                <div className="flex h-[300px] items-center justify-center border border-dashed border-border">
                  <p className="font-mono text-xs text-muted-foreground">
                    NO DATA
                  </p>
                </div>
              )}
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
