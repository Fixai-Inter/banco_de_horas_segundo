interface MetricBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}

export function MetricBadge({ label, variant = 'neutral' }: MetricBadgeProps) {
  return <span className={`metric-badge metric-badge--${variant}`}>{label}</span>;
}
