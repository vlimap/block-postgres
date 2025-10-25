import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import type { CallBackProps } from 'react-joyride';
import { Header } from './components/Header';
import { GithubLoginModal } from './components/GithubLoginModal';
import { ProjectsModal } from './components/ProjectsModal';
import { MetricsFooter } from './components/MetricsFooter';
import { PreviewPanel } from './components/PreviewPanel';
import { Sidebar } from './components/Sidebar';
import { ErdCanvas } from './components/ErdCanvas';
import { collectModelIssues } from './lib/warnings';
import { generatePostgresSql } from './lib/sqlGenerator';
import { parseModel } from './lib/modelSchema';
import { useModelStore } from './store/modelStore';

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

  // --- Simple GitHub "login" (username only) stored in localStorage ---
  const [user, setUser] = useState<{ username: string; name?: string; avatarUrl?: string } | null>(() => {
    try {
      const raw = localStorage.getItem('pg:user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [showLogin, setShowLogin] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  const projectsKeyFor = (username: string) => `pg:projects:${username}`;

  const getProjects = (username: string) => {
    try {
      const raw = localStorage.getItem(projectsKeyFor(username));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveProjectForUser = (username: string, project: { id: string; name: string; modelJson: string; createdAt: string }) => {
    const list = getProjects(username);
    list.unshift(project);
    localStorage.setItem(projectsKeyFor(username), JSON.stringify(list));
  };

  const deleteProjectForUser = (username: string, id: string) => {
    const list = getProjects(username).filter((p: any) => p.id !== id);
    localStorage.setItem(projectsKeyFor(username), JSON.stringify(list));
  };

  const handleLogin = (u: { username: string; name?: string; avatarUrl?: string }) => {
    setUser(u);
    localStorage.setItem('pg:user', JSON.stringify(u));
    setShowLogin(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pg:user');
  };

  const handleSaveProject = (name: string) => {
    if (!user) return;
    const id = `p_${Date.now()}`;
    saveProjectForUser(user.username, { id, name, modelJson, createdAt: new Date().toISOString() });
  };

  const handleLoadProject = (id: string) => {
    if (!user) return;
    const list = getProjects(user.username);
    const p = list.find((x: any) => x.id === id);
    if (!p) return;
    try {
      const parsed = JSON.parse(p.modelJson);
      setModel(parsed as any);
      setShowProjects(false);
    } catch (err) {
      alert('Não foi possível carregar o projeto (formato inválido).');
    }
  };

  const handleDeleteProject = (id: string) => {
    if (!user) return;
    deleteProjectForUser(user.username, id);
  };

  const currentProjects = user ? getProjects(user.username) : [];

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
        user={user}
        onOpenLogin={() => setShowLogin(true)}
        onOpenProjects={() => setShowProjects(true)}
        onLogout={handleLogout}
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
  <div className="flex flex-1 overflow-hidden bg-slate-100 min-h-0">
        <Sidebar />
        <main className="flex flex-1 items-stretch overflow-hidden">
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
      <MetricsFooter
        schemas={metrics.schemas}
        tables={metrics.tables}
        columns={metrics.columns}
        indexes={metrics.indexes}
        warnings={metrics.warnings}
      />

      {/* Modals for login and projects */}
      <GithubLoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />
      <ProjectsModal
        open={showProjects}
        onClose={() => setShowProjects(false)}
        projects={currentProjects}
        onSave={(name: string) => handleSaveProject(name)}
        onLoad={(id: string) => handleLoadProject(id)}
        onDelete={(id: string) => handleDeleteProject(id)}
      />
    </div>
  );
};

export default App;
