import { useCallback, useEffect, useState } from 'react';
import logoUrl from '../logo.svg';
import { GitHubAuth, getStoredToken } from './auth/GitHubAuth';
import { OAuthCallback } from './auth/OAuthCallback';
import { isCallbackRoute } from './auth/githubOAuth';
import { MetricsProvider } from './context/MetricsContext';
import { OverviewPanel } from './ui/OverviewPanel';
import { MemberMetricsPanel } from './ui/MemberMetricsPanel';
import { GroupMetricsPanel } from './ui/GroupMetricsPanel';
import { IssuesPanel } from './ui/IssuesPanel';
import './styles.css';

const ORGANIZATION = 'Fixai-Inter';

const members = [
  { login: 'LorenzoOliveira-git', name: 'Lorenzo Lima de Oliveira' },
  { login: 'ryancursinom', name: 'Ryan Cursino Moraes' },
  { login: 'NicolasIsepe', name: 'Nicolas Isepe Paz' },
  { login: 'alineteodoro', name: 'Aline Teodoro de Carvalho e Silva' },
  { login: 'raphaxnz', name: 'Raphaely Mendes Sales' },
  { login: 'Gkso31', name: 'Gustavo Kenzo Shirahata Ota' },
];

function App() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [selectedView, setSelectedView] = useState<'overview' | 'members' | 'group' | 'issues'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [isCallback, setIsCallback] = useState(isCallbackRoute());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token');

    if (queryToken) {
      setToken(queryToken);
      localStorage.setItem('githubToken', queryToken);
      params.delete('token');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  if (isCallback) {
    return (
      <div className="app-shell">
        <OAuthCallback
          onSuccess={(newToken) => {
            setToken(newToken);
            setIsCallback(false);
            setError(null);
          }}
          onError={(msg) => {
            setError(msg);
            setIsCallback(false);
          }}
        />
      </div>
    );
  }

  return (
    <MetricsProvider token={token} owner={ORGANIZATION} members={members} onError={handleError}>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header__brand">
            <img src={logoUrl} alt="Logo FIXA" className="app-logo" />
            <div>
              <h1>FIXA — Banco de Horas</h1>
              <p>Dashboard de métricas · {ORGANIZATION}</p>
            </div>
          </div>

          <div className="app-header__auth">
            <GitHubAuth
              token={token}
              onTokenChange={(value) => {
                setError(null);
                setToken(value);
              }}
            />
          </div>
        </header>

        <nav className="app-nav">
          <button type="button" onClick={() => setSelectedView('overview')} className={selectedView === 'overview' ? 'active' : ''}>
            Visão geral
          </button>
          <button type="button" onClick={() => setSelectedView('members')} className={selectedView === 'members' ? 'active' : ''}>
            Por integrante
          </button>
          <button type="button" onClick={() => setSelectedView('group')} className={selectedView === 'group' ? 'active' : ''}>
            Por grupo
          </button>
          <button type="button" onClick={() => setSelectedView('issues')} className={selectedView === 'issues' ? 'active' : ''}>
            Issues
          </button>
        </nav>

        {error && <section className="alert alert-error">{error}</section>}

        <main className="app-content">
          {selectedView === 'overview' && <OverviewPanel members={members} />}
          {selectedView === 'members' && <MemberMetricsPanel members={members} />}
          {selectedView === 'group' && <GroupMetricsPanel />}
          {selectedView === 'issues' && <IssuesPanel />}
        </main>
      </div>
    </MetricsProvider>
  );
}

export default App;
