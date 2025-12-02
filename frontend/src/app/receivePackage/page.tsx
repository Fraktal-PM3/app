"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransfers } from "@/providers";
import { motion } from "framer-motion";
import { Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { RealtimeIndicator } from "@/components/dashboard/RealtimeIndicator";

export default function ReceivePackagesPage() {
  const { transfers, isLoading, isConnected, error } = useTransfers();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROPOSED":
        return "border-yellow-500 bg-yellow-500/10 text-yellow-500";
      case "ACCEPTED":
        return "border-blue-500 bg-blue-500/10 text-blue-500";
      case "EXECUTED":
        return "border-green-500 bg-green-500/10 text-green-500";
      default:
        return "border-muted bg-muted/10 text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PROPOSED":
        return <Clock className="h-4 w-4" />;
      case "ACCEPTED":
      case "EXECUTED":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

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

  if (isLoading) {
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
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[300px]" />
            ))}
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
          title="Transfer Proposals"
          subtitle="Free transfer proposals (price = 0)"
          icon={Package}
          breadcrumbLabels={{
            receivePackage: "Receive Package",
          }}
          rightContent={<RealtimeIndicator isConnected={isConnected} />}
        />

        <Separator className="bg-border" />

        {/* Transfers List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {transfers.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-mono text-sm font-bold uppercase">
                No Transfer Proposals
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                Free transfer proposals will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {transfers.map((transfer, index) => (
                <TransferCard
                  key={transfer._id}
                  transfer={transfer}
                  index={index}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function TransferCard({
  transfer,
  index,
  getStatusColor,
  getStatusIcon,
}: {
  transfer: any;
  index: number;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-border bg-card transition-all hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <CardTitle className="font-mono text-sm font-bold uppercase tracking-wider">
                Transfer Proposal
              </CardTitle>
              <p className="font-mono text-xs text-muted-foreground break-all">
                ID: {transfer.transferId}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 whitespace-nowrap font-mono text-xs ${getStatusColor(transfer.status)}`}
            >
              {getStatusIcon(transfer.status)}
              {transfer.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 font-mono text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Package ID:</span>
              <Link
                href={`/packages/${transfer.externalId}`}
                className="font-bold hover:text-primary break-all text-right"
              >
                {transfer.externalId}
              </Link>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">From MSP:</span>
              <span className="font-bold break-all text-right">
                {transfer.fromMSP}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Received:</span>
              <span className="font-bold">
                {new Date(transfer.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 font-mono"
              asChild
            >
              <Link href={`/packages/${transfer.externalId}`}>
                View Package
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}