import { useMemo, useState } from 'react';

type Project = { id: string; name: string; createdAt: string };

type Props = {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
};

export const ProjectsModal = ({ open, onClose, projects, onSave, onLoad, onDelete, loading }: Props) => {
  const [newName, setNewName] = useState('');
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [projects],
  );

  if (!open) return null;

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onSave(name);
    setNewName('');
  };

  const handleDelete = (id: string, name: string) => {
    const confirmed = window.confirm(`Remover o projeto "${name}"? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;
    onDelete(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Seus projetos</h3>
            <p className="text-sm text-slate-500">Salve, organize e reabra diagramas quando precisar.</p>
          </div>
          <button
            type="button"
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6">
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Novo projeto</label>
              <p className="text-sm text-slate-600">Defina um nome e clique em salvar para criar um snapshot do diagrama atual.</p>
            </div>
            <div className="mt-3 flex w-full flex-col gap-2 sm:mt-0 sm:max-w-sm">
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="Ex.: CRM_prod"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                <i className="bi bi-save me-2" aria-hidden="true" />
                Salvar projeto
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between pb-2">
              <h4 className="text-sm font-semibold text-slate-700">Projetos salvos</h4>
              {loading && <span className="text-xs text-slate-500">Carregando...</span>}
            </div>
            <div className="max-h-80 overflow-y-auto overflow-x-hidden pr-1">
              {loading ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                  Recuperando projetos...
                </div>
              ) : sortedProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                  Você ainda não salvou nenhum projeto. Crie um snapshot usando o formulário acima.
                </div>
              ) : (
                <ul className="space-y-3">
                  {sortedProjects.map((project) => (
                    <li
                      key={project.id}
                      className="group rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-brand-200 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{project.name}</p>
                          <p className="text-xs text-slate-500">
                            Atualizado em {new Date(project.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                            onClick={() => onLoad(project.id)}
                          >
                            <i className="bi bi-folder2-open" aria-hidden="true" />
                            Abrir
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                            onClick={() => handleDelete(project.id, project.name)}
                          >
                            <i className="bi bi-trash" aria-hidden="true" />
                            Remover
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
