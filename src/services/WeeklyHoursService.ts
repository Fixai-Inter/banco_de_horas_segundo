import { GitHubMetrics, MemberDefinition, NormalizedIssue } from './GitHubDataService';

export const WEEKLY_GOAL_MINUTES = 180;

export interface WeeklyMemberStatus {
  login: string;
  name: string;
  weeklyMinutes: number;
  goalMinutes: number;
  metGoal: boolean;
  remainingMinutes: number;
  method: 'comment' | 'direct';
  avatarUrl?: string;
}

export function getISOWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekBounds(weekKey?: string): { start: Date; end: Date } {
  if (weekKey) {
    const [year, week] = weekKey.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const start = new Date(jan4);
    start.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (week - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);
    return { start, end };
  }

  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function isInWeek(isoDate: string, weekKey?: string): boolean {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return false;
  const { start, end } = getWeekBounds(weekKey);
  return date >= start && date < end;
}

// Reconhece: +2h, +1.5h, +30m, +2h30m, +2:30
function parseCommentDelta(body: string): number {
  const normalized = body.trim().toLowerCase().replace(',', '.');

  // +2h30m ou +2:30
  const fullMatch = normalized.match(/^\+(\d+(?:\.\d+)?)\s*h\s*(\d+)\s*m/);
  if (fullMatch) return Math.round(Number(fullMatch[1]) * 60 + Number(fullMatch[2]));

  const colonMatch = normalized.match(/^\+(\d+):(\d+)/);
  if (colonMatch) return Number(colonMatch[1]) * 60 + Number(colonMatch[2]);

  // +2h ou +1.5h
  const hoursMatch = normalized.match(/^\+(\d+(?:\.\d+)?)\s*h/);
  if (hoursMatch) return Math.round(Number(hoursMatch[1]) * 60);

  // +30m
  const minutesMatch = normalized.match(/^\+(\d+)\s*m/);
  if (minutesMatch) return Number(minutesMatch[1]);

  return 0;
}

function getMemberWeeklyMinutesFromComments(
  issues: NormalizedIssue[],
  login: string,
  weekKey?: string,
): number {
  let total = 0;

  for (const issue of issues) {
    if (!issue.assigneeLogins.includes(login)) continue;

    for (const comment of issue.comments) {
      if (comment.authorLogin !== login) continue;
      if (!isInWeek(comment.createdAt, weekKey)) continue;

      const delta = parseCommentDelta(comment.body);
      total += delta;
    }
  }

  return total;
}

function getMemberWeeklyMinutesFallback(
  issues: NormalizedIssue[],
  login: string,
): number {
  // fallback: usa minutesWorked total da issue se foi atualizada essa semana
  // usado apenas quando não há nenhum comentário +Xh
  return issues
    .filter(issue =>
      issue.assigneeLogins.includes(login) &&
      issue.minutesWorked > 0 &&
      isInWeek(issue.updatedAt),
    )
    .reduce((sum, issue) => sum + issue.minutesWorked, 0);
}

export function computeWeeklyStatuses(
  metrics: GitHubMetrics,
  members: MemberDefinition[],
): { statuses: WeeklyMemberStatus[]; isBaselineEstablishing: false } {
  const statuses: WeeklyMemberStatus[] = members.map(member => {
    const profile = metrics.memberProfiles[member.login];

    const commentMinutes = getMemberWeeklyMinutesFromComments(
      metrics.normalizedIssues,
      member.login,
    );

    // se tem comentários +Xh essa semana, usa eles
    // se não tem, cai no fallback do updatedAt (comportamento anterior)
    const weeklyMinutes = commentMinutes > 0
      ? commentMinutes
      : getMemberWeeklyMinutesFallback(metrics.normalizedIssues, member.login);

    const method = commentMinutes > 0 ? 'comment' : 'direct';
    const metGoal = weeklyMinutes >= WEEKLY_GOAL_MINUTES;
    const remainingMinutes = Math.max(0, WEEKLY_GOAL_MINUTES - weeklyMinutes);

    return {
      login: member.login,
      name: member.name,
      weeklyMinutes,
      goalMinutes: WEEKLY_GOAL_MINUTES,
      metGoal,
      remainingMinutes,
      method,
      avatarUrl: profile?.avatarUrl,
    };
  });

  return { statuses, isBaselineEstablishing: false };
}

// utilitário exportado para quem quiser ver horas de semanas passadas
export function getMemberHoursByWeek(
  issues: NormalizedIssue[],
  login: string,
  weekKey: string,
): number {
  return getMemberWeeklyMinutesFromComments(issues, login, weekKey);
}