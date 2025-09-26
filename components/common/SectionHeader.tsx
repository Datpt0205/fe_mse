"use client";
import type { ComponentType } from "react";

export default function SectionHeader({ icon: Icon, title, desc }: { icon: ComponentType<any>; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-xl bg-gray-100"><Icon className="w-5 h-5" /></div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {desc && <p className="text-sm text-gray-500">{desc}</p>}
      </div>
    </div>
  );
}
