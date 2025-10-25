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
import KeyBindings from './KeyBindings';
import { useRef } from 'react';
import type { Column, Table } from '../types/model';
import { computeLayout } from '../lib/layout';
import { useModelStore } from '../store/modelStore';
import { CrowFootEdge, type CrowFootEdgeType, computeKindsFromModel, computeKindsForEdgeData } from './CrowFootEdge';
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
  const addForeignKey = useModelStore((state) => state.addForeignKey);
  const updateForeignKey = useModelStore((state) => state.updateForeignKey);

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

  // multiple selection support
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const removeTable = useModelStore((s) => s.removeTable);

  const handleUpdateColumn = useCallback(
    (tableId: string, columnId: string, patch: Partial<Column>) => {
      updateColumn(tableId, columnId, patch);
    },
    [updateColumn],
  );

  const handleAddColumn = useCallback(
    (tableId: string) => {
      // create column and ensure the table is selected so the properties panel appears
      addColumn(tableId);
      setSelectedTableId(tableId);
    },
    [addColumn, setSelectedTableId],
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
      // when multi-selected, mark selected if present in selectedNodeIds
      selected:
        (selectedNodeIds.length > 0 && selectedNodeIds.includes(table.id)) ||
        (selectedNodeIds.length === 0 && table.id === selectedTableId),
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
    selectedNodeIds,
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

        // determine cardinality: prefer stored FK overrides, otherwise infer
        const sourceKind =
          (fk as any).startCardinality ??
          (fromColumn.nullable ? 'zero_or_one' : 'one');

        const fromIsUnique = fromColumn.isUnique || fromColumn.isPrimaryKey;
        const inferredTargetKind:
          | 'many'
          | 'one'
          | 'one_and_only_one'
          | 'zero_or_one'
          | 'one_or_many'
          | 'zero_or_many' = fromIsUnique
          ? (fromColumn.nullable ? 'zero_or_one' : 'one_and_only_one')
          : (fromColumn.nullable ? 'zero_or_many' : 'one_or_many');

        const endKind = (fk as any).endCardinality ?? inferredTargetKind;

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
            // pass cardinality hints to the edge renderer
            start: sourceKind as any,
            end: endKind as any,
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
          // selection change: if multi-select is active (shift click), manage selectedNodeIds
          if (change.selected) {
            // if shift key not pressed, replace selection
            setSelectedNodeIds((prev) => {
              if (prev.length === 0) {
                return [change.id];
              }
              // keep existing selection (multi-select handled on click)
              return prev.includes(change.id) ? prev : [...prev, change.id];
            });
            setSelectedTableId(change.id);
          } else {
            setSelectedNodeIds((prev) => prev.filter((id) => id !== change.id));
            if (selectedTableId === change.id) {
              setSelectedTableId(null);
            }
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
    (event: MouseEvent, node: TableNodeType) => {
      const ev = event as MouseEvent & { shiftKey?: boolean };
      if (ev.shiftKey) {
        setSelectedNodeIds((prev) =>
          prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id],
        );
      } else {
        setSelectedNodeIds([node.id]);
      }
      setSelectedTableId(node.id);
    },
    [setSelectedTableId],
  );

    // Keep FK cardinalities in sync with model facts (nullable / unique)
    useEffect(() => {
      model.tables.forEach((table) => {
        table.foreignKeys.forEach((fk) => {
          const { start, end } = computeKindsForEdgeData(
            {
              sourceTableId: table.id,
              sourceColumnId: fk.fromColumnId,
              targetTableId: fk.toTableId,
              targetColumnId: fk.toColumnId,
            },
            model,
          );
          if (fk.startCardinality !== start || fk.endCardinality !== end) {
            updateForeignKey(table.id, fk.id, { startCardinality: start, endCardinality: end });
          }
        });
      });
    }, [model.tables, model, updateForeignKey]);

    // Ensure created connections always use FK -> referenced direction.
    const onConnect = useCallback(
      (connection: any) => {
        const { source, sourceHandle, target, targetHandle } = connection;
        if (!source || !target || !sourceHandle || !targetHandle) return;

        const parseHandle = (h: string) => {
          const parts = String(h).split('-');
          return parts.slice(1).join('-');
        };

        const srcHandleCol = parseHandle(sourceHandle);
        const tgtHandleCol = parseHandle(targetHandle);

        // assume source node is FK owner
        let fkTableId = source;
        let fkColId = srcHandleCol;
        let refTableId = target;
        let refColId = tgtHandleCol;

        const srcTable = tablesById.get(source);
        const tgtTable = tablesById.get(target);

        const srcHasSrcCol = !!srcTable?.columns.some((c) => c.id === srcHandleCol);
        const tgtHasTgtCol = !!tgtTable?.columns.some((c) => c.id === tgtHandleCol);

        if (!srcHasSrcCol || !tgtHasTgtCol) {
          // maybe reversed; try swap
          const srcHasTgtCol = !!srcTable?.columns.some((c) => c.id === tgtHandleCol);
          const tgtHasSrcCol = !!tgtTable?.columns.some((c) => c.id === srcHandleCol);
          if (srcHasTgtCol && tgtHasSrcCol) {
            fkTableId = target;
            fkColId = tgtHandleCol;
            refTableId = source;
            refColId = srcHandleCol;
          } else {
            return;
          }
        }

        const fkTable = tablesById.get(fkTableId);
        const refTable = tablesById.get(refTableId);
        const fkCol = fkTable?.columns.find((c) => c.id === fkColId);
        const refCol = refTable?.columns.find((c) => c.id === refColId);
        if (!fkCol || !refCol) return;

        const fkNullable = !!fkCol.nullable;
        const refIsUnique = !!(refCol.isPrimaryKey || refCol.isUnique);
        const { start, end } = computeKindsFromModel({ fkNullable, refIsUnique });

        const fk = {
          name: `${fkTable?.name}_${fkCol?.name}_fk`,
          fromColumnId: fkColId,
          toTableId: refTableId,
          toColumnId: refColId,
          startCardinality: start,
          endCardinality: end,
        };

        addForeignKey(fkTableId, fk as any);
      },
      [tablesById, addForeignKey],
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

  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });

  const exportAsImage = async (type: 'png' | 'svg' | 'pdf') => {
    const wrapper = containerRef.current;
    if (!wrapper) return;
    const flowEl = wrapper.querySelector('.react-flow') as HTMLElement | null;
    if (!flowEl) return;

    const buildVectorSVG = (): string => {
      const tableWidth = 256;
      const headerHeight = 44;
      const rowHeight = 44;
      const radius = 10;
      const padding = 8;

      // determine bounds to set viewBox
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      const tableRects = model.tables.map((table) => {
        const x = table.position?.x ?? 0;
        const y = table.position?.y ?? 0;
        const h = headerHeight + table.columns.length * rowHeight;
        minX = Math.min(minX, x - padding);
        minY = Math.min(minY, y - padding);
        maxX = Math.max(maxX, x + tableWidth + padding);
        maxY = Math.max(maxY, y + h + padding);
        return { table, x, y, w: tableWidth, h };
      });

      if (minX === Infinity) {
        minX = 0;
        minY = 0;
        maxX = 800;
        maxY = 600;
      }

      const width = Math.ceil(maxX - minX);
      const height = Math.ceil(maxY - minY);

      const escape = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // helper to compute column y
      const columnY = (rect: { y: number }, idx: number) => rect.y + headerHeight + idx * rowHeight + rowHeight / 2;

      // build markers defs
      const defs = `
        <defs>
          <marker id="mf_crow" markerWidth="20" markerHeight="20" refX="18" refY="10" orient="auto" markerUnits="strokeWidth">
            <path d="M2,2 L18,10 L2,18 L6,10 Z" fill="none" stroke="#475569" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          </marker>
          <marker id="mf_bar" markerWidth="6" markerHeight="20" refX="3" refY="10" orient="auto" markerUnits="strokeWidth">
            <path d="M3,4 L3,16" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
          </marker>
          <marker id="mf_circle" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto" markerUnits="strokeWidth">
            <circle cx="6" cy="6" r="3" stroke="#475569" stroke-width="1.5" fill="none" />
          </marker>
        </defs>`;

      // build edge paths
      const edgePaths: string[] = [];
      model.tables.forEach((table) => {
        table.foreignKeys.forEach((fk) => {
          const target = model.tables.find((t) => t.id === fk.toTableId);
          if (!target) return;
          const fromRect = tableRects.find((r) => r.table.id === table.id)!;
          const toRect = tableRects.find((r) => r.table.id === target.id)!;
          const fromColIndex = table.columns.findIndex((c) => c.id === fk.fromColumnId);
          const toColIndex = target.columns.findIndex((c) => c.id === fk.toColumnId);
          if (fromColIndex < 0 || toColIndex < 0) return;

          const sx = fromRect.x + fromRect.w;
          const sy = columnY(fromRect, fromColIndex);
          const tx = toRect.x;
          const ty = columnY(toRect, toColIndex);

          const midX = (sx + tx) / 2;
          const path = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;

          // determine marker types
          const fromColumn = table.columns[fromColIndex];
          const sourceKind = (fk as any).startCardinality ?? (fromColumn.nullable ? 'zero_or_one' : 'one');
          const fromIsUnique = fromColumn.isUnique || fromColumn.isPrimaryKey;
          const inferredTargetKind = fromIsUnique ? (fromColumn.nullable ? 'zero_or_one' : 'one_and_only_one') : (fromColumn.nullable ? 'zero_or_many' : 'one_or_many');
          const endKind = (fk as any).endCardinality ?? inferredTargetKind;

          // pick marker id for start/end
          const startMarker = sourceKind.includes('zero') ? 'mf_circle' : sourceKind.includes('one') && !sourceKind.includes('many') ? 'mf_bar' : 'mf_crow';
          const endMarker = endKind.includes('zero') && endKind.includes('many') ? 'mf_circle' : endKind.includes('many') ? 'mf_crow' : endKind.includes('one') && !endKind.includes('many') ? 'mf_bar' : 'mf_crow';

          edgePaths.push(`<path d="${path}" stroke="#475569" stroke-width="2" fill="none" marker-start="url(#${startMarker})" marker-end="url(#${endMarker})"/>`);
        });
      });

      // build table svg
      const tableSvgs = tableRects.map((r) => {
        const cols = r.table.columns
          .map((c, i) => {
            const y = Math.round(headerHeight + i * rowHeight + rowHeight / 2);
            return `<text x="${r.x + 12}" y="${r.y + y}" font-family="Inter, Arial, sans-serif" font-size="12" fill="#0f172a">${escape(c.name)}</text>`;
          })
          .join('\n');

        const rect = `<rect x="${r.x}" y="${r.y}" rx="${radius}" ry="${radius}" width="${r.w}" height="${r.h}" fill="#ffffff" stroke="#e6eef7" stroke-width="1.5"/>`;
        const header = `<rect x="${r.x}" y="${r.y}" rx="${radius}" ry="${radius}" width="${r.w}" height="${headerHeight}" fill="#0f172a"/>`;
        const titleText = `<text x="${r.x + 12}" y="${r.y + 28}" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="#ffffff">${escape(r.table.name)}</text>`;
        return `${rect}\n${header}\n${titleText}\n${cols}`;
      });

      const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">\n${defs}\n<g>${edgePaths.join('\n')}</g>\n<g>${tableSvgs.join('\n')}</g>\n</svg>`;
      return svg;
    };

    if (type === 'svg') {
      const svgContent = buildVectorSVG();
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'diagrama.svg';
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }

    if (type === 'pdf') {
      try {
        const svgContent = buildVectorSVG();
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = async () => {
          // convert px to mm
          const pxToMm = (px: number) => (px * 25.4) / 96;
          // load jsPDF
          // @ts-ignore
          if (!(window as any).jspdf) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
          }
          // @ts-ignore
          const jsPDF = (window as any).jspdf?.jsPDF || (window as any).JSFP || (window as any).jsPDF || null;
          if (!jsPDF) throw new Error('jsPDF não disponível');

          const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
          const pageW = 210 - 20; // 10mm margin both sides
          const pageH = 297 - 20;
          const imgWmm = pxToMm(img.width);
          const imgHmm = pxToMm(img.height);
          const scale = Math.min(pageW / imgWmm, pageH / imgHmm, 1);
          const drawW = imgWmm * scale;
          const drawH = imgHmm * scale;
          const left = (210 - drawW) / 2;
          const top = (297 - drawH) / 2;
          // draw image via canvas to get PNG dataURL
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          if (!ctx) throw new Error('Canvas context não disponível');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0);
          const imgData = c.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', left, top, drawW, drawH);
          pdf.save('diagrama.pdf');
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          alert('Erro ao carregar SVG para gerar PDF');
        };
        img.src = url;
      } catch (err) {
        console.error('failed to create PDF', err);
        alert('Erro ao gerar PDF.');
      }
      return;
    }

    // fallback: raster PNG via html2canvas
    try {
      // html2canvas for raster capture
      // @ts-ignore
      if (!window.html2canvas) {
        // using CDN
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
    } catch (e) {
      console.error('failed to load html2canvas', e);
    }

    // use html2canvas to rasterize the flow container
    // @ts-ignore
    const html2canvas = window.html2canvas as typeof import('html2canvas') | undefined;
    if (!html2canvas) {
      alert('Não foi possível carregar html2canvas para a exportação.');
      return;
    }

    const canvas = await html2canvas(flowEl, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });

    if (type === 'png') {
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'diagrama.png';
        a.click();
        URL.revokeObjectURL(a.href);
      });
      return;
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={handleNodeDragStop}
  onNodeClick={handleNodeClick}
  onPaneClick={handlePaneClick}
  onConnect={onConnect}
        onInit={(instance) => {
          try {
            // expose instance for Sidebar to compute center projection
            (window as any).__reactFlowInstance = instance;
          } catch (e) {
            // ignore
          }
        }}
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
      {/* keyboard shortcuts: select all (Ctrl/Cmd+A) and delete */}
      <KeyBindings
        allNodeIds={model.tables.map((t) => t.id)}
        selectedNodeIds={selectedNodeIds}
        setSelectedNodeIds={setSelectedNodeIds}
        removeTable={removeTable}
      />
      <div className="absolute right-3 top-3 flex gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleAutoLayout}
          disabled={isLayouting || model.tables.length === 0}
        >
            {isLayouting ? 'Organizando...' : 'Auto layout'}
        </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void exportAsImage('svg')}
            disabled={model.tables.length === 0}
          >
            Exportar SVG
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void exportAsImage('pdf')}
            disabled={model.tables.length === 0}
          >
            Exportar PDF
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
