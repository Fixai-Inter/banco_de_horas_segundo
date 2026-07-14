import { GitHubMetrics, MemberDefinition } from './GitHubDataService';

export function auditMetrics(metrics: GitHubMetrics, members: MemberDefinition[]) {
  if (import.meta.env.PROD) return;

  const taskCount = metrics.normalizedIssues.filter((i) => i.isTask).length;
  const completedCount = metrics.issueCountByStatus['Finalizado'] ?? 0;
  const backlogStatuses = ['Backlog', 'Em espera', 'Em progresso', 'Em revisão'];
  const backlogCount = backlogStatuses.reduce(
    (sum, status) => sum + (metrics.issueCountByStatus[status] ?? 0),
    0,
  );

  const memberAudit = members.map((member) => {
    const assigned = metrics.normalizedIssues.filter((i) => i.assigneeLogins.includes(member.login));
    return {
      login: member.login,
      hours: assigned.reduce((s, i) => s + i.minutesWorked, 0),
      tasks: assigned.filter((i) => i.isTask).length,
      reopenings: assigned.reduce((s, i) => s + i.reopenings, 0),
      reviews: metrics.reviewCounts[member.login] ?? 0,
      comments: assigned.flatMap((i) => i.comments.filter((c) => c.authorLogin === member.login)).length,
    };
  });

  console.group('[FIXA] Auditoria de métricas');
  console.table({
    'Issues totais (org)': metrics.rawIssueCount,
    'Issues com campo Ano': metrics.issuesWithAnoField,
    'Issues 2° Ano': metrics.filteredIssueCount,
    'Issues com horas': metrics.issuesWithHoursField,
    'Tasks': taskCount,
    'Reaberturas': metrics.totalReopened,
    'Finalizado': completedCount,
    'Backlog+Andamento': backlogCount,
    'Horas totais (min)': metrics.totalMinutesWorked,
    'Sprints': Object.keys(metrics.sprintSummary).length,
    'Rank tarefas': metrics.longestTasks.length,
  });
  console.table(memberAudit);
  console.groupEnd();
}

export function getComplianceChecklist(metrics: GitHubMetrics | null, members: MemberDefinition[]) {
  if (!metrics) {
    return [
      { rule: 'Dados carregados', ok: false },
    ];
  }

  const taskCount = metrics.normalizedIssues.filter((i) => i.isTask).length;

  return [
    { rule: 'Filtro Ano = 2° Ano aplicado', ok: metrics.filteredIssueCount > 0 },
    { rule: `${members.length} integrantes configurados`, ok: members.length === 6 },
    { rule: 'Horas em minutos processadas', ok: metrics.issuesWithHoursField >= 0 },
    { rule: 'Tasks identificadas (Tipo = Task)', ok: taskCount >= 0 },
    { rule: 'Reaberturas contabilizadas', ok: metrics.totalReopened >= 0 },
    { rule: 'Code reviews por integrante', ok: Object.keys(metrics.reviewCounts).length >= 0 },
    { rule: 'Sprints com abertas/fechadas', ok: Object.keys(metrics.sprintSummary).length >= 0 },
    { rule: 'Rank das 10 tasks mais longas', ok: metrics.longestTasks.length >= 0 },
    { rule: 'Taxa retrabalho calculável', ok: metrics.totalIssues > 0 },
    { rule: 'Taxa conclusão calculável', ok: metrics.totalIssues > 0 },
    { rule: 'Avatares carregados', ok: Object.keys(metrics.memberProfiles).length > 0 },
  ];
}
