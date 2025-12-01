'use client';

import { Car, CheckCircle2, MapPin } from 'lucide-react';
import React from 'react';

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
    <div className="w-full rounded-md bg-card border border-border p-4 md:p-6 pb-3 font-mono overflow-hidden">

      {/* Status chip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        {isFinal ? (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs uppercase tracking-wider font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 text-foreground border border-border text-xs uppercase tracking-wider font-semibold">
            <Car className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Next: <strong className="hidden sm:inline">{nextLabel}</strong></span>
          </span>
        )}
        <span className="text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Step {Math.min(idx + 1, count)} of {count}</span>
      </div>


      {/* Mobile simple list */}
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const state = nodeState(i);
          const Icon = stage.icon ?? MapPin;

          const isCompleted = state === 'done' || state === 'current';
          const isNext = state === 'next';
          const isCurrent = i === idx;

          return (
            <div
              key={stage.key}
              className={`flex items-center gap-3 p-3 rounded-md border ${isCompleted
                ? 'bg-primary/10 border-primary/20'
                : isNext
                  ? 'bg-muted/20 border-border'
                  : 'bg-card border-border opacity-50'
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCompleted
                  ? 'bg-primary border-primary text-primary-foreground'
                  : isNext
                    ? 'bg-muted/50 border-primary/50 text-foreground'
                    : 'bg-muted border-border text-muted-foreground'
                  }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-xs font-semibold uppercase tracking-wider ${isCompleted
                    ? 'text-primary'
                    : isNext
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                    }`}
                >
                  {stage.label}
                </div>
                {isCurrent && !isFinal && (
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    Current step
                  </div>
                )}
                {isCompleted && i < idx && (
                  <div className="text-[10px] uppercase tracking-wider text-primary/70 mt-0.5">
                    Completed
                  </div>
                )}
              </div>
              {isCurrent && !isFinal && (
                <Car className="w-5 h-5 text-primary flex-shrink-0" />
              )}
              {isCompleted && i < idx && (
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

}
