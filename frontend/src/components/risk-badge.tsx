import React from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RiskLevel } from '@/lib/mock-api';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = {
    '高风险': { color: 'risk-high', icon: ShieldAlert, label: '高风险' },
    '中风险': { color: 'risk-mid', icon: Activity, label: '中等风险' },
    '低风险': { color: 'risk-low', icon: ShieldCheck, label: '安全 / 低风险' },
    '未检测': { color: 'risk-none', icon: ShieldQuestion, label: '待处理' },
  };

  const { color, icon: Icon, label } = config[level] || config['未检测'];

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 flex items-center gap-1.5 font-medium border shadow-sm", color, className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
