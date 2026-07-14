import { useMemo } from 'react';
import { MemberDefinition } from '../services/GitHubDataService';
import { useMetrics } from '../context/MetricsContext';
import { SectionHeader } from './components/SectionHeader';
import { StatCard } from './components/StatCard';
import { MetricBadge } from './components/MetricBadge';
import { LoadingState } from './components/LoadingState';
import { WeeklyGoalWidget } from './components/WeeklyGoalWidget';
import { formatMinutes } from '../utils/formatters';

interface OverviewPanelProps {
  members: MemberDefinition[];
}

export function OverviewPanel({ members }: OverviewPanelProps) {
  const { metrics, loading, refresh, lastFetchedAt } = useMetrics();

  const insights = useMemo(() => {
    if (!metrics) return [];

    const backlogStatuses = ['Backlog', 'Em espera', 'Em progresso', 'Em revisão'];
    const backlogCount = backlogStatuses.reduce(
      (sum, s) => sum + (metrics.issueCountByStatus[s] ?? 0),
      0,
    );
    const completedCount = metrics.issueCountByStatus['Finalizado'] ?? 0;
    const completionRate = metrics.totalIssues > 0
      ? Math.round((completedCount / metrics.totalIssues) * 100)
      : 0;
    const reworkRate = metrics.totalIssues > 0
      ? Math.round((metrics.totalReopened / metrics.totalIssues) * 100)
      : 0;

    const topSprint = Object.entries(metrics.sprintSummary)
      .sort(([, a], [, b]) => b.total - a.total)[0];

    const badges: Array<{ label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = [];

    badges.push({
      label: `Taxa de conclusão: ${completionRate}%`,
      variant: completionRate >= 70 ? 'success' : completionRate >= 40 ? 'warning' : 'danger',
    });

    badges.push({
      label: `Retrabalho: ${reworkRate}%`,
      variant: reworkRate <= 10 ? 'success' : reworkRate <= 25 ? 'warning' : 'danger',
    });

    if (topSprint) {
      badges.push({ label: `Sprint mais movimentada: ${topSprint[0]} (${topSprint[1].total} issues)`, variant: 'info' });
    }

    badges.push({
      label: `${backlogCount} issues em andamento`,
      variant: backlogCount <= 5 ? 'success' : 'warning',
    });

    return badges;
  }, [metrics]);

  if (loading) return <LoadingState message="Carregando visão geral..." />;

  if (!metrics) {
    return (
      <section>
        <SectionHeader title="Visão geral" description="Resumo das métricas da organização Fixai-Inter." />
        <div className="card">
          <p>Faça login com GitHub para carregar os dados.</p>
        </div>
      </section>
    );
  }

  const taskCount = metrics.normalizedIssues.filter((i) => i.isTask).length;
  const completedCount = metrics.issueCountByStatus['Finalizado'] ?? 0;
  const completionRate = metrics.totalIssues > 0
    ? Math.round((completedCount / metrics.totalIssues) * 100)
    : 0;
  const reworkRate = metrics.totalIssues > 0
    ? Math.round((metrics.totalReopened / metrics.totalIssues) * 100)
    : 0;

  return (
    <section>
      <SectionHeader
        title="Visão geral"
        description="Resumo das métricas da organização Fixai-Inter (2° Ano)."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastFetchedAt && (
              <span style={{ fontSize: '0.8rem', color: 'var(--fixa-gray)' }}>
                Atualizado {lastFetchedAt.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button type="button" className="btn-refresh" onClick={refresh}>
              Atualizar
            </button>
          </div>
        }
      />

      <div className="insights-row">
        {insights.map((insight) => (
          <MetricBadge key={insight.label} label={insight.label} variant={insight.variant} />
        ))}
      </div>

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <StatCard label="Issues 2° Ano" value={metrics.filteredIssueCount} subtitle={`${metrics.rawIssueCount} totais na org`}/>
        <StatCard label="Horas registradas" value={formatMinutes(metrics.totalMinutesWorked)} subtitle={`${metrics.issuesWithHoursField} issues com horas`} />
        <StatCard label="Tasks" value={taskCount}/>
        <StatCard label="Reaberturas" value={metrics.totalReopened} variant={metrics.totalReopened > 5 ? 'danger' : 'default'}/>
        <StatCard label="Taxa conclusão" value={`${completionRate}%`} subtitle={`${completedCount} finalizadas`} variant={completionRate >= 70 ? 'success' : 'warning'}/>
        <StatCard label="Taxa retrabalho" value={`${reworkRate}%`} variant={reworkRate <= 10 ? 'success' : 'warning'}/>
      </div>

      <WeeklyGoalWidget members={members} />
    </section>
  );
}
