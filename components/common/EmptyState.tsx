"use client";
import type { ComponentType } from "react";

export default function EmptyState({ icon: Icon, title, desc }: { icon: ComponentType<any>; title: string; desc?: string }) {
  return (
    <div className="border rounded-2xl p-8 text-center">
      <Icon className="w-8 h-8 mx-auto mb-2 text-gray-400"/>
      <div className="font-medium">{title}</div>
      {desc && <div className="text-sm text-gray-500 mt-1">{desc}</div>}
    </div>
  );
}
