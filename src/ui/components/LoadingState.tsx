interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Carregando métricas...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="loading-state__spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
