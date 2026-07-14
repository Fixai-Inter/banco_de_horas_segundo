import { useMemo, useState } from 'react';
import { useMetrics } from '../context/MetricsContext';
import { SectionHeader } from './components/SectionHeader';
import { StatCard } from './components/StatCard';
import { LoadingState } from './components/LoadingState';
import { formatMinutes, formatDurationMinutes } from '../utils/formatters';

function getStatusChipClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('backlog')) return 'status-chip--backlog';
  if (normalized.includes('espera')) return 'status-chip--espera';
  if (normalized.includes('progresso')) return 'status-chip--progresso';
  if (normalized.includes('revis')) return 'status-chip--revisao';
  if (normalized.includes('finaliz')) return 'status-chip--finalizado';
  return 'status-chip--default';
}

export function IssuesPanel() {
  const { metrics, loading } = useMetrics();
  const [statusFilter, setStatusFilter] = useState('');
  const [sprintFilter, setSprintFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  const filterOptions = useMemo(() => {
    if (!metrics) return { statuses: [], sprints: [], assignees: [] };

    const statuses = [...new Set(metrics.normalizedIssues.map((i) => i.status))].sort();
    const sprints = [...new Set(metrics.normalizedIssues.map((i) => i.sprint))].sort();
    const assignees = [...new Set(metrics.normalizedIssues.flatMap((i) => i.assigneeLogins))].sort();

    return { statuses, sprints, assignees };
  }, [metrics]);

  const filteredIssues = useMemo(() => {
    if (!metrics) return [];

    return metrics.normalizedIssues.filter((issue) => {
      if (statusFilter && issue.status !== statusFilter) return false;
      if (sprintFilter && issue.sprint !== sprintFilter) return false;
      if (assigneeFilter && !issue.assigneeLogins.includes(assigneeFilter)) return false;
      return true;
    });
  }, [metrics, statusFilter, sprintFilter, assigneeFilter]);

  if (loading) return <LoadingState message="Carregando issues..." />;

  if (!metrics) {
    return (
      <section>
        <SectionHeader title="Issues e propriedades" description="Visualize issues filtradas por Ano." />
        <div className="card"><p>Faça login para carregar as issues.</p></div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader
        title="Issues e propriedades"
        description="Issues da Fixai-Inter filtradas por Ano = 2° Ano."
      />

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Issues 2° Ano" value={metrics.totalIssues}/>
        <StatCard label="Horas totais" value={formatMinutes(metrics.totalMinutesWorked)}/>
        <StatCard label="Retrabalho" value={metrics.totalReopened}/>
        <StatCard label="Exibindo" value={filteredIssues.length} subtitle="após filtros"/>
      </div>

      <div className="card">
        <div className="filters-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            {filterOptions.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)} aria-label="Filtrar por sprint">
            <option value="">Todas as sprints</option>
            {filterOptions.sprints.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="Filtrar por integrante">
            <option value="">Todos os integrantes</option>
            {filterOptions.assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {(statusFilter || sprintFilter || assigneeFilter) && (
            <button
              type="button"
              className="btn-refresh"
              onClick={() => { setStatusFilter(''); setSprintFilter(''); setAssigneeFilter(''); }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="issue-table-wrapper">
          <table className="issue-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Repositório</th>
                <th>Assignees</th>
                <th>Sprint</th>
                <th>Status</th>
                <th>Horas</th>
                <th>Reaberturas</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <a href={issue.url} target="_blank" rel="noreferrer">{issue.title}</a>
                    {issue.isTask && (
                      <span className="status-chip status-chip--progresso" style={{ marginLeft: 8 }}>Task</span>
                    )}
                  </td>
                  <td>{issue.repoName}</td>
                  <td>{issue.assigneeLogins.join(', ') || 'Sem responsável'}</td>
                  <td>{issue.sprint}</td>
                  <td><span className={`status-chip ${getStatusChipClass(issue.status)}`}>{issue.status}</span></td>
                  <td>{formatMinutes(issue.minutesWorked)}</td>
                  <td>{issue.reopenings}</td>
                  <td>{formatDurationMinutes(issue.durationMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
