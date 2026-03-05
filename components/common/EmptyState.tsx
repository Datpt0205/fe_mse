"use client";
import type { ComponentType } from "react";

export default function EmptyState({ icon: Icon, title, desc }: { icon: ComponentType<any>; title: string; desc?: string }) {
  return (
    <div className="card-elevated p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[hsl(220,14%,94%)] mb-4">
        <Icon className="w-7 h-7 text-[hsl(220,10%,56%)]"/>
      </div>
      <div className="font-semibold text-[hsl(220,20%,14%)]">{title}</div>
      {desc && <div className="text-sm text-[hsl(220,10%,56%)] mt-1.5 max-w-xs mx-auto">{desc}</div>}
    </div>
  );
}
