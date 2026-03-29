'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  trend?: string;
  trendPositive?: boolean;
  color?: 'purple' | 'blue' | 'cyan' | 'red' | 'green';
  delay?: number;
}

const colorMap = {
  purple: 'from-purple-500/30 to-purple-500/10',
  blue: 'from-blue-500/30 to-blue-500/10',
  cyan: 'from-cyan-500/30 to-cyan-500/10',
  red: 'from-red-500/30 to-red-500/10',
  green: 'from-green-500/30 to-green-500/10',
};

const iconColorMap = {
  purple: 'text-purple-400',
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  red: 'text-red-400',
  green: 'text-green-400',
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendPositive = true,
  color = 'purple',
  delay = 0,
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === 'string') return;

    const duration = 1;
    const steps = 30;
    const stepValue = value / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setDisplayValue(Math.min(step * stepValue, value));
      if (step >= steps) clearInterval(interval);
    }, (duration * 1000) / steps);

    return () => clearInterval(interval);
  }, [value]);

  const displayText = typeof value === 'string' ? value : Math.floor(displayValue).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ translateY: -4 }}
      className="group"
    >
      <div className={`bg-gradient-to-br ${colorMap[color]} backdrop-blur-md border border-purple-500/20 rounded-xl p-6 glow-card hover:border-purple-500/40 transition-all overflow-hidden relative`}>
        {/* Background grid effect */}
        <div className="absolute inset-0 cyber-grid opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <motion.div
              className={`p-3 bg-gradient-to-br from-current/20 rounded-lg ${iconColorMap[color]}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Icon className="w-6 h-6" />
            </motion.div>
            {trend && (
              <motion.span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  trendPositive
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + 0.3 }}
              >
                {trendPositive ? '↑' : '↓'} {trend}
              </motion.span>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <motion.p
              className="text-3xl font-bold text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
            >
              {displayText}
            </motion.p>
          </div>
        </div>

        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity"
          animate={{ x: ['0%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
}
