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
        <span className="text-xl font-semibold text-slate-800">PG Modeler</span>
        <div className="flex items-center gap-2">
          <button type="button" className={buttonBase} onClick={onNew}>
            Novo
          </button>
          <button
            type="button"
            className={buttonBase}
            onClick={handleClickImport}
          >
            Importar .pgjson
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.pgjson,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button type="button" className={buttonBase} onClick={onSave}>
            Salvar
          </button>
          <button type="button" className={buttonBase} onClick={onCopySql}>
            Copiar SQL
          </button>
          <button type="button" className={buttonBase} onClick={onToggleErd}>
            {showErd ? 'Ocultar ERD' : 'Mostrar ERD'}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
        {errorCount > 0 && (
          <span className={`${badgeBase} bg-rose-100 text-rose-600`}>
            {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
          </span>
        )}
        {warningCount > 0 && (
          <span className={`${badgeBase} bg-amber-100 text-amber-600`}>
            {warningCount} {warningCount === 1 ? 'aviso' : 'avisos'}
          </span>
        )}
        {errorCount === 0 && warningCount === 0 && (
          <span className={`${badgeBase} bg-emerald-100 text-emerald-600`}>
            Modelo consistente
          </span>
        )}
      </div>
    </header>
  );
};
