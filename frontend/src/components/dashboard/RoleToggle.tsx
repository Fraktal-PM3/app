"use client";

import { UserRole } from "@/hooks/useRoleDetection";
import { Truck, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type RoleToggleProps = {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
};

export function RoleToggle({ currentRole, onRoleChange }: RoleToggleProps) {
  return (
    <div className="flex items-center gap-3 border border-border bg-card px-3 py-2">
      <span className="font-mono text-xs uppercase text-muted-foreground">View</span>
      <button
        onClick={() => onRoleChange(currentRole === "sender" ? "transporter" : "sender")}
        className="relative flex h-8 w-40 items-center justify-center border border-border bg-muted"
      >
        {/* Text that changes */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRole}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center font-mono text-xs uppercase"
          >
            {currentRole === "sender" ? (
              <>
                <User className="mr-1.5 h-3.5 w-3.5" />
                Sender
              </>
            ) : (
              <>
                <Truck className="mr-1.5 h-3.5 w-3.5" />
                Transporter
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Small sliding handle */}
        <motion.div
          className="absolute h-6 w-3 bg-foreground"
          initial={false}
          animate={{
            left: currentRole === "sender" ? 4 : "calc(100% - 16px)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </button>
    </div>
  );
}
