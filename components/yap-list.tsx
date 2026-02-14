"use client";

import { type Yap } from "@/hooks/use-yaps";
import { YapCard } from "./yap-card";
import { useMemo } from "react";

interface YapListProps {
  yaps: Yap[];
  onTapYap: (id: string) => void;
  onDeleteYap: (id: string) => void;
}

interface GroupedYaps {
  label: string;
  yaps: Yap[];
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const yapDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (yapDate.getTime() === today.getTime()) return "Today";
  if (yapDate.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year:
      date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function YapList({ yaps, onTapYap, onDeleteYap }: YapListProps) {
  const grouped = useMemo(() => {
    const groups: GroupedYaps[] = [];
    const groupMap = new Map<string, Yap[]>();

    for (const yap of yaps) {
      const label = getDateLabel(yap.created_at);
      if (!groupMap.has(label)) {
        groupMap.set(label, []);
      }
      groupMap.get(label)!.push(yap);
    }

    for (const [label, groupYaps] of groupMap) {
      groups.push({ label, yaps: groupYaps });
    }

    return groups;
  }, [yaps]);

  if (yaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <p className="text-lg text-text-secondary">No yaps yet</p>
        <p className="mt-1 text-sm text-text-secondary">
          Tap the mic button to start recording
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {grouped.map((group) => (
        <div key={group.label} className="mb-4">
          <h2 className="px-4 pb-2 pt-3 text-sm font-bold text-foreground">
            {group.label}
          </h2>
          <div className="mx-4 overflow-hidden rounded-xl bg-surface">
            {group.yaps.map((yap, i) => (
              <YapCard
                key={yap.id}
                yap={yap}
                onTap={onTapYap}
                onDelete={onDeleteYap}
                isLast={i === group.yaps.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
