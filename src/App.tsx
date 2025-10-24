import '@xyflow/react/dist/style.css';
import { useMemo, useState } from 'react';
import { Header } from './components/Header';
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
      />
      <div className="flex flex-1 overflow-hidden bg-slate-100">
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
    </div>
  );
};

export default App;
