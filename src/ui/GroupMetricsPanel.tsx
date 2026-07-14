import { useMemo } from 'react';
import { useMetrics } from '../context/MetricsContext';
import { SectionHeader } from './components/SectionHeader';
import { StatCard } from './components/StatCard';
import { LoadingState } from './components/LoadingState';
import { formatDurationMinutes } from '../utils/formatters';

function getStatusChipClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('backlog')) return 'status-chip--backlog';
  if (normalized.includes('espera')) return 'status-chip--espera';
  if (normalized.includes('progresso')) return 'status-chip--progresso';
  if (normalized.includes('revis')) return 'status-chip--revisao';
  if (normalized.includes('finaliz')) return 'status-chip--finalizado';
  return 'status-chip--default';
}

export function GroupMetricsPanel() {
  const { metrics, loading } = useMetrics();

  const stats = useMemo(() => {
    if (!metrics) return null;

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

    return { backlogCount, completedCount, completionRate, reworkRate };
  }, [metrics]);

  if (loading) return <LoadingState message="Carregando métricas de grupo..." />;

  if (!metrics || !stats) {
    return (
      <section>
        <SectionHeader title="Métricas por grupo" description="Análise de sprint, conclusão e retrabalho." />
        <div className="card"><p>Faça login para carregar as métricas.</p></div>
      </section>
    );
  }

  const sprintEntries = Object.entries(metrics.sprintSummary).sort(([, a], [, b]) => b.total - a.total);

  return (
    <section>
      <SectionHeader
        title="Métricas por grupo"
        description="Análise de sprint, conclusão e retrabalho da Fixai-Inter."
      />

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total issues" value={metrics.totalIssues}/>
        <StatCard label="Finalizadas" value={stats.completedCount} variant="success"/>
        <StatCard label="Em andamento" value={stats.backlogCount} variant="warning"/>
        <StatCard label="Reaberturas" value={metrics.totalReopened} variant={metrics.totalReopened > 5 ? 'danger' : 'default'}/>
      </div>

      <div className="grid-columns grid-columns--2">
        <article className="card">
          <h3>Sprints — issues abertas e entregas</h3>
          {sprintEntries.length === 0 ? (
            <p>Sem dados de sprint disponíveis.</p>
          ) : (
            sprintEntries.map(([sprint, summary]) => {
              const closedPercent = summary.total > 0 ? Math.round((summary.closed / summary.total) * 100) : 0;
              return (
                <div key={sprint} className="sprint-row">
                  <span className="sprint-row__name">{sprint}</span>
                  <div className="sprint-row__bar">
                    <div className="sprint-row__fill" style={{ width: `${closedPercent}%` }} />
                  </div>
                  <span className="sprint-row__stats">
                    {summary.total} total · {summary.closed} fechadas · {summary.opened} abertas
                  </span>
                </div>
              );
            })
          )}
        </article>

        <article className="card">
          <h3>Rank — tarefas que mais demoraram</h3>
          {metrics.longestTasks.length === 0 ? (
            <p>Sem tarefas finalizadas com duração disponível.</p>
          ) : (
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              {metrics.longestTasks.map((issue, index) => (
                <li key={issue.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--fixa-lavender-dark)' }}>
                  <strong>{index + 1}.</strong>{' '}
                  <a href={issue.url} target="_blank" rel="noreferrer">{issue.title}</a>
                  <span style={{ color: 'var(--fixa-gray)', marginLeft: 8 }}>
                    {formatDurationMinutes(issue.durationMinutes)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="card">
          <h3>Taxa de conclusão vs backlog</h3>
          <div className="donut-chart">
            <div
              className="donut-chart__ring"
              style={{
                background: `conic-gradient(var(--fixa-success) 0% ${stats.completionRate}%, var(--fixa-lavender-dark) ${stats.completionRate}% 100%)`,
              }}
            >
              <div className="donut-chart__center">{stats.completionRate}%</div>
            </div>
            <div className="donut-chart__legend">
              <div className="donut-chart__legend-item">
                <span className="donut-chart__dot" style={{ background: 'var(--fixa-success)' }} />
                Finalizado: {stats.completedCount}
              </div>
              <div className="donut-chart__legend-item">
                <span className="donut-chart__dot" style={{ background: 'var(--fixa-warning)' }} />
                Em andamento: {stats.backlogCount}
              </div>
              <div className="donut-chart__legend-item">
                <span className="donut-chart__dot" style={{ background: 'var(--fixa-gray-light)' }} />
                Total: {metrics.totalIssues}
              </div>
            </div>
          </div>
        </article>

        <article className="card">
          <h3>Taxa de retrabalho</h3>
          <div className="donut-chart">
            <div
              className="donut-chart__ring"
              style={{
                background: `conic-gradient(var(--fixa-danger) 0% ${stats.reworkRate}%, var(--fixa-lavender-dark) ${stats.reworkRate}% 100%)`,
              }}
            >
              <div className="donut-chart__center">{stats.reworkRate}%</div>
            </div>
            <div className="donut-chart__legend">
              <div className="donut-chart__legend-item">
                <span className="donut-chart__dot" style={{ background: 'var(--fixa-danger)' }} />
                Reaberturas: {metrics.totalReopened}
              </div>
              <div className="donut-chart__legend-item">
                <span className="donut-chart__dot" style={{ background: 'var(--fixa-gray-light)' }} />
                Total issues: {metrics.totalIssues}
              </div>
            </div>
          </div>
        </article>

        <article className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>Status do backlog</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {Object.entries(metrics.issueCountByStatus).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`status-chip ${getStatusChipClass(status)}`}>{status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
