import type { MouseEvent } from 'react';
import { useCallback } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
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

const handleClass =
  '!absolute !h-2.5 !w-2.5 !rounded-full !border !border-white !bg-brand-400';

export const TableNode = ({ data, selected }: NodeProps<TableNodeType>) => {
  const { table, schemaName, onSelectColumn } = data;

  const handleColumnClick = useCallback(
    (event: MouseEvent, columnId: string) => {
      event.stopPropagation();
      onSelectColumn?.(table.id, columnId);
    },
    [onSelectColumn, table.id],
  );

  return (
    <div
      className={`w-64 rounded-lg border text-left shadow-sm transition ${
        selected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between rounded-t-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
        <span>
          {schemaName}.{table.name}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="nodrag inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-white transition hover:border-white/60 hover:bg-white/10"
            title="Editar tabela"
            aria-label="Editar tabela"
          >
            <i className="bi bi-pencil" />
          </button>
          <button
            type="button"
            data-tour="add-column"
            className="nodrag inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-white transition hover:border-white/60 hover:bg-white/10"
            title="Adicionar coluna"
            aria-label="Adicionar coluna"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddColumn?.(table.id);
            }}
          >
            <i className="bi bi-plus" />
          </button>
          {/* marcador para o tutorial: adicionar coluna */}
        </div>
      </div>

      <div className="space-y-2 p-3 text-sm">
        {table.columns.map((column) => (
          <div
            key={column.id}
            className="rounded-md border px-3 py-2 bg-white"
            data-column-id={column.id}
          >
            <button
              type="button"
              className="nodrag flex w-full items-center justify-between gap-2 text-left"
              onClick={(event) => handleColumnClick(event as any, column.id)}
            >
              <div className="flex items-start">
                <i className="bi bi-grip-vertical mr-2 mt-0.5 text-slate-300" aria-hidden="true" />
                <div className="flex flex-col text-left">
                  <span className="font-medium text-slate-800">{column.name}</span>
                  <span className="text-xs text-slate-500">
                    {column.type}
                    {column.defaultValue ? ` • default ${column.defaultValue}` : ''}
                  </span>
                  {column.comment && (
                    <span className="text-[11px] text-slate-400">{column.comment}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 text-[10px]">
                {!column.nullable && (
                  <span className={`${badgeBase} border-slate-200 bg-slate-100 text-slate-600`}>NN</span>
                )}
                {column.isPrimaryKey && (
                  <span className={`${badgeBase} border-amber-300 bg-amber-100 text-amber-700`}>PK</span>
                )}
                {column.isUnique && !column.isPrimaryKey && (
                  <span className={`${badgeBase} border-sky-300 bg-sky-100 text-sky-700`}>UQ</span>
                )}
              </div>
            </button>

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
        ))}
      </div>
    </div>
  );
};
