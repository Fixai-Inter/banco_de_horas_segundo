export interface MemberDefinition {
  login: string;
  name: string;
}

export interface GitHubProjectFieldValue {
  __typename: string;
  text?: string | null;
  number?: string | null;
  name?: string | null;
  date?: string | null;
  title?: string | null;
}

export interface GitHubProjectItemNode {
  Ano?: GitHubProjectFieldValue | null;
  Tipo?: GitHubProjectFieldValue | null;
  Sprint?: GitHubProjectFieldValue | null;
  Status?: GitHubProjectFieldValue | null;
  HorasTrabalhadas?: GitHubProjectFieldValue | null;
}

export interface GitHubIssueField {
  id: string;
  title: string;
  url: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  author: { login: string } | null;
  repository: { nameWithOwner: string };
  assignees: { nodes: Array<{ login: string | null }> };
  comments: { nodes: Array<{ body: string; author: { login: string } | null; createdAt: string }> };
  timelineItems: { nodes: Array<{ __typename: string; actor: { login: string } | null; createdAt: string }> };
  projectItems: {
    nodes: Array<GitHubProjectItemNode>;
  };
}

export interface GitHubPullRequestReview {
  author: { login: string } | null;
}

export interface GitHubPullRequestField {
  reviews: { nodes: GitHubPullRequestReview[]; totalCount: number };
}

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
}

export interface GitHubQueryError {
  message: string;
  type?: string;
}

