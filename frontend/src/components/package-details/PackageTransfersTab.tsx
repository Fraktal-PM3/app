"use client";

import { executeTransfer } from "@/app/packages/[id]/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transfer } from "@/types/package";
import { format } from "date-fns";
import { Truck } from "lucide-react";
import { Button } from "../ui/button";

interface PackageTransfersTabProps {
  transfers: Transfer[];
}

export function PackageTransfersTab({ transfers }: PackageTransfersTabProps) {
  const getTransferStatusBadge = (status: string) => {
    const variants = {
      proposed: "secondary",
      accepted: "default",
      executed: "outline",
      rejected: "destructive",
    } as const;

    return (
      <Badge
        variant={variants[status as keyof typeof variants] || "secondary"}
        className="font-mono text-xs"
      >
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleExecuteTransfer = async (transferId: string, externalId: string) => {
    await executeTransfer(transferId, externalId);
  }

  return (
    <Card className="border-border bg-card font-mono">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          Transfer History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="py-12 text-center">
            <Truck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              No transfers yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div
                key={transfer._id}
                className="rounded-md border border-border bg-muted/20 p-4"
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-mono text-xs text-muted-foreground break-all">
                      {transfer.transferId}
                    </div>
                    {transfer.createdAt && (
                      <div className="text-xs text-muted-foreground">
                        {format(
                          new Date(transfer.createdAt),
                          "MMM dd, yyyy HH:mm"
                        )}
                      </div>
                    )}
                  </div>
                  {getTransferStatusBadge(transfer.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wider">
                      From MSP
                    </div>
                    <div className="mt-1 font-semibold break-words">
                      {transfer.fromMSP}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase tracking-wider">
                      To MSP
                    </div>
                    <div className="mt-1 font-semibold break-words">
                      {transfer.toMSP}
                    </div>
                  </div>
                </div>

                {transfer.price && (
                  <div className="mt-3 rounded-md bg-background p-2 text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Price
                    </div>
                    <div className="text-lg font-bold">{transfer.price} kr</div>
                  </div>
                )}

                {transfer.status === "accepted" && (
                  <Button
                    className="mt-2"
                    onClick={() => handleExecuteTransfer(transfer.transferId, transfer.externalId)}
                  >
                    Execute Transfer
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
