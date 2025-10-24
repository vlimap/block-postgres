import type { MouseEvent } from 'react';
import { useCallback } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { POSTGRES_TYPES } from '../constants/postgresTypes';
import type { Column, Table } from '../types/model';

export type TableNodeData = {
  table: Table;
  schemaName: string;
  selectedColumnId?: string | null;
  onSelectColumn?: (tableId: string, columnId: string) => void;
  onUpdateColumn?: (
    tableId: string,
    columnId: string,
    patch: Partial<Column>,
  ) => void;
  onAddColumn?: (tableId: string) => void;
  onRemoveColumn?: (tableId: string, columnId: string) => void;
};

export type TableNodeType = Node<TableNodeData, 'table'>;

const badgeBase =
  'inline-flex items-center rounded-md border px-1 text-[10px] font-semibold uppercase tracking-wide';

const formInput =
  'w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200';

const handleClass =
  '!absolute !h-2.5 !w-2.5 !rounded-full !border !border-white !bg-slate-400';

export const TableNode = ({
  data,
  selected,
}: NodeProps<TableNodeType>) => {
  const {
    table,
    schemaName,
    selectedColumnId,
    onSelectColumn,
    onUpdateColumn,
    onAddColumn,
    onRemoveColumn,
  } = data;

  const handleColumnClick = useCallback(
    (event: MouseEvent, columnId: string) => {
      event.stopPropagation();
      onSelectColumn?.(table.id, columnId);
    },
    [onSelectColumn, table.id],
  );

  const handleColumnChange = useCallback(
    (columnId: string, patch: Partial<Column>) => {
      onUpdateColumn?.(table.id, columnId, patch);
    },
    [onUpdateColumn, table.id],
  );

  const handleAddColumn = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onAddColumn?.(table.id);
    },
    [onAddColumn, table.id],
  );

  const handleRemoveColumn = useCallback(
    (event: MouseEvent, columnId: string) => {
      event.stopPropagation();
      onRemoveColumn?.(table.id, columnId);
    },
    [onRemoveColumn, table.id],
  );

  return (
    <div
      className={`w-64 rounded-lg border text-left shadow-sm transition ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-200'
          : 'border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between rounded-t-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
        <span>
          {schemaName}.{table.name}
        </span>
        <button
          type="button"
          className="nodrag inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-white transition hover:border-white/60 hover:bg-white/10"
          title="Adicionar coluna"
          onClick={handleAddColumn}
          aria-label="Adicionar coluna"
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-2 p-3 text-sm">
        {table.columns.map((column) => {
          const isActive = selectedColumnId === column.id;
          return (
            <div
              key={column.id}
              className={`group relative rounded-md border px-3 py-2 transition ${
                isActive
                  ? 'border-indigo-400 bg-indigo-50/80'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Remover coluna"
                onClick={(event) => handleRemoveColumn(event, column.id)}
              >
                <i className="bi bi-trash3" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="nodrag flex w-full items-center justify-between gap-2 text-left"
                onClick={(event) => handleColumnClick(event, column.id)}
              >
                <div>
                  <span className="font-medium text-slate-800">{column.name}</span>
                  <span className="ml-1 text-xs text-slate-500">{column.type}</span>
                </div>
                <div className="flex gap-1 text-[10px]">
                  {!column.nullable && (
                    <span className={`${badgeBase} border-slate-200 bg-slate-100 text-slate-600`}>
                      NN
                    </span>
                  )}
                  {column.isPrimaryKey && (
                    <span className={`${badgeBase} border-amber-300 bg-amber-100 text-amber-700`}>
                      PK
                    </span>
                  )}
                  {column.isUnique && !column.isPrimaryKey && (
                    <span className={`${badgeBase} border-sky-300 bg-sky-100 text-sky-700`}>
                      UQ
                    </span>
                  )}
                </div>
              </button>

              {isActive && (
                <div
                  className="nodrag mt-2 space-y-2 rounded-md border border-slate-200 bg-white/95 p-2 text-xs"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <input
                    className={formInput}
                    value={column.name}
                    onChange={(event) =>
                      handleColumnChange(column.id, {
                        name: event.target.value,
                      })
                    }
                    placeholder="Nome da coluna"
                  />
                  <select
                    className={formInput}
                    value={column.type}
                    onChange={(event) =>
                      handleColumnChange(column.id, {
                        type: event.target.value,
                      })
                    }
                  >
                    <option value="">Selecione um tipo</option>
                    {POSTGRES_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={formInput}
                      placeholder="DEFAULT"
                      value={column.defaultValue ?? ''}
                      onChange={(event) =>
                        handleColumnChange(column.id, {
                          defaultValue:
                            event.target.value.trim().length > 0
                              ? event.target.value
                              : undefined,
                        })
                      }
                    />
                    <input
                      className={formInput}
                      placeholder="Comentário"
                      value={column.comment ?? ''}
                      onChange={(event) =>
                        handleColumnChange(column.id, {
                          comment:
                            event.target.value.trim().length > 0
                              ? event.target.value
                              : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={column.nullable}
                        onChange={(event) =>
                          handleColumnChange(column.id, {
                            nullable: event.target.checked,
                          })
                        }
                      />
                      <span>Nullable</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={column.isPrimaryKey}
                        onChange={(event) =>
                          handleColumnChange(column.id, {
                            isPrimaryKey: event.target.checked,
                            nullable: event.target.checked ? false : column.nullable,
                          })
                        }
                      />
                      <span>PK</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={column.isUnique}
                        onChange={(event) =>
                          handleColumnChange(column.id, {
                            isUnique: event.target.checked,
                          })
                        }
                      />
                      <span>Unique</span>
                    </label>
                  </div>
                </div>
              )}

              <Handle
                type="target"
                position={Position.Left}
                id={`target-${column.id}`}
                className={handleClass}
                style={{ top: '50%', left: -6, transform: 'translate(-50%, -50%)' }}
              />
              <Handle
                type="source"
                position={Position.Right}
                id={`source-${column.id}`}
                className={handleClass}
                style={{ top: '50%', right: -6, transform: 'translate(50%, -50%)' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
