"use client";

import { motion } from "motion/react";
import { Grid2x2, LayoutList } from "lucide-react";

type CalendarLayout = "2col" | "1col";

interface CalendarLayoutToggleProps {
  layout: CalendarLayout;
  onLayoutChange: (layout: CalendarLayout) => void;
}

const OPTIONS: { value: CalendarLayout; icon: typeof Grid2x2; label: string }[] = [
  { value: "2col", icon: Grid2x2, label: "2 columns" },
  { value: "1col", icon: LayoutList, label: "1 column" },
];

export function CalendarLayoutToggle({ layout, onLayoutChange }: CalendarLayoutToggleProps) {
  return (
    <div className="sm:hidden inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/50">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => onLayoutChange(value)}
          className="relative z-10 flex items-center justify-center w-7 h-7 rounded-md transition-colors"
          aria-label={label}
          aria-pressed={layout === value}
        >
          {layout === value && (
            <motion.div
              layoutId="calendar-layout-indicator"
              className="absolute inset-0 rounded-md bg-background shadow-sm border border-border/30"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <Icon
            size={14}
            className={`relative z-10 transition-colors ${
              layout === value
                ? "text-foreground"
                : "text-muted-foreground/60"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
