interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  icon?: string;
}

export function StatCard({ label, value, subtitle, variant = 'default', icon }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${variant}`}>
      {icon && <span className="stat-card__icon" aria-hidden="true">{icon}</span>}
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {subtitle && <p className="stat-card__subtitle">{subtitle}</p>}
    </article>
  );
}
