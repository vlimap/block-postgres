import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onLogin: (user: { username: string; name?: string; avatarUrl?: string }) => void;
};

export const GithubLoginModal = ({ open, onClose, onLogin }: Props) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    const u = username.trim();
    if (!u) {
      setError('Digite seu usuário do GitHub.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`);
      if (!res.ok) {
        setError('Usuário não encontrado. Verifique o nome e tente novamente.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      onLogin({ username: data.login, name: data.name || data.login, avatarUrl: data.avatar_url });
    } catch (err) {
      setError('Erro ao conectar ao GitHub. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded bg-white p-4 shadow">
        <h3 className="text-lg font-semibold">Entrar com GitHub</h3>
        <p className="text-sm text-slate-600">Digite seu nome de usuário do GitHub; apenas usaremos o nome público e a foto.</p>
        <div className="mt-3">
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="ex: octocat"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="rounded bg-indigo-600 px-3 py-1 text-white" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
};
