"use client";

import { motion } from "framer-motion";
import { Circle } from "lucide-react";

type RealtimeIndicatorProps = {
  isConnected: boolean;
};

export function RealtimeIndicator({ isConnected }: RealtimeIndicatorProps) {
  return (
    <div className="flex items-center gap-2 border border-border bg-card px-3 py-1.5">
      {isConnected ? (
        <>
          <motion.div
            className="relative flex h-2 w-2"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Circle className="h-2 w-2 fill-foreground" />
          </motion.div>
          <span className="font-mono text-xs uppercase tracking-wider">Live</span>
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full border border-muted-foreground" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Offline</span>
        </>
      )}
    </div>
  );
}
