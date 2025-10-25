import { useRef } from 'react';
import type { ModelIssue } from '../lib/warnings';

type HeaderProps = {
  issues: ModelIssue[];
  onNew: () => void;
  onImportFile: (file: File) => Promise<void>;
  onSave: () => void;
  onCopySql: () => Promise<void>;
  onToggleErd: () => void;
  showErd: boolean;
  onStartTour?: () => void;
  // user & project controls (opcionais)
  user?: { username: string; name?: string; avatarUrl?: string } | null;
  onOpenLogin?: () => void;
  onOpenProjects?: () => void;
  onLogout?: () => void;
};

const buttonBase =
  'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60';

const badgeBase =
  'inline-flex items-center rounded-full px-2 text-xs font-semibold';

export const Header = ({
  issues,
  onNew,
  onImportFile,
  onSave,
  onCopySql,
  onToggleErd,
  showErd,
  onStartTour,
  user,
  onOpenLogin,
  onOpenProjects,
  onLogout,
}: HeaderProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleClickImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const [file] = event.target.files ?? [];
    if (!file) {
      return;
    }
    try {
      await onImportFile(file);
    } finally {
      event.target.value = '';
    }
  };

  const errorCount = issues.filter((issue) => issue.level === 'error').length;
  const warningCount = issues.filter((issue) => issue.level === 'warning').length;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="PG Modeler" className="h-8 w-8 rounded" />
        <span className="text-xl font-semibold text-slate-800">PG Modeler</span>
        <div className="flex items-center gap-2">
          <button type="button" className={buttonBase} onClick={onNew} title="Novo projeto">
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Novo
          </button>
          <button
            type="button"
            className={buttonBase}
            onClick={handleClickImport}
            title="Importar .pgjson"
          >
            <i className="bi bi-file-earmark-arrow-up" aria-hidden="true" />
            Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.pgjson,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button type="button" className={buttonBase} onClick={onSave} title="Salvar modelo">
            <i className="bi bi-save" aria-hidden="true" />
            Salvar
          </button>
          <button type="button" className={buttonBase} onClick={onCopySql} title="Copiar SQL">
            <i className="bi bi-clipboard" aria-hidden="true" />
            Copiar SQL
          </button>
          <button type="button" className={buttonBase} onClick={onToggleErd} title="Alternar ERD">
            {showErd ? (
              <>
                <i className="bi bi-eye-slash" aria-hidden="true" />
                Ocultar ERD
              </>
            ) : (
              <>
                <i className="bi bi-eye" aria-hidden="true" />
                Mostrar ERD
              </>
            )}
          </button>
          {onStartTour && (
            <button type="button" className={buttonBase} onClick={onStartTour} title="Iniciar tutorial">
              <i className="bi bi-info-circle" aria-hidden="true" />
              Tutorial
            </button>
          )}

          {/* Login / Projects */}
          {user ? (
            <div className="inline-flex items-center gap-2">
              <button type="button" className={buttonBase} onClick={onOpenProjects} title="Meus projetos">
                <i className="bi bi-folder2-open" aria-hidden="true" />
                Meus projetos
              </button>
              <button type="button" className={buttonBase} onClick={onLogout} title="Sair">
                <img src={user.avatarUrl} alt={user.name ?? user.username} className="h-5 w-5 rounded-full" />
              </button>
            </div>
          ) : (
            <button type="button" className={buttonBase} onClick={onOpenLogin} title="Entrar com GitHub">
              <i className="bi bi-github" aria-hidden="true" />
              Entrar (GitHub)
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
        {errorCount > 0 && (
          <span className={`${badgeBase} bg-rose-100 text-rose-600`}>
            <i className="bi bi-exclamation-circle-fill mr-1" aria-hidden="true" />
            {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
          </span>
        )}
        {warningCount > 0 && (
          <span className={`${badgeBase} bg-amber-100 text-amber-600`}>
            <i className="bi bi-exclamation-triangle-fill mr-1" aria-hidden="true" />
            {warningCount} {warningCount === 1 ? 'aviso' : 'avisos'}
          </span>
        )}
        {errorCount === 0 && warningCount === 0 && (
          <span className={`${badgeBase} bg-emerald-100 text-emerald-600`}>
            <i className="bi bi-check-circle-fill mr-1" aria-hidden="true" />
            Modelo consistente
          </span>
        )}
      </div>
    </header>
  );
};
