// components/pricing/PriceLabel.tsx
	import { Plan } from "@/app/data/plans";

export default function PriceLabel({ plan }: { plan: Plan }) {
  if (plan.billing === "free") {
    return <span className="text-3xl font-bold">Free</span>;
  }

  if (plan.billing === "trial") {
    return (
      <span className="text-3xl font-bold">
        ${plan.priceUSD}
        <span className="ml-1 text-sm font-normal text-gray-500">
          / {plan.trialDays}-day trial
        </span>
      </span>
    );
  }

  return (
    <span className="text-3xl font-bold">
      ${plan.priceUSD}
      <span className="ml-1 text-sm font-normal text-gray-500">
        /mo{plan.priceUSDPerUser ? ` (~$${plan.priceUSDPerUser}/user)` : ""}
      </span>
    </span>
  );
}