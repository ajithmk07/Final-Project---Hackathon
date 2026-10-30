import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  FileSearch,
  Flame,
  MinusCircle,
  ShieldAlert,
  Square,
  UserCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { PriorityLevel, WorkflowStatus } from '../types/civic';

/**
 * Accessible priority indicator using new distinct symbols + explicit text + tabular score.
 * Critical: Hazard Diamond with flame / exclamation badge.
 * High: Alert Triangle with high-contrast warning icon.
 * Medium: Balanced Square.
 * Low: Steady Circle.
 */
export function PriorityIndicator({
  level,
  score,
  showScore = true,
  manualOverride = false,
  safetyOverride = false,
}: {
  level: PriorityLevel;
  score?: number;
  showScore?: boolean;
  manualOverride?: boolean;
  safetyOverride?: boolean;
}) {
  const config: Record<
    PriorityLevel,
    {
      textClass: string;
      badgeClass: string;
      Icon: React.ComponentType<{ className?: string }>;
      symbolLabel: string;
    }
  > = {
    Critical: {
      textClass: 'text-red-700',
      badgeClass: 'bg-red-50 border-red-200 text-red-800',
      Icon: AlertOctagon,
      symbolLabel: 'Critical Hazard (◆ !)',
    },
    High: {
      textClass: 'text-orange-700',
      badgeClass: 'bg-orange-50 border-orange-200 text-orange-800',
      Icon: AlertTriangle,
      symbolLabel: 'High Priority (▲)',
    },
    Medium: {
      textClass: 'text-amber-700',
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-800',
      Icon: Square,
      symbolLabel: 'Medium (■)',
    },
    Low: {
      textClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      Icon: Circle,
      symbolLabel: 'Low (●)',
    },
  };

  const { textClass, badgeClass, Icon, symbolLabel } = config[level] ?? config.Low;

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-xs ${textClass} whitespace-nowrap`}>
      <span className="relative flex items-center justify-center">
        {level === 'Critical' && (
          <span className="absolute -inset-0.5 rounded-full bg-red-400 opacity-40 animate-ping" />
        )}
        <Icon className="w-3.5 h-3.5 shrink-0 relative" aria-hidden="true" />
      </span>
      <span>{level}</span>
      {showScore && score !== undefined && (
        <span className="font-mono tabular-nums text-slate-600 font-normal">
          · {score}/100
        </span>
      )}
      {safetyOverride && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200" title="Safety Hazard Override Active">
          <Flame className="w-3 h-3 text-red-600" />
          Safety Override
        </span>
      )}
      {manualOverride && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="Manual Officer Override Active">
          <ShieldAlert className="w-3 h-3 text-blue-600" />
          Officer Override
        </span>
      )}
    </span>
  );
}

/**
 * Accessible workflow status label with distinct semantic icon.
 */
export function StatusIndicator({ status }: { status: WorkflowStatus }) {
  const map: Record<
    WorkflowStatus,
    { textClass: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    Submitted: { textClass: 'text-slate-700', Icon: Clock },
    'Under Review': { textClass: 'text-blue-700', Icon: FileSearch },
    Assigned: { textClass: 'text-indigo-700', Icon: UserCheck },
    'In Progress': { textClass: 'text-amber-700', Icon: Wrench },
    Resolved: { textClass: 'text-emerald-700', Icon: CheckCircle2 },
    Rejected: { textClass: 'text-slate-500', Icon: XCircle },
  };

  const { textClass, Icon } = map[status] ?? map.Submitted;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textClass} whitespace-nowrap`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
