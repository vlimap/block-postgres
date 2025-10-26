import { useState } from 'react';
import type { ApiUser } from '../lib/api';

type AccountModalProps = {
  open: boolean;
  onClose: () => void;
  user: ApiUser;
  onLogout: () => Promise<void> | void;
  onToggleMarketing: (value: boolean) => Promise<void> | void;
};

export const AccountModal = ({ open, onClose, user, onLogout, onToggleMarketing }: AccountModalProps) => {
  const [loading, setLoading] = useState<'logout' | 'consent' | null>(null);

  if (!open) return null;

  const handleLogout = async () => {
    try {
      setLoading('logout');
      await onLogout();
      onClose();
    } finally {
      setLoading(null);
    }
  };

  const handleToggleConsent = async () => {
    try {
      setLoading('consent');
      await onToggleMarketing(!user.marketingOptIn);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-md bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Sua conta</h3>
            <p className="text-sm text-slate-500">Gerencie sua sessão e preferências de comunicação.</p>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Fechar"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-12 w-12 rounded-full" />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-600">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <p className="font-semibold text-slate-800">{user.name}</p>
              {user.email && <p className="text-xs text-slate-500">{user.email}</p>}
              <p className="text-xs text-slate-400">GitHub ID: {user.githubId}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <div className="rounded border border-slate-200 p-3">
            <p className="font-semibold text-slate-800">Comunicações</p>
            <p className="text-xs text-slate-500">
              {user.marketingOptIn
                ? 'Você aceitou receber novidades. Pode revogar o consentimento quando quiser.'
                : 'Você não está inscrito nas nossas comunicações. Pode ativar quando desejar.'}
            </p>
            {user.marketingConsentAt && (
              <p className="mt-1 text-[11px] text-slate-400">
                Última atualização: {new Date(user.marketingConsentAt).toLocaleString()}
              </p>
            )}
            <div className="mt-3">
              <button
                type="button"
                className={`rounded px-3 py-1.5 text-xs font-semibold shadow-sm ${
                  user.marketingOptIn
                    ? 'border border-rose-300 text-rose-600 hover:bg-rose-50'
                    : 'bg-brand-600 text-white hover:bg-brand-500'
                }`}
                onClick={handleToggleConsent}
                disabled={loading === 'consent'}
              >
                {loading === 'consent'
                  ? 'Atualizando...'
                  : user.marketingOptIn
                    ? 'Revogar consentimento'
                    : 'Quero receber novidades'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between text-sm">
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
            onClick={onClose}
            disabled={loading === 'logout' || loading === 'consent'}
          >
            Fechar
          </button>
          <button
            type="button"
            className="rounded bg-rose-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-60"
            onClick={handleLogout}
            disabled={loading === 'logout'}
          >
            {loading === 'logout' ? 'Saindo...' : 'Sair da conta'}
          </button>
        </div>
      </div>
    </div>
  );
};
