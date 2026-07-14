interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercent?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function ProgressBar({ value, max, label, showPercent = true, variant = 'default' }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const autoVariant = variant === 'default'
    ? percent >= 100 ? 'success' : percent >= 50 ? 'warning' : 'danger'
    : variant;

  return (
    <div className="progress-bar">
      {(label || showPercent) && (
        <div className="progress-bar__header">
          {label && <span className="progress-bar__label">{label}</span>}
          {showPercent && <span className="progress-bar__percent">{percent}%</span>}
        </div>
      )}
      <div className="progress-bar__track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={`progress-bar__fill progress-bar__fill--${autoVariant}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
