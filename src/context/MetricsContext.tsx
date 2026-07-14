import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { GitHubDataService, GitHubMetrics, MemberDefinition } from '../services/GitHubDataService';
import { auditMetrics } from '../services/metricsAudit';

interface MetricsContextValue {
  metrics: GitHubMetrics | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
  refresh: () => void;
  dataService: GitHubDataService;
}

const MetricsContext = createContext<MetricsContextValue | null>(null);

interface MetricsProviderProps {
  token: string | null;
  owner: string;
  members: MemberDefinition[];
  onError: (message: string) => void;
  children: ReactNode;
}

export function MetricsProvider({ token, owner, members, onError, children }: MetricsProviderProps) {
  const [metrics, setMetrics] = useState<GitHubMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const dataService = useMemo(() => new GitHubDataService(token, onError), [token, onError]);

  const refresh = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!token || !owner) {
      setMetrics(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await dataService.getMetrics(
        owner,
        members.map((m) => m.login),
      );

      if (cancelled) return;

      if (result) {
        auditMetrics(result, members);
        setMetrics(result);
        setLastFetchedAt(new Date());
      } else {
        setMetrics(null);
        setError('Não foi possível carregar as métricas.');
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token, owner, dataService, members, fetchKey]);

  const value = useMemo(
    () => ({ metrics, loading, error, lastFetchedAt, refresh, dataService }),
    [metrics, loading, error, lastFetchedAt, refresh, dataService],
  );

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}

export function useMetrics() {
  const ctx = useContext(MetricsContext);
  if (!ctx) {
    throw new Error('useMetrics deve ser usado dentro de MetricsProvider');
  }
  return ctx;
}
