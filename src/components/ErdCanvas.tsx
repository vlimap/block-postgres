import type { MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
} from '@xyflow/react';
import type { Column, Table } from '../types/model';
import { computeLayout } from '../lib/layout';
import { useModelStore } from '../store/modelStore';
import { CrowFootEdge, type CrowFootEdgeType } from './CrowFootEdge';
import { TableNode, type TableNodeType } from './TableNode';

const nodeTypes = {
  table: TableNode,
} satisfies NodeTypes;

const edgeTypes = {
  crowFoot: CrowFootEdge,
} satisfies EdgeTypes;

const placeholderPosition = (index: number): { x: number; y: number } => ({
  x: (index % 3) * 280,
  y: Math.floor(index / 3) * 200,
});

const buildEdgeLabel = (
  table: Table,
  fkTable: Table | undefined,
  fromColumnName: string | undefined,
  toColumnName: string | undefined,
): string => {
  if (!fkTable || !fromColumnName || !toColumnName) {
    return table.name;
  }
  return `${table.name}.${fromColumnName} → ${fkTable.name}.${toColumnName}`;
};

const ErdCanvasInner = () => {
  const model = useModelStore((state) => state.model);
  const selectedTableId = useModelStore((state) => state.selectedTableId);
  const selectedColumnId = useModelStore((state) => state.selectedColumnId);
  const setSelectedTableId = useModelStore((state) => state.setSelectedTableId);
  const setSelectedColumnId = useModelStore((state) => state.setSelectedColumnId);
  const setTablePosition = useModelStore((state) => state.setTablePosition);
  const setTablePositions = useModelStore((state) => state.setTablePositions);
  const updateColumn = useModelStore((state) => state.updateColumn);
  const addColumn = useModelStore((state) => state.addColumn);
  const removeColumn = useModelStore((state) => state.removeColumn);

  const schemaById = useMemo(
    () => new Map(model.schemas.map((schema) => [schema.id, schema.name])),
    [model.schemas],
  );

  const tablesById = useMemo(
    () => new Map(model.tables.map((table) => [table.id, table])),
    [model.tables],
  );

  const handleSelectColumn = useCallback(
    (tableId: string, columnId: string) => {
      setSelectedTableId(tableId);
      setSelectedColumnId(columnId);
    },
    [setSelectedColumnId, setSelectedTableId],
  );

  const handleUpdateColumn = useCallback(
    (tableId: string, columnId: string, patch: Partial<Column>) => {
      updateColumn(tableId, columnId, patch);
    },
    [updateColumn],
  );

  const handleAddColumn = useCallback(
    (tableId: string) => {
      addColumn(tableId);
    },
    [addColumn],
  );

  const handleRemoveColumn = useCallback(
    (tableId: string, columnId: string) => {
      removeColumn(tableId, columnId);
    },
    [removeColumn],
  );

  const nodes = useMemo<TableNodeType[]>(() => {
    return model.tables.map((table, index) => ({
      id: table.id,
      type: 'table',
      data: {
        table,
        schemaName: schemaById.get(table.schemaId) ?? 'public',
        selectedColumnId,
        onSelectColumn: handleSelectColumn,
        onUpdateColumn: handleUpdateColumn,
        onAddColumn: handleAddColumn,
        onRemoveColumn: handleRemoveColumn,
      },
      position: table.position ?? placeholderPosition(index),
      draggable: true,
      selectable: true,
      selected: table.id === selectedTableId,
    }));
  }, [
    model.tables,
    schemaById,
    selectedTableId,
    selectedColumnId,
    handleSelectColumn,
    handleUpdateColumn,
    handleAddColumn,
    handleRemoveColumn,
  ]);

  const edges = useMemo<CrowFootEdgeType[]>(() => {
    const list: CrowFootEdgeType[] = [];
    model.tables.forEach((table) => {
      table.foreignKeys.forEach((fk) => {
        const targetTable = tablesById.get(fk.toTableId);
        const fromColumn = table.columns.find(
          (column) => column.id === fk.fromColumnId,
        );
        const toColumn = targetTable?.columns.find(
          (column) => column.id === fk.toColumnId,
        );
        if (!targetTable || !fromColumn || !toColumn) {
          return;
        }

        list.push({
          id: fk.id,
          source: table.id,
          target: fk.toTableId,
          type: 'crowFoot',
          animated: false,
          sourceHandle: `source-${fromColumn.id}`,
          targetHandle: `target-${toColumn.id}`,
          data: {
            label: buildEdgeLabel(
              table,
              targetTable,
              fromColumn?.name,
              toColumn?.name,
            ),
          },
        });
      });
    });
    return list;
  }, [model.tables, tablesById]);

  const [rfNodes, setRfNodes] = useState<TableNodeType[]>(nodes);

  useEffect(() => {
    setRfNodes(nodes);
  }, [nodes]);

  const onNodesChange = useCallback<OnNodesChange<TableNodeType>>(
    (changes) => {
      setRfNodes((current) => applyNodeChanges<TableNodeType>(changes, current));
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          setTablePosition(change.id, change.position);
        }
        if (change.type === 'select' && typeof change.selected === 'boolean') {
          if (change.selected) {
            setSelectedTableId(change.id);
          }
        }
      });
    },
    [setSelectedTableId, setTablePosition],
  );

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: TableNodeType) => {
      setTablePosition(node.id, node.position);
    },
    [setTablePosition],
  );

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: TableNodeType) => {
      setSelectedTableId(node.id);
    },
    [setSelectedTableId],
  );

  const handlePaneClick = useCallback(() => {
    setSelectedColumnId(null);
  }, [setSelectedColumnId]);

  const [isLayouting, setIsLayouting] = useState(false);
  const handleAutoLayout = useCallback(async () => {
    setIsLayouting(true);
    try {
      const positions = await computeLayout(model);
      setTablePositions(positions);
    } finally {
      setIsLayouting(false);
    }
  }, [model, setTablePositions]);

  useEffect(() => {
    const needsLayout = model.tables.some((table) => !table.position);
    if (needsLayout && model.tables.length > 0) {
      void handleAutoLayout();
    }
  }, [model.tables, handleAutoLayout]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background color="#e2e8f0" gap={24} />
        <Controls className="bg-white/95" />
        <MiniMap
          className="!bg-white/90 !shadow"
          nodeColor={() => '#1d4ed8'}
          nodeStrokeColor={() => '#1e293b'}
        />
      </ReactFlow>
      <div className="absolute right-3 top-3 flex gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleAutoLayout}
          disabled={isLayouting || model.tables.length === 0}
        >
          {isLayouting ? 'Organizando...' : 'Auto layout'}
        </button>
      </div>
    </div>
  );
};

export const ErdCanvas = () => (
  <ReactFlowProvider>
    <ErdCanvasInner />
  </ReactFlowProvider>
);
