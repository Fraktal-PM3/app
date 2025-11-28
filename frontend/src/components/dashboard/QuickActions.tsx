"use client";

import { Card, CardContent } from "@/components/ui/card";
import { UserRole } from "@/providers";
import Link from "next/link";
import {
  Package,
  Send,
  MessageSquare,
  LayoutDashboard,
  Search,
  ArrowRight,
} from "lucide-react";

type QuickActionsProps = {
  role: UserRole;
};

export function QuickActions({ role }: QuickActionsProps) {
  const senderActions = [
    {
      title: "Send Package",
      description: "Create a new shipment",
      icon: Send,
      href: "/createPackage",
      primary: true,
    },
    {
      title: "My Packages",
      description: "Manage & announce packages",
      icon: Package,
      href: "/my-packages",
      primary: false,
    },
    {
      title: "Messages",
      description: "Check your inbox",
      icon: MessageSquare,
      href: "/messages",
      primary: false,
    },
  ];

  const transporterActions = [
    {
      title: "Available Jobs",
      description: "Browse packages to transport",
      icon: Search,
      href: "/offers",
      primary: true,
    },
    {
      title: "Active Deliveries",
      description: "Manage current jobs",
      icon: Package,
      href: "/activePackage",
      primary: false,
    },
    {
      title: "Messages",
      description: "Check your inbox",
      icon: MessageSquare,
      href: "/messages",
      primary: false,
    },
  ];

  const actions = role === "sender" ? senderActions : transporterActions;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.title} href={action.href} className="group">
            <Card
              className={`h-full border transition-all ${action.primary ? "border-foreground bg-foreground text-background hover:bg-foreground/90" : "border-border bg-card hover:border-foreground/20 hover:bg-muted/30"}`}
            >
              <CardContent className="flex h-full flex-col items-start gap-3 p-4">
                <div className="flex w-full items-center justify-between">
                  <Icon className="h-5 w-5" />
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
                <div className="flex-1">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider mb-1">
                    {action.title}
                  </h3>
                  <p
                    className={`text-xs font-mono ${action.primary ? "text-background/70" : "text-muted-foreground"}`}
                  >
                    {action.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
