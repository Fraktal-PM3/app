"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package } from "@/types/package";
import { User } from "lucide-react";

interface PackageContactCardProps {
  packageData: Package;
}

export function PackageContactCard({ packageData }: PackageContactCardProps) {
  if (!packageData.pii) return null;

  return (
    <Card className="border-border bg-card font-mono">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sender */}
        {(packageData.pii.senderName || packageData.pii.senderContact) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="uppercase tracking-wider">Sender</span>
            </div>
            {packageData.pii.senderName && (
              <div className="text-sm font-semibold break-words">
                {packageData.pii.senderName}
              </div>
            )}
            {packageData.pii.senderContact && (
              <div className="text-xs text-muted-foreground break-words">
                {packageData.pii.senderContact}
              </div>
            )}
          </div>
        )}

        {/* Recipient */}
        {(packageData.pii.recipientName || packageData.pii.recipientContact) && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="uppercase tracking-wider">Recipient</span>
              </div>
              {packageData.pii.recipientName && (
                <div className="text-sm font-semibold break-words">
                  {packageData.pii.recipientName}
                </div>
              )}
              {packageData.pii.recipientContact && (
                <div className="text-xs text-muted-foreground break-words">
                  {packageData.pii.recipientContact}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
