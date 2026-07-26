// components/pricing/PricingTabs.tsx
"use client";

import { PlanCategory } from "@/app/data/plans";

interface Props {
  active: PlanCategory;
  onChange: (category: PlanCategory) => void;
}

export default function PricingTabs({ active, onChange }: Props) {
  const tabs: { key: PlanCategory; label: string }[] = [
    { key: "individual", label: "Individual" },
    { key: "enterprise", label: "Enterprise" },
  ];

  return (
    <div className="mb-12 flex justify-center gap-1 rounded-full bg-muted/60 soft-border p-1 w-fit mx-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
            active === tab.key
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}