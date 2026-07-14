import { useState } from 'react';

interface GitHubAuthProps {
  token: string | null;
  onTokenChange: (token: string | null) => void;
}

export function GitHubAuth({ token, onTokenChange }: GitHubAuthProps) {
  const [tokenInput, setTokenInput] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('githubToken');
    setTokenInput('');
    onTokenChange(null);
  };

  const handlePatSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = tokenInput.trim();
    if (trimmed) {
      localStorage.setItem('githubToken', trimmed);
      onTokenChange(trimmed);
    }
  };

  if (token) {
    return (
      <div className="auth-panel">
        <p className="hint">Token ativo</p>
        <button type="button" className="secondary" onClick={handleLogout}>
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <form className="auth-row" onSubmit={handlePatSubmit}>
        <input
          type="password"
          value={tokenInput}
          placeholder="Personal Access Token"
          onChange={(e) => setTokenInput(e.target.value)}
          aria-label="Token do GitHub"
          autoComplete="off"
        />
        <button type="submit">Entrar</button>
      </form>
      <p className="hint warning">
        Autenticação necessária para acessar métricas da Fixai-Inter.
      </p>
    </div>
  );
}

export function getStoredToken(): string | null {
  return localStorage.getItem('githubToken');
}