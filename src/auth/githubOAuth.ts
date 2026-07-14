const PKCE_VERIFIER_KEY = 'github_pkce_verifier';
const PKCE_STATE_KEY = 'github_oauth_state';
const TOKEN_KEY = 'github_oauth_token';
const USER_KEY = 'github_oauth_user';

export interface OAuthUser {
  login: string;
  avatarUrl: string;
}

function getClientId(): string {
  return import.meta.env.VITE_GITHUB_CLIENT_ID ?? '';
}

function getRedirectUri(): string {
  return import.meta.env.VITE_GITHUB_REDIRECT_URI ?? `${window.location.origin}/auth/callback`;
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);
  const hashed = await sha256(verifier);
  const challenge = base64UrlEncode(hashed);
  return { verifier, challenge };
}

export function isOAuthConfigured(): boolean {
  return Boolean(getClientId());
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem('githubToken');
}

export function getStoredUser(): OAuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as OAuthUser : null;
  } catch {
    return null;
  }
}

export function storeAuth(token: string, user: OAuthUser) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem('githubToken', token);
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem('githubToken');
}

export async function startOAuthFlow() {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('VITE_GITHUB_CLIENT_ID não configurado. Veja .env.example');
  }

  const { verifier, challenge } = await generatePKCE();
  const state = generateRandomString(32);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: 'read:org read:project repo',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function handleOAuthCallback(code: string, state: string): Promise<{ token: string; user: OAuthUser }> {
  const savedState = sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (!savedState || state !== savedState) {
    throw new Error('State inválido. Possível ataque CSRF.');
  }

  if (!verifier) {
    throw new Error('Code verifier não encontrado. Inicie o login novamente.');
  }

  sessionStorage.removeItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  const response = await fetch(`${getApiBaseUrl()}/api/auth/github/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier,
    }),
  });

  const data = await response.json() as {
    access_token?: string;
    user?: OAuthUser;
    error?: string;
  };

  if (!response.ok || data.error || !data.access_token || !data.user) {
    throw new Error(data.error ?? 'Falha ao obter token OAuth');
  }

  storeAuth(data.access_token, data.user);

  return { token: data.access_token, user: data.user };
}

export function isCallbackRoute(): boolean {
  return window.location.pathname === '/auth/callback';
}

export function getCallbackParams(): { code: string | null; state: string | null; error: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
  };
}
