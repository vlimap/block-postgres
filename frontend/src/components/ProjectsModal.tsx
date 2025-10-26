import { useState } from 'react';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Meus projetos</h3>
          <button type="button" className="text-sm text-slate-600" onClick={onClose}>Fechar</button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded border px-2 py-1"
              placeholder="Nome do projeto"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="button"
              className="rounded bg-brand-600 px-3 py-1 text-white hover:bg-brand-500"
              onClick={() => {
                if (!newName.trim()) return;
                onSave(newName.trim());
                setNewName('');
              }}
            >
              Salvar
            </button>
          </div>

          <div className="max-h-80 overflow-auto">
            {loading ? (
              <p className="text-sm text-slate-600">Carregando projetos...</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhum projeto salvo ainda.</p>
            ) : (
              <ul className="space-y-2">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => onLoad(p.id)}>
                        Abrir
                      </button>
                      <button type="button" className="rounded border px-2 py-1 text-sm text-rose-600" onClick={() => onDelete(p.id)}>
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
