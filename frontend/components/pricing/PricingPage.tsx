// components/pricing/PricingPage.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { plans, PlanCategory } from "@/app/data/plans";
import PricingCard from "./PricingCard";
import PricingTabs from "./PricingTabs";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function PricingPage({
  initialTab = "individual",
}: {
  initialTab?: PlanCategory;
}) {
  const [active, setActive] = useState<PlanCategory>(initialTab);
  const visible = plans.filter((p) => p.category === active);

  return (
    <section className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold font-poppins mb-4 text-foreground"
          >
            Plans for every stage
          </motion.h1>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground">
            From free individual training to full enterprise rollouts.
          </motion.p>
        </motion.div>

        <PricingTabs active={active} onChange={setActive} />

        <motion.div
          key={active}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`grid grid-cols-1 gap-6 ${
            active === "enterprise"
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 max-w-2xl mx-auto"
          }`}
        >
          {visible.map((plan) => (
            <motion.div key={plan.id} variants={itemVariants}>
              <PricingCard plan={plan} context="full"/>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}