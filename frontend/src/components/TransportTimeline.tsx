'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Car, MapPin } from 'lucide-react';

export type Stage = {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
};

type Props = {
  stages: Stage[];            
  currentKey: string;         // current stage key
  onStageChange?: (key: string) => void; // click a node to jump
};

export function TransportTimeline({ stages, currentKey, onStageChange }: Props) {
  const count = stages.length;
  const idx = Math.max(0, stages.findIndex((s) => s.key === currentKey));
  const segWidthPct = count > 1 ? 100 / (count - 1) : 0;

  const isFinal = idx >= count - 1;
  // Car sits halfway to the next when in transit; at the last stage it sits on the final node.
  const carProgressIndex = isFinal ? idx : idx + 0.5;
  const carLeftPct = (carProgressIndex / (count - 1)) * 100;

  const nextLabel = !isFinal ? stages[idx + 1].label : null;

  const nodeState = (i: number) => {
    if (i < idx) return 'done' as const;
    if (i === idx) return isFinal ? 'done' : 'current';
    if (i === idx + 1 && !isFinal) return 'next' as const; // highlight upcoming in yellow
    return 'future' as const;
  };

  return (
    <div className="w-full rounded-2xl bg-white shadow-sm border border-gray-200 p-23 pb-3">

      {/* Status chip */}
      <div className="flex items-center justify-between mb-6">
        {isFinal ? (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-sm">
            ✅ Completed
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200 text-sm">
            <Car className="w-4 h-4" />
            Next step <strong>{nextLabel}</strong>
          </span>
        )}
        <span className="text-xs text-gray-500">Step {Math.min(idx + 1, count)} of {count}</span>
      </div>

      {/* Road - INCREASED HEIGHT */}
      <div className="relative w-full h-48 select-none">
        {/* Base road */}
        <div className="absolute left-0 right-0 top-1/3 -translate-y-1/2 h-3 rounded-full bg-gray-300" />

        {/* Painted progress on the road (green) */}
        {Array.from({ length: Math.max(0, count - 1) }).map((_, i) => {
          const leftPct = (i / (count - 1)) * 100;
          const widthPct = segWidthPct;

          let greenPct = 0;
          if (i < idx) greenPct = 100;
          else if (i === idx && !isFinal) greenPct = 50;
          else if (i === idx && isFinal) greenPct = 100;

          return (
            <div
              key={`seg-${i}`}
              className="absolute top-1/3 -translate-y-1/2 h-3"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            >
              <motion.div
                className="h-3 rounded-full bg-green-500"
                initial={false}
                animate={{ width: `${greenPct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              />
            </div>
          );
        })}

        {/* Milestones */}
        {stages.map((stage, i) => {
          const leftPct = (i / (count - 1)) * 100;
          const state = nodeState(i);
          const Icon = stage.icon ?? MapPin;

          const dotClasses =
            state === 'next'
              ? 'bg-yellow-400 border-yellow-500'
              : state === 'done' || state === 'current'
              ? 'bg-green-500 border-green-600'
              : 'bg-gray-200 border-gray-300';

          const labelClasses =
            state === 'next'
              ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
              : state === 'done' || state === 'current'
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-white border-gray-200 text-gray-700';

          return (
            <div
              key={stage.key}
              className="absolute top-1/3 -translate-y-1/2"
              style={{ left: `${leftPct}%` }}
            >
              <button
                onClick={() => onStageChange?.(stage.key)}
                className="relative -translate-x-1/2 focus:outline-none"
                aria-label={stage.label}
              >
                <div className={`w-8 h-8 rounded-full border-2 shadow-sm ${dotClasses}`} />
                <div className="absolute left-1/2 mt-4" style={{ transform: 'translateX(-50%)' }}>
                  <div className={`flex items-center gap-1 px-2 py-1.5 rounded-md border shadow-sm text-sm font-medium whitespace-nowrap ${labelClasses}`}>
                    <Icon className="w-4 h-4" />
                    <span>{stage.label}</span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}

        {/* Car moving */}
        <motion.div
          className="absolute top-1/3 -translate-y-1/2 -translate-x-1/2"
          initial={false}
          animate={{ left: `${carLeftPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <motion.div
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md"
            animate={{ y: [0, -1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
            aria-label="car"
          >
            <Car className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );

}
