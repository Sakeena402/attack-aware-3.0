// components/pricing/PricingCard.tsx
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Plan } from "@/app/data/plans";

interface Props {
  plan: Plan;
  context?: "preview" | "full"; // preview = landing page teaser, full = /pricing page
}

function getCta(plan: Plan, context: "preview" | "full") {
  // Landing-page teaser: always point into the full pricing page
  if (context === "preview") {
    return {
      label: plan.category === "enterprise" ? "Explore Enterprise Plans" : plan.name === "Basic" ? "Get Started Free" : "Subscribe",
      href: plan.category === "enterprise" ? "/pricing?tab=enterprise" : "/register",
    };
  }

  // Full pricing page: real action per plan
  if (plan.billing === "free") return { label: "Get Started Free", href: "/register" };
  if (plan.billing === "trial") return { label: "Start Free Trial", href: `/register?plan=${plan.id}` };
  if (plan.category === "enterprise") return { label: "Talk to Sales", href: `/contact?plan=${plan.id}` };
  return { label: "Subscribe", href: `/register?plan=${plan.id}` };
}

export default function PricingCard({ plan, context = "full" }: Props) {
  const cta = getCta(plan, context);

  const priceDisplay = plan.billing === "free" ? "Free" : `$${plan.priceUSD}`;
  const periodDisplay =
    plan.billing === "monthly"
      ? `/month${plan.priceUSDPerUser ? ` (~$${plan.priceUSDPerUser}/user)` : ""}`
      : plan.billing === "trial"
      ? `/ ${plan.trialDays}-day trial`
      : "";

  return (
    <div
      className={`relative flex flex-col p-8 rounded-2xl transition-all ${
        plan.highlight
          ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-2xl shadow-purple-500/25 border-0"
          : "bg-card soft-border hover:border-purple-400/40 hover:shadow-lg"
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-white text-purple-700 px-4 py-1 rounded-full text-sm font-bold shadow-md">
            Most Popular
          </span>
        </div>
      )}

      <h3 className={`text-2xl font-bold font-poppins mb-1 ${plan.highlight ? "text-white" : "text-foreground"}`}>
        {plan.name}
      </h3>
      <p className={`text-sm mb-6 ${plan.highlight ? "text-white/90" : "text-muted-foreground"}`}>
        {plan.description}
      </p>

      <div className="mb-1">
        <span className={`text-5xl font-bold ${plan.highlight ? "text-white" : "text-foreground"}`}>
          {priceDisplay}
        </span>
        {periodDisplay && (
          <span className={`text-sm ml-1 ${plan.highlight ? "text-white/80" : "text-muted-foreground"}`}>
            {periodDisplay}
          </span>
        )}
      </div>
      <p className={`text-xs mb-8 ${plan.highlight ? "text-white/80" : "text-muted-foreground"}`}>
        {plan.seats === 1 ? "1 user" : `${plan.seats} seats`}
      </p>

      <Link href={cta.href}>
        <button
          className={`w-full py-3 rounded-lg font-semibold transition-all mb-8 ${
            plan.highlight
              ? "bg-white text-purple-700 hover:bg-white/90"
              : "border border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
          }`}
        >
          {cta.label}
        </button>
      </Link>

      <ul className="space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className={`flex items-start gap-3 text-sm ${plan.highlight ? "text-white/95" : "text-foreground/90"}`}>
            <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-white" : "text-purple-500"}`} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}