"use client";
import type { ComponentType } from "react";

export default function SectionHeader({ icon: Icon, title, desc }: { icon: ComponentType<any>; title: string; desc?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(226,85%,96%)] via-white to-[hsl(38,100%,94%)] shadow-sm ring-1 ring-white/80">
        <Icon className="h-5 w-5 text-[hsl(226,65%,42%)]" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[hsl(220,20%,14%)]">{title}</h2>
        {desc && <p className="text-sm text-[hsl(220,10%,42%)]">{desc}</p>}
      </div>
    </div>
  );
}
