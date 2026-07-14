import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubViewer {
  login: string;
  avatarUrl: string;
}

app.post('/api/auth/github/callback', async (req, res) => {
  const { code, code_verifier, redirect_uri } = req.body as {
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
  };

  if (!code || !code_verifier || !redirect_uri) {
    res.status(400).json({ error: 'Parâmetros obrigatórios ausentes (code, code_verifier, redirect_uri).' });
    return;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId) {
    res.status(500).json({ error: 'GITHUB_CLIENT_ID não configurado no servidor.' });
    return;
  }

  try {
    const tokenPayload: Record<string, string> = {
      client_id: clientId,
      code,
      redirect_uri,
      code_verifier,
    };

    if (clientSecret) {
      tokenPayload.client_secret = clientSecret;
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(tokenPayload),
    });

    const tokenData = (await tokenResponse.json()) as GitHubTokenResponse;

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      res.status(400).json({
        error: tokenData.error_description ?? tokenData.error ?? 'Falha ao obter token OAuth',
      });
      return;
    }

    const userResponse = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ viewer { login avatarUrl } }' }),
    });

    const userData = (await userResponse.json()) as { data?: { viewer: GitHubViewer } };
    const user = userData.data?.viewer;

    if (!user) {
      res.status(500).json({ error: 'Não foi possível obter dados do usuário autenticado.' });
      return;
    }

    res.json({ access_token: tokenData.access_token, user });
  } catch {
    res.status(500).json({ error: 'Erro interno ao processar autenticação.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Servidor de autenticação em http://localhost:${PORT}`);
});
