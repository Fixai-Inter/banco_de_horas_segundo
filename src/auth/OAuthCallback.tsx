import { useEffect, useState } from 'react';
import { getCallbackParams, handleOAuthCallback } from './githubOAuth';

interface OAuthCallbackProps {
  onSuccess: (token: string) => void;
  onError: (message: string) => void;
}

export function OAuthCallback({ onSuccess, onError }: OAuthCallbackProps) {
  const [status, setStatus] = useState('Processando autenticação...');

  useEffect(() => {
    const { code, state, error } = getCallbackParams();

    if (error) {
      onError(`Autenticação cancelada: ${error}`);
      window.history.replaceState({}, '', '/');
      return;
    }

    if (!code || !state) {
      onError('Parâmetros de callback inválidos.');
      window.history.replaceState({}, '', '/');
      return;
    }

    handleOAuthCallback(code, state)
      .then(({ token }) => {
        setStatus('Autenticação concluída! Redirecionando...');
        onSuccess(token);
        window.history.replaceState({}, '', '/');
      })
      .catch((err: Error) => {
        onError(err.message);
        window.history.replaceState({}, '', '/');
      });
  }, [onSuccess, onError]);

  return (
    <div className="oauth-callback">
      <div className="loading-state__spinner" />
      <p>{status}</p>
    </div>
  );
}
