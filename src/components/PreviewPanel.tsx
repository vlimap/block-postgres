import type { ModelIssue } from '../lib/warnings';

type PreviewTab = 'json' | 'sql';

type PreviewPanelProps = {
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  modelJson: string;
  sql: string;
  issues: ModelIssue[];
};

const tabButton =
  'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold';

export const PreviewPanel = ({
  activeTab,
  onTabChange,
  modelJson,
  sql,
  issues,
}: PreviewPanelProps) => {
  const errorIssues = issues.filter((issue) => issue.level === 'error');
  const warningIssues = issues.filter((issue) => issue.level === 'warning');

  return (
    <aside className="flex w-[28rem] flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            className={`${tabButton} ${
              activeTab === 'json'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-600'
            }`}
            onClick={() => onTabChange('json')}
          >
            Modelo (JSON)
          </button>
          <button
            type="button"
            className={`${tabButton} ${
              activeTab === 'sql'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-600'
            }`}
            onClick={() => onTabChange('sql')}
          >
            SQL Preview
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        <pre className="h-full whitespace-pre-wrap break-words bg-white p-4 font-mono text-xs text-slate-800">
          {activeTab === 'json' ? modelJson : sql}
        </pre>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        {errorIssues.length === 0 && warningIssues.length === 0 && (
          <p>Sem inconsistências detectadas.</p>
        )}
        {errorIssues.length > 0 && (
          <div className="mb-2">
            <p className="font-semibold text-rose-600">
              {errorIssues.length} {errorIssues.length === 1 ? 'erro' : 'erros'}
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-rose-600">
              {errorIssues.map((issue, index) => (
                <li key={`error-${index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
        {warningIssues.length > 0 && (
          <div>
            <p className="font-semibold text-amber-600">
              {warningIssues.length}{' '}
              {warningIssues.length === 1 ? 'aviso' : 'avisos'}
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-amber-600">
              {warningIssues.map((issue, index) => (
                <li key={`warning-${index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};
