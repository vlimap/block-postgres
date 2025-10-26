import { useEffect, useRef, useState } from 'react';
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
  user?: { name: string; avatarUrl: string | null } | null;
  isUserLoading?: boolean;
  onOpenLogin?: () => void;
  onOpenProjects?: () => void;
  onOpenAccount?: () => void;
};

const buttonBase =
  'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60';

const badgeBase =
  'inline-flex items-center rounded-full px-2 text-xs font-semibold';

const GITHUB_REPO_URL = 'https://github.com/vlimap/block-postgres';
const KOFI_WIDGET_SCRIPT = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
const KOFI_CONTAINER_ID = 'ko-fi-widget-inline';

declare global {
  interface Window {
    kofiwidget2?: {
      init(label: string, color: string, code: string): void;
      draw(target?: string): void;
    };
  }
}

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
  isUserLoading,
  onOpenLogin,
  onOpenProjects,
  onOpenAccount,
}: HeaderProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const [widgetRequested, setWidgetRequested] = useState(false);

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
  const hasStatusBadges = errorCount > 0 || warningCount > 0;

  useEffect(() => {
    // No-op: widget load happens on demand via loadKoFiWidget() to ensure exact script order
  }, [widgetRequested]);

  // when user requests the widget, inject the exact scripts
  useEffect(() => {
    if (widgetRequested) loadKoFiWidget();
  }, [widgetRequested]);

  const loadKoFiWidget = () => {
    if (!widgetRequested) return;
    setWidgetFailed(false);

    // If widget already mounted, do nothing
    const container = document.getElementById(KOFI_CONTAINER_ID);
    if (container && container.querySelector('iframe')) {
      return;
    }

    // If the loader script already exists, attach onload to inject the inline script; otherwise create it
    const existingScript = document.getElementById('ko-fi-widget-loader') as HTMLScriptElement | null;
    const injectInline = () => {
      // create the exact inline script the user requested
      const inline = document.createElement('script');
      inline.type = 'text/javascript';
      inline.text = "kofiwidget2.init('Doe um café', '#1b4070', 'I2I5GOM2U');kofiwidget2.draw();";
      document.body.appendChild(inline);

      // health-check: if no iframe after 2s, mark failed
      setTimeout(() => {
        const c = document.getElementById(KOFI_CONTAINER_ID);
        if (!c) return;
        if (!c.querySelector('iframe')) setWidgetFailed(true);
      }, 2000);
    };

    if (existingScript) {
      // if script already loaded, inject inline immediately or on load
      if ((existingScript as any).getAttribute('data-loaded') === '1' || (window as any).kofiwidget2) {
        injectInline();
      } else {
        existingScript.addEventListener('load', () => {
          (existingScript as any).setAttribute('data-loaded', '1');
          injectInline();
        }, { once: true });
      }
      return;
    }

    const s = document.createElement('script');
    s.id = 'ko-fi-widget-loader';
    s.type = 'text/javascript';
    s.src = KOFI_WIDGET_SCRIPT;
    s.async = true;
    s.onload = () => {
      (s as any).setAttribute('data-loaded', '1');
      injectInline();
    };
    s.onerror = () => {
      setWidgetFailed(true);
    };
    document.body.appendChild(s);
  };

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
              <button type="button" className={buttonBase} onClick={onOpenAccount} title="Conta">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-5 w-5 rounded-full" />
                ) : (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <button type="button" className={buttonBase} onClick={onOpenLogin} title="Entrar com GitHub" disabled={isUserLoading}>
              <i className="bi bi-github" aria-hidden="true" />
              {isUserLoading ? 'Verificando...' : 'Entrar (GitHub)'}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className={buttonBase}
          title="Abrir projeto no GitHub"
        >
          <i className="bi bi-github" aria-hidden="true" />
          GitHub
        </a>

        {/* Ko-fi: show simple link by default; user can request to load the embedded widget */}
        {!widgetRequested && (
          <div className="flex items-center gap-2">
            <a
              href="https://ko-fi.com/I2I5GOM2U"
              target="_blank"
              rel="noreferrer"
              className={buttonBase}
              title="Doar no Ko‑fi"
            >
              <i className="bi bi-cup-straw" aria-hidden="true" />
              Doe um café
            </a>
            
          </div>
        )}

        {/* container for the embedded widget (loaded on demand) */}
        {widgetRequested && !widgetFailed && (
          <div id={KOFI_CONTAINER_ID} className="flex items-center" style={{ minWidth: 180 }} />
        )}
        {widgetFailed && (
          <a
            href="https://ko-fi.com/I2I5GOM2U"
            target="_blank"
            rel="noreferrer"
            className={buttonBase}
            title="Doar no Ko‑fi"
          >
            <i className="bi bi-cup-straw" aria-hidden="true" />
            Ko‑fi
          </a>
        )}
        {hasStatusBadges && (
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
          </div>
        )}
      </div>
    </header>
  );
};