export interface GitHubQueryResult {
  issues: { nodes: Array<GitHubIssueField | null>; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  pullRequests: { nodes: Array<GitHubPullRequestField | null>; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
}

export interface GitHubGraphQLResponse {
  data?: GitHubQueryResult;
  errors?: GitHubQueryError[];
}

export interface NormalizedIssue {
  id: string;
  title: string;
  url: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  authorLogin: string | null;
  repoName: string;
  assigneeLogins: string[];
  minutesWorked: number;
  isTask: boolean;
  status: string;
  sprint: string;
  reopenings: number;
  comments: Array<{ body: string; authorLogin: string; createdAt: string }>;
  durationMinutes: number | null;
  fields: Record<string, string>;
}

export interface GitHubMetrics {
  rawIssueCount: number;
  filteredIssueCount: number;
  issuesWithAnoField: number;
  issuesWithHoursField: number;
  totalIssues: number;
  totalMinutesWorked: number;
  totalReopened: number;
  issueCountByStatus: Record<string, number>;
  sprintSummary: Record<string, { opened: number; closed: number; total: number }>;
  longestTasks: NormalizedIssue[];
  reviewCounts: Record<string, number>;
  normalizedIssues: NormalizedIssue[];
  memberProfiles: Record<string, GitHubUserProfile>;
}

interface PaginatedIssuesResponse {
  issues: {
    nodes: Array<GitHubIssueField | null>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface PaginatedPRsResponse {
  pullRequests: {
    nodes: Array<GitHubPullRequestField | null>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const PAGE_SIZE = 100;
const MAX_ITEMS = 500;

const ISSUE_FRAGMENT = `
  id
  title
  url
  state
  createdAt
  updatedAt
  closedAt
  author { login }
  repository { nameWithOwner }
  assignees(first: 10) { nodes { login } }
  comments(first: 100) {
    nodes { body author { login } createdAt }
  }
  timelineItems(itemTypes: [REOPENED_EVENT], first: 100) {
    nodes {
      __typename
      ... on ReopenedEvent { actor { login } createdAt }
    }
  }
  projectItems(first: 50) {
    nodes {
      Ano: fieldValueByName(name: "Ano") {
        __typename
        ... on ProjectV2ItemFieldTextValue { text }
        ... on ProjectV2ItemFieldNumberValue { number }
        ... on ProjectV2ItemFieldSingleSelectValue { name }
        ... on ProjectV2ItemFieldDateValue { date }
        ... on ProjectV2ItemFieldIterationValue { title }
      }
      Tipo: fieldValueByName(name: "Tipo") {
        __typename
        ... on ProjectV2ItemFieldTextValue { text }
        ... on ProjectV2ItemFieldNumberValue { number }
        ... on ProjectV2ItemFieldSingleSelectValue { name }
        ... on ProjectV2ItemFieldDateValue { date }
        ... on ProjectV2ItemFieldIterationValue { title }
      }
      Sprint: fieldValueByName(name: "Sprint") {
        __typename
        ... on ProjectV2ItemFieldTextValue { text }
        ... on ProjectV2ItemFieldNumberValue { number }
        ... on ProjectV2ItemFieldSingleSelectValue { name }
        ... on ProjectV2ItemFieldDateValue { date }
        ... on ProjectV2ItemFieldIterationValue { title }
      }
      Status: fieldValueByName(name: "Status") {
        __typename
        ... on ProjectV2ItemFieldTextValue { text }
        ... on ProjectV2ItemFieldNumberValue { number }
        ... on ProjectV2ItemFieldSingleSelectValue { name }
        ... on ProjectV2ItemFieldDateValue { date }
        ... on ProjectV2ItemFieldIterationValue { title }
      }
      HorasTrabalhadas: fieldValueByName(name: "Horas Trabalhadas") {
        __typename
        ... on ProjectV2ItemFieldTextValue { text }
        ... on ProjectV2ItemFieldNumberValue { number }
        ... on ProjectV2ItemFieldSingleSelectValue { name }
        ... on ProjectV2ItemFieldDateValue { date }
        ... on ProjectV2ItemFieldIterationValue { title }
      }
    }
  }
`;

export class GitHubDataService {
  constructor(private token: string | null, private onError: (message: string) => void) {}

  private async graphqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
    if (!this.token) {
      this.onError('Token do GitHub não disponível. Faça login para buscar dados.');
      return null;
    }

    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 401 || response.status === 403) {
      this.onError('Token inválido ou expirado. Faça login novamente.');
      return null;
    }

    if (!response.ok) {
      const bodyText = await response.text();
      this.onError(`Erro HTTP ${response.status}: ${bodyText || response.statusText}`);
      return null;
    }

    const responseBody = await response.json() as { data?: T; errors?: GitHubQueryError[] };

    if (responseBody.errors && responseBody.errors.length > 0) {
      const errorMessage = responseBody.errors.map((error) => error.message).join(' | ');
      this.onError(`Erro da API GitHub: ${errorMessage}`);
      return null;
    }

    return responseBody.data ?? null;
  }

  async validateToken(): Promise<{ login: string; avatarUrl: string } | null> {
    const data = await this.graphqlRequest<{ viewer: { login: string; avatarUrl: string } }>(
      `query { viewer { login avatarUrl } }`,
      {},
    );
    return data?.viewer ?? null;
  }

  async fetchUserProfiles(logins: string[]): Promise<Record<string, GitHubUserProfile>> {
    if (logins.length === 0) return {};

    const query = `query UserProfiles(${logins.map((_, i) => `$login${i}: String!`).join(', ')}) {
      ${logins.map((_, i) => `user${i}: user(login: $login${i}) { login name avatarUrl }`).join('\n      ')}
    }`;

    const variables = Object.fromEntries(logins.map((login, i) => [`login${i}`, login]));

    const data = await this.graphqlRequest<Record<string, GitHubUserProfile | null>>(query, variables);
    if (!data) return {};

    const profiles: Record<string, GitHubUserProfile> = {};
    Object.values(data).forEach((user) => {
      if (user?.login) {
        profiles[user.login] = user;
      }
    });
    return profiles;
  }

  private async fetchPaginatedIssues(organization: string): Promise<GitHubIssueField[]> {
    const allIssues: GitHubIssueField[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage && allIssues.length < MAX_ITEMS) {
      const query = `query PaginatedIssues($issueQuery: String!, $after: String) {
        issues: search(query: $issueQuery, type: ISSUE, first: ${PAGE_SIZE}, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on Issue { ${ISSUE_FRAGMENT} }
          }
        }
      }`;

      const data: PaginatedIssuesResponse | null = await this.graphqlRequest<PaginatedIssuesResponse>(
        query,
        { issueQuery: `org:${organization} is:issue`, after: cursor },
      );

      if (!data?.issues) break;

      const nodes = data.issues.nodes.filter((n: GitHubIssueField | null): n is GitHubIssueField => n !== null);
      allIssues.push(...nodes);
      hasNextPage = data.issues.pageInfo.hasNextPage;
      cursor = data.issues.pageInfo.endCursor;
    }

    return allIssues;
  }

  private async fetchPaginatedPullRequests(organization: string): Promise<GitHubPullRequestField[]> {
    const allPRs: GitHubPullRequestField[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage && allPRs.length < MAX_ITEMS) {
      const query = `query PaginatedPRs($prQuery: String!, $after: String) {
        pullRequests: search(query: $prQuery, type: ISSUE, first: ${PAGE_SIZE}, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on PullRequest {
              reviews(first: 100) {
                totalCount
                nodes { author { login } }
              }
            }
          }
        }
      }`;

      const data: PaginatedPRsResponse | null = await this.graphqlRequest<PaginatedPRsResponse>(
        query,
        { prQuery: `org:${organization} is:pr`, after: cursor },
      );

      if (!data?.pullRequests) break;

      const nodes = data.pullRequests.nodes.filter((n: GitHubPullRequestField | null): n is GitHubPullRequestField => n !== null);
      allPRs.push(...nodes);
      hasNextPage = data.pullRequests.pageInfo.hasNextPage;
      cursor = data.pullRequests.pageInfo.endCursor;
    }

    return allPRs;
  }

  private normalizeFieldValue(value: GitHubProjectFieldValue): string | null {
    return value.text ?? value.name ?? value.title ?? value.number ?? value.date ?? null;
  }

  parseProjectFields(issue: GitHubIssueField) {
    return issue.projectItems.nodes.flatMap((item) => {
      const result: Array<{ name: string; value: string }> = [];
      const fields: Array<keyof GitHubProjectItemNode> = ['Ano', 'Tipo', 'Sprint', 'Status', 'HorasTrabalhadas'];

      fields.forEach((fieldName) => {
        const value = item[fieldName];
        if (!value) return;

        const textValue = this.normalizeFieldValue(value);
        if (textValue) {
          const normalizedName = fieldName === 'HorasTrabalhadas' ? 'Horas Trabalhadas' : fieldName;
          result.push({ name: normalizedName, value: textValue });
        }
      });

      return result;
    });
  }

  static normalizeText(value: string) {
    return String(value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }

  static isTargetAno(value: string) {
    const normalized = GitHubDataService.normalizeText(String(value));
    return /\b2\s*(º|°)?\s*ano\b/.test(normalized) || /\b2\s*ano\b/.test(normalized) || /\bsegundo\s*ano\b/.test(normalized);
  }

  static parseMinutesWorked(value: string): number {
    const raw = String(value).trim().toLowerCase();
    if (!raw) return 0;

    const normalized = raw.replace(',', '.');
    const colonPattern = normalized.match(/^(\d+)\s*[:h]\s*(\d+)\s*(m?)$/);
    if (colonPattern) {
      return Number(colonPattern[1]) * 60 + Number(colonPattern[2]);
    }

    const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h/);
    const minutesMatch = normalized.match(/(\d+)\s*m/);
    if (hoursMatch && minutesMatch) {
      return Math.round(Number(hoursMatch[1]) * 60 + Number(minutesMatch[1]));
    }
    if (hoursMatch) return Math.round(Number(hoursMatch[1]) * 60);
    if (minutesMatch) return Number(minutesMatch[1]);

    const numeric = Number(normalized);
    if (!Number.isNaN(numeric)) {
      return numeric <= 12 ? Math.round(numeric * 60) : Math.round(numeric);
    }

    return 0;
  }

  normalizeIssue(issue: GitHubIssueField): NormalizedIssue {
    const fields = Object.fromEntries(
      this.parseProjectFields(issue).map((field) => [field.name, field.value]),
    ) as Record<string, string>;

    const minutesWorked = GitHubDataService.parseMinutesWorked(fields['Horas Trabalhadas'] ?? '');
    const isTask = (fields['Tipo'] ?? '').trim().toLowerCase() === 'task';
    const sprint = (fields['Sprint'] ?? '').trim() || 'Sem sprint';
    const statusField = (fields['Status'] ?? '').trim();
    const status = statusField || (issue.state === 'CLOSED' ? 'Finalizado' : 'Em progresso');
    const assigneeLogins = issue.assignees.nodes
      .map((node) => node.login)
      .filter((login): login is string => Boolean(login));

    const effectiveAssignees = assigneeLogins.length > 0
      ? assigneeLogins
      : issue.author?.login
      ? [issue.author.login]
      : [];

    const comments = issue.comments.nodes.map((comment) => ({
      body: comment.body.trim(),
      authorLogin: comment.author?.login ?? 'desconhecido',
      createdAt: comment.createdAt,
    }));

    const durationMinutes = issue.closedAt
      ? Math.round((new Date(issue.closedAt).getTime() - new Date(issue.createdAt).getTime()) / 60000)
      : null;

    return {
      id: issue.id,
      title: issue.title,
      url: issue.url,
      state: issue.state,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      closedAt: issue.closedAt,
      authorLogin: issue.author?.login ?? null,
      repoName: issue.repository.nameWithOwner,
      assigneeLogins: effectiveAssignees,
      minutesWorked,
      isTask,
      status,
      sprint,
      reopenings: issue.timelineItems.nodes.filter((item) => item.__typename === 'ReopenedEvent').length,
      comments,
      durationMinutes,
      fields,
    };
  }

  async getMetrics(owner: string, memberLogins: string[] = []): Promise<GitHubMetrics | null> {
    const organization = 'Fixai-Inter';

    const [allIssues, allPRs] = await Promise.all([
      this.fetchPaginatedIssues(organization),
      this.fetchPaginatedPullRequests(organization),
    ]);

    if (allIssues.length === 0 && allPRs.length === 0 && !this.token) {
      return null;
    }

    const issueFields = allIssues.map((issue) => ({
      issue,
      projectFields: this.parseProjectFields(issue),
    }));

    const issuesWithAnoField = issueFields.filter(({ projectFields }) =>
      projectFields.some((field) => field.name === 'Ano'),
    ).length;

    const filteredIssues = issueFields
      .filter(({ projectFields }) => {
        const ano = projectFields.find((field) => field.name === 'Ano')?.value ?? '';
        return GitHubDataService.isTargetAno(ano);
      })
      .map(({ issue }) => issue);

    const issuesWithHoursField = issueFields.filter(({ projectFields }) =>
      projectFields.some((field) => field.name === 'Horas Trabalhadas' && String(field.value).trim() !== ''),
    ).length;

    const normalizedIssues = filteredIssues.map((issue) => this.normalizeIssue(issue));

    const reviewCounts = allPRs.reduce<Record<string, number>>((counts, pr) => {
      pr.reviews.nodes.forEach((review) => {
        const login = review.author?.login;
        if (login) {
          counts[login] = (counts[login] ?? 0) + 1;
        }
      });
      return counts;
    }, {});

    const sprintSummary = normalizedIssues.reduce<Record<string, { opened: number; closed: number; total: number }>>(
      (summary, issue) => {
        const sprint = issue.sprint;
        const item = summary[sprint] ?? { opened: 0, closed: 0, total: 0 };
        item.total += 1;
        if (issue.state === 'OPEN') {
          item.opened += 1;
        } else {
          item.closed += 1;
        }
        summary[sprint] = item;
        return summary;
      },
      {},
    );

    const issueCountByStatus = normalizedIssues.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.status] = (counts[issue.status] ?? 0) + 1;
      return counts;
    }, {});

    const longestTasks = normalizedIssues
      .filter((issue) => issue.isTask && issue.durationMinutes !== null)
      .sort((a, b) => (b.durationMinutes ?? 0) - (a.durationMinutes ?? 0))
      .slice(0, 10);

    const memberProfiles = memberLogins.length > 0
      ? await this.fetchUserProfiles(memberLogins)
      : {};

    return {
      rawIssueCount: allIssues.length,
      filteredIssueCount: filteredIssues.length,
      issuesWithAnoField,
      issuesWithHoursField,
      totalIssues: normalizedIssues.length,
      totalMinutesWorked: normalizedIssues.reduce((sum, issue) => sum + issue.minutesWorked, 0),
      totalReopened: normalizedIssues.reduce((sum, issue) => sum + issue.reopenings, 0),
      issueCountByStatus,
      sprintSummary,
      longestTasks,
      reviewCounts,
      normalizedIssues,
      memberProfiles,
    };
  }
}
