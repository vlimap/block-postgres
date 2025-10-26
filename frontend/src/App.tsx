import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import type { CallBackProps } from 'react-joyride';
import { Header } from './components/Header';
import { GithubLoginModal } from './components/GithubLoginModal';
import { ProjectsModal } from './components/ProjectsModal';
import { AccountModal } from './components/AccountModal';
import { MetricsFooter } from './components/MetricsFooter';
import { PreviewPanel } from './components/PreviewPanel';
import { Sidebar } from './components/Sidebar';
import { ErdCanvas } from './components/ErdCanvas';
import { collectModelIssues } from './lib/warnings';
import { generatePostgresSql } from './lib/sqlGenerator';
import { parseModel } from './lib/modelSchema';
import { useModelStore } from './store/modelStore';
import { api, type ApiProject, type ApiUser } from './lib/api';
import { MarketingConsentModal } from './components/MarketingConsentModal';

type PreviewTab = 'json' | 'sql';

const createDownload = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const App = () => {
  const [activeTab, setActiveTab] = useState<PreviewTab>('json');
  const [runTour, setRunTour] = useState(false);
  const model = useModelStore((state) => state.model);
  const reset = useModelStore((state) => state.reset);
  const setModel = useModelStore((state) => state.setModel);
  const showErd = useModelStore((state) => state.showErd);
  const toggleErd = useModelStore((state) => state.toggleErd);

  const issues = useMemo(() => collectModelIssues(model), [model]);
  const hasBlockingErrors = issues.some((issue) => issue.level === 'error');

  const modelJson = useMemo(
    () => JSON.stringify(model, null, 2),
    [model],
  );

  const [user, setUser] = useState<ApiUser | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const list = await api.listProjects();
      setProjects(list);
    } catch (error) {
      console.error(error);
      alert('Não foi possível carregar os projetos salvos.');
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadUser = useCallback(async () => {
    setUserLoading(true);
    try {
      const current = await api.fetchCurrentUser();
      let effectiveUser = current;

      if (current) {
        const storedPrefRaw = sessionStorage.getItem('pg:marketing-pref');
        if (storedPrefRaw) {
          try {
            const storedPref = JSON.parse(storedPrefRaw);
            if (typeof storedPref?.marketingOptIn === 'boolean') {
              const result = await api.updateMarketingConsent(storedPref.marketingOptIn);
              effectiveUser = { ...current, ...result };
            }
          } catch (error) {
            console.error('Falha ao aplicar preferência de marketing armazenada', error);
          } finally {
            sessionStorage.removeItem('pg:marketing-pref');
          }
        }
      } else {
        sessionStorage.removeItem('pg:marketing-pref');
      }

      setUser(effectiveUser);
      setShowConsent(!!effectiveUser && !effectiveUser.marketingConsentAt);
      if (effectiveUser) {
        await loadProjects();
      } else {
        setProjects([]);
        setShowConsent(false);
      }
    } catch (error) {
      console.error(error);
      alert('Não foi possível verificar a sua sessão.');
    } finally {
      setUserLoading(false);
    }
  }, [loadProjects]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const authStatus = url.searchParams.get('auth');
    if (authStatus) {
      url.searchParams.delete('auth');
      window.history.replaceState({}, '', url.toString());
      void loadUser();
    }
  }, [loadUser]);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error(error);
      alert('Falha ao encerrar sessão.');
    } finally {
      setUser(null);
      setProjects([]);
      setShowProjects(false);
      setShowLogin(false);
      setShowConsent(false);
    }
  }, []);

  const handleSaveProject = async (name: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      const project = await api.createProject({ name, modelJson: model });
      setProjects((prev) => [project, ...prev]);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Erro ao salvar o projeto.');
    }
  };

  const handleLoadProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    try {
      const parsed = parseModel(project.modelJson);
      setModel(parsed);
      setShowProjects(false);
    } catch (err) {
      console.error(err);
      alert('Não foi possível carregar o projeto (formato inválido).');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Erro ao remover projeto.');
    }
  };

  const currentProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.updatedAt || p.createdAt,
  }));

  useEffect(() => {
    if (showProjects && user) {
      void loadProjects();
    }
  }, [showProjects, user, loadProjects]);

  useEffect(() => {
    if (user && !user.marketingConsentAt) {
      setShowConsent(true);
    }
  }, [user]);

  const handleMarketingConsent = useCallback(
    async (marketingOptIn: boolean) => {
      try {
        const result = await api.updateMarketingConsent(marketingOptIn);
        setUser((prev) => (prev ? { ...prev, ...result } : prev));
      } catch (error) {
        console.error(error);
        alert('Não foi possível registrar sua preferência agora.');
      } finally {
        sessionStorage.removeItem('pg:marketing-pref');
        setShowConsent(false);
      }
    },
    [],
  );

  const sql = useMemo(
    () =>
      hasBlockingErrors
        ? '-- Corrija os erros do modelo antes de gerar o SQL.'
        : generatePostgresSql(model),
    [hasBlockingErrors, model],
  );

  const metrics = useMemo(() => {
    const schemas = model.schemas.length;
    const tables = model.tables.length;
    const columns = model.tables.reduce(
      (sum, table) => sum + table.columns.length,
      0,
    );
    const indexes = model.tables.reduce((sum, table) => {
      const pk = table.columns.some((column) => column.isPrimaryKey) ? 1 : 0;
      const unique = table.columns.filter(
        (column) => column.isUnique && !column.isPrimaryKey,
      ).length;
      return sum + pk + unique;
    }, 0);
    const warnings = issues.filter((issue) => issue.level === 'warning').length;
    return { schemas, tables, columns, indexes, warnings };
  }, [issues, model.schemas.length, model.tables]);

  const handleNewProject = () => {
    reset();
    void useModelStore.persist?.clearStorage?.();
  };

  const handleImportFile = async (file: File) => {
    try {
      const contents = await file.text();
      const parsedJson = JSON.parse(contents);
      const parsedModel = parseModel(parsedJson);
      setModel(parsedModel);
    } catch (error) {
      console.error(error);
      alert('Não foi possível importar o arquivo. Verifique o formato.');
    }
  };

  const handleSave = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    createDownload(modelJson, `modelo-${timestamp}.pgjson`);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sql);
    } catch (error) {
      console.error(error);
      alert('Não foi possível copiar o SQL para a área de transferência.');
    }
  };

  useEffect(() => {
    const seen = localStorage.getItem('hasSeenTour');
    if (!seen) {
      setRunTour(true);
    }
  }, []);

  const tourSteps = [
    {
      target: '[data-tour="add-schema"]',
      content: 'Comece criando um schema. Schemas agrupam suas tabelas.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="add-table"]',
      content: 'Crie sua primeira tabela aqui.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="first-table"]',
      content: 'Esta é sua tabela. Clique para editar o nome.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="add-column"]',
      content: 'Para adicionar colunas, clique no ícone + no canto da tabela (no diagrama).',
      disableBeacon: true,
    },
    {
      target: '[data-tour="first-column"]',
      content: 'Clique numa coluna para abrir o painel de propriedades à direita. Use o ícone de lixeira para excluir.',
      disableBeacon: true,
    },
  ];

  const handleTourCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTour(false);
      localStorage.setItem('hasSeenTour', '1');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        issues={issues}
        onNew={handleNewProject}
        onImportFile={handleImportFile}
        onSave={handleSave}
        onCopySql={handleCopySql}
        onToggleErd={toggleErd}
        showErd={showErd}
        onStartTour={() => setRunTour(true)}
        user={user ? { name: user.name, avatarUrl: user.avatarUrl } : null}
        isUserLoading={userLoading}
        onOpenLogin={() => setShowLogin(true)}
        onOpenProjects={() => setShowProjects(true)}
        onOpenAccount={() => setShowAccount(true)}
      />
      {/* Joyride guided tour */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        callback={handleTourCallback}
        styles={{ options: { zIndex: 10000 } }}
        locale={{
          back: 'Anterior',
          close: 'Fechar',
          last: 'Finalizar',
          next: 'Próximo',
          skip: 'Pular',
        }}
      />
  {/* garantir que a área principal possa conter filhos com overflow: auto */}
  <div className="flex flex-1 flex-col overflow-hidden bg-slate-100 min-h-0 lg:flex-row">
        <div className="flex w-full flex-col overflow-y-auto border-b border-slate-200 bg-slate-50 lg:w-80 lg:flex-shrink-0 lg:border-b-0 lg:border-r">
          <Sidebar />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <main className="flex flex-1 items-stretch overflow-hidden bg-slate-100">
          {showErd ? (
            <div className="flex-1 bg-slate-100">
              <ErdCanvas />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              ERD oculto. Ative novamente para visualizar o diagrama.
            </div>
          )}
        </main>
        <PreviewPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          modelJson={modelJson}
          sql={sql}
        issues={issues}
        />
        </div>
      </div>
      <MetricsFooter
        schemas={metrics.schemas}
        tables={metrics.tables}
        columns={metrics.columns}
        indexes={metrics.indexes}
        warnings={metrics.warnings}
      />

      {/* Modals for login and projects */}
      <GithubLoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      <ProjectsModal
        open={showProjects}
        onClose={() => setShowProjects(false)}
        projects={currentProjects}
        onSave={(name: string) => handleSaveProject(name)}
        onLoad={(id: string) => handleLoadProject(id)}
        onDelete={(id: string) => handleDeleteProject(id)}
        loading={projectsLoading}
      />
      {user && (
        <AccountModal
          open={showAccount}
          onClose={() => setShowAccount(false)}
          user={user}
          onLogout={handleLogout}
          onToggleMarketing={handleMarketingConsent}
        />
      )}
      <MarketingConsentModal
        open={showConsent}
        onAccept={() => handleMarketingConsent(true)}
        onDecline={() => handleMarketingConsent(false)}
      />
    </div>
  );
};

export default App;
