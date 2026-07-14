import { useMemo } from 'react';
import { GitHubMetrics, MemberDefinition } from '../services/GitHubDataService';
import { computeWeeklyStatuses } from '../services/WeeklyHoursService';
import { useMetrics } from '../context/MetricsContext';
import { SectionHeader } from './components/SectionHeader';
import { MetricBadge } from './components/MetricBadge';
import { ProgressBar } from './components/ProgressBar';
import { LoadingState } from './components/LoadingState';
import { formatMinutes, formatDate, getInitials } from '../utils/formatters';

interface MemberMetricsPanelProps {
  members: MemberDefinition[];
}

interface MemberSummary {
  login: string;
  name: string;
  minutesWorked: number;
  tasksAllocated: number;
  reopenings: number;
  reviews: number;
  comments: Array<{ issueTitle: string; issueUrl: string; body: string; date: string }>;
  avatarUrl?: string;
  weeklyMinutes: number;
  metGoal: boolean;
  remainingMinutes: number;
}

function buildMemberSummaries(metrics: GitHubMetrics, members: MemberDefinition[]): MemberSummary[] {
  const { statuses } = computeWeeklyStatuses(metrics, members);
  const weeklyMap = new Map(statuses.map((s) => [s.login, s]));

  return members.map((member) => {
    const assignedIssues = metrics.normalizedIssues.filter((issue) =>
      issue.assigneeLogins.includes(member.login),
    );

    const memberComments = metrics.normalizedIssues
      .flatMap((issue) =>
        issue.comments
          .filter((comment) => comment.authorLogin === member.login)
          .map((comment) => ({
            issueTitle: issue.title,
            issueUrl: issue.url,
            body: comment.body,
            date: comment.createdAt,
          })),
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const weekly = weeklyMap.get(member.login);

    return {
      login: member.login,
      name: member.name,
      minutesWorked: assignedIssues.reduce((sum, issue) => sum + issue.minutesWorked, 0),
      tasksAllocated: assignedIssues.filter((issue) => issue.isTask).length,
      reopenings: assignedIssues.reduce((sum, issue) => sum + issue.reopenings, 0),
      reviews: metrics.reviewCounts[member.login] ?? 0,
      comments: memberComments,
      avatarUrl: metrics.memberProfiles[member.login]?.avatarUrl,
      weeklyMinutes: weekly?.weeklyMinutes ?? 0,
      metGoal: weekly?.metGoal ?? false,
      remainingMinutes: weekly?.remainingMinutes ?? 180,
    };
  });
}

export function MemberMetricsPanel({ members }: MemberMetricsPanelProps) {
  const { metrics, loading } = useMetrics();

  const summaries = useMemo(() => {
    if (!metrics) return [];
    return buildMemberSummaries(metrics, members);
  }, [metrics, members]);

  if (loading) return <LoadingState message="Carregando métricas por integrante..." />;

  if (!metrics) {
    return (
      <section>
        <SectionHeader title="Métricas por integrante" description="Indicadores individuais de horas, tarefas e participação." />
        <div className="card"><p>Faça login para carregar as métricas.</p></div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader
        title="Métricas por integrante"
        description="Indicadores de horas, tarefas, comentários e participação na Fixai-Inter."
      />

      <div className="member-list">
        {summaries.map((member) => (
          <article key={member.login} className="card member-card member-card--row">
            <div className="member-card__main">
              <div className="member-card__identity">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.name} className="member-card__avatar member-card__avatar--lg" />
                ) : (
                  <div className="member-card__avatar-fallback member-card__avatar-fallback--lg">
                    {getInitials(member.name)}
                  </div>
                )}
                <div className="member-card__info">
                  <h3>{member.name}</h3>
                  <p className="member-card__login">@{member.login}</p>
                </div>
              </div>

              <div className="member-card__metrics-row">
                <div className="member-card__metric member-card__metric--highlight">
                  <span className="member-card__metric-value">{formatMinutes(member.weeklyMinutes)}</span>
                  <span className="member-card__metric-label">Horas esta semana</span>
                </div>
                <div className="member-card__metric">
                  <span className="member-card__metric-value">{formatMinutes(member.minutesWorked)}</span>
                  <span className="member-card__metric-label">Horas totais</span>
                </div>
                <div className="member-card__metric">
                  <span className="member-card__metric-value">{member.tasksAllocated}</span>
                  <span className="member-card__metric-label">Tasks alocadas</span>
                </div>
                <div className="member-card__metric">
                  <span className="member-card__metric-value">{member.reviews}</span>
                  <span className="member-card__metric-label">Code reviews</span>
                </div>
                <div className="member-card__metric">
                  <span className="member-card__metric-value">{member.reopenings}</span>
                  <span className="member-card__metric-label">Reaberturas</span>
                </div>
              </div>

              <div className="member-card__goal-panel">
                <div className="member-card__goal-header">
                  <span className="member-card__goal-title">Meta semanal (3h)</span>
                  <MetricBadge
                    label={
                      member.metGoal
                        ? 'Meta cumprida'
                        : `Faltam ${formatMinutes(member.remainingMinutes)}`
                    }
                    variant={member.metGoal ? 'success' : 'danger'}
                  />
                </div>
                <ProgressBar
                  value={member.weeklyMinutes}
                  max={180}
                  label={`${formatMinutes(member.weeklyMinutes)} / 3h`}
                  showPercent={false}
                  variant={member.metGoal ? 'success' : 'danger'}
                />
              </div>
            </div>

            <div className="member-card__comments-section">
              <h4 className="member-card__comments-title">
                Comentários do que fez
                <span className="member-card__comments-count">{member.comments.length}</span>
              </h4>
              {member.comments.length === 0 ? (
                <p className="member-card__comments-empty">Nenhum comentário registrado nas issues.</p>
              ) : (
                <ul
                  className={`member-card__comment-list member-card__comment-list--expanded${
                    member.comments.length > 6 ? ' member-card__comment-list--scroll' : ''
                  }`}
                >
                  {member.comments.map((comment, index) => (
                    <li key={index} className="member-card__comment-item">
                      <span className="member-card__comment-meta">
                        <a href={comment.issueUrl} target="_blank" rel="noreferrer">
                          {comment.issueTitle}
                        </a>
                        <time dateTime={comment.date}>{formatDate(comment.date)}</time>
                      </span>
                      <p className="member-card__comment-body">
                        {comment.body.length > 320 ? `${comment.body.slice(0, 320)}…` : comment.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
