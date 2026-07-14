import { useMemo } from 'react';
import { MemberDefinition } from '../../services/GitHubDataService';
import { computeWeeklyStatuses, getISOWeekKey } from '../../services/WeeklyHoursService';
import { useMetrics } from '../../context/MetricsContext';
import { MetricBadge } from './MetricBadge';
import { ProgressBar } from './ProgressBar';
import { formatMinutes } from '../../utils/formatters';
import { getInitials } from '../../utils/formatters';

interface WeeklyGoalWidgetProps {
  members: MemberDefinition[];
}

export function WeeklyGoalWidget({ members }: WeeklyGoalWidgetProps) {
  const { metrics } = useMetrics();

  const { statuses, isBaselineEstablishing } = useMemo(() => {
    if (!metrics) return { statuses: [], isBaselineEstablishing: false };
    return computeWeeklyStatuses(metrics, members);
  }, [metrics, members]);

  if (!metrics) return null;

  const metCount = statuses.filter((s) => s.metGoal).length;
  const weekKey = getISOWeekKey();

  return (
    <div className="weekly-goal">
      <div className="weekly-goal__header">
        <h3>Meta semanal — 3 horas por integrante</h3>
        <MetricBadge
          label={`${metCount}/${statuses.length} cumpriram`}
          variant={metCount === statuses.length ? 'success' : metCount === 0 ? 'danger' : 'warning'}
        />
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--fixa-gray)' }}>
        Semana {weekKey}
      </p>

      {isBaselineEstablishing && (
        <div className="weekly-goal__notice">
          Baseline da semana sendo estabelecida. Valores provisórios usam heurística de atividade recente.
        </div>
      )}

      <div className="weekly-goal__list">
        {statuses.map((status) => (
          <div key={status.login} className="weekly-goal__item">
            {status.avatarUrl ? (
              <img src={status.avatarUrl} alt={status.name} className="weekly-goal__item-avatar" />
            ) : (
              <div className="member-card__avatar-fallback" style={{ width: 40, height: 40, fontSize: '0.85rem' }}>
                {getInitials(status.name)}
              </div>
            )}
            <div className="weekly-goal__item-info">
              <p className="weekly-goal__item-name">{status.name}</p>
              <ProgressBar
                value={status.weeklyMinutes}
                max={status.goalMinutes}
                label={`${formatMinutes(status.weeklyMinutes)} / 3h`}
                showPercent={false}
                variant={status.metGoal ? 'success' : 'danger'}
              />
            </div>
            <MetricBadge
              label={status.metGoal ? 'Meta cumprida' : `Faltam ${formatMinutes(status.remainingMinutes)}`}
              variant={status.metGoal ? 'success' : 'danger'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
