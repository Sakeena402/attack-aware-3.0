// components/pricing/PricingPreview.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { plans, landingPreviewIds } from '@/app/data/plans';
import PricingCard from './PricingCard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export default function PricingPreview() {
  const preview = plans.filter((p) => landingPreviewIds.includes(p.id));

  return (
    <section className="py-24 px-4 bg-background" id="pricing">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6"
          >
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-purple-600 dark:text-purple-300 font-medium">
              Flexible Pricing Plans
            </span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold font-poppins mb-6 text-foreground"
          >
            Simple pricing, built for SMEs
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Start free and scale as your organization grows.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {preview.map((plan) => (
            <motion.div key={plan.id} variants={itemVariants}>
              <PricingCard plan={plan} context="preview" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <Link href="/pricing">
            <Button
              variant="outline"
              className="border-border hover:bg-muted px-8 py-6 text-base rounded-lg text-foreground"
            >
              Explore more plans
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}