// CrowFootEdge.tsx
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  type Edge,
  type EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import type { DbModel } from '../types/model';

export type RawKind =
  | 'one'
  | 'many'
  | 'one_and_only_one'
  | 'zero_or_one'
  | 'one_or_many'
  | 'zero_or_many';

export type CrowFootEdgeData = {
  label?: string;
  start?: RawKind;
  end?: RawKind;
  fkId?: string;
};

export type CrowFootEdgeType = Edge<CrowFootEdgeData, 'crowFoot'>;

const color = '#1b4070';      // brand-700
const edgeColor = '#285d9f';  // brand-500

// Pequenos ícones SVG (20x20) orientados para a direita; serão rotacionados no render.
function Glyph({ kind }: { kind: Kind }) {
  const strokeW = 2;
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {kind === 'many' ? (
          <>
            <path d="M2,2 L18,10" />
            <path d="M2,18 L18,10" />
            <path d="M4,10 L18,10" />
          </>
        ) : (
          <path d="M14,5 L14,15" />
        )}
      </g>
    </svg>
  );
}

// Cada cardinalidade máxima renderiza um único glifo
function glyphsFor(kind: Kind): Array<'one' | 'many'> {
  switch (kind) {
    case 'many':
      return ['many'];
    case 'one':
    default:
      return ['one'];
  }
}

// Renderiza os glifos em posições incrementais ao longo da tangente da aresta
type Orientation = { dir: { x: number; y: number }; angleDeg: number };

function Cardinality({
  x,
  y,
  orientation,
  kind,
  side,
}: {
  x: number;
  y: number;
  orientation: Orientation;
  kind: Kind;
  side: 'start' | 'end';
}) {
  const items = glyphsFor(kind);
  // offsets em px a partir da extremidade da aresta (ordem do mais próximo para o mais distante do nó)
  // imagem de referência coloca o "zero" mais próximo do retângulo, depois barra, depois pé.
  const base = 12;
  const step = 8;

  const { dir, angleDeg } = orientation;
  const norm = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / norm;
  const uy = dir.y / norm;

  return (
    <>
      {items.map((k, i) => {
        const offset = base + i * step;
        const px = x + ux * offset;
        const py = y + uy * offset;

        return (
          <EdgeLabelRenderer key={`${side}-${k}-${i}`}>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${px}px, ${py}px) rotate(${angleDeg}deg)`,
                pointerEvents: 'none',
                width: 20,
                height: 20,
              }}
            >
              <Glyph kind={k} />
            </div>
          </EdgeLabelRenderer>
        );
      })}
    </>
  );
}

export const CrowFootEdge = ({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, data,
}: EdgeProps<CrowFootEdgeType>) => {
  // Caminho suave
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  // Vetor/ângulo da aresta (para rotacionar os glifos)
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / len, y: dy / len };

  // Posições de ancoragem diretamente nas extremidades
  const sx = sourceX;
  const sy = sourceY;
  const ex = targetX;
  const ey = targetY;

  const startKind: Kind = normalizeCardinality(data?.start, 'many');
  const endKind: Kind = normalizeCardinality(data?.end, 'one');

  const orientationFromPosition = (
    position: Position | undefined,
    fallback: Orientation,
  ): Orientation => {
    switch (position) {
      case Position.Left:
        return { dir: { x: -1, y: 0 }, angleDeg: 180 };
      case Position.Right:
        return { dir: { x: 1, y: 0 }, angleDeg: 0 };
      case Position.Top:
        return { dir: { x: 0, y: -1 }, angleDeg: -90 };
      case Position.Bottom:
        return { dir: { x: 0, y: 1 }, angleDeg: 90 };
      default:
        return fallback;
    }
  };

  const startFallback: Orientation = {
    dir,
    angleDeg: (Math.atan2(dir.y, dir.x) * 180) / Math.PI,
  };
  const endDir = { x: -dir.x, y: -dir.y };
  const endFallback: Orientation = {
    dir: endDir,
    angleDeg: (Math.atan2(endDir.y, endDir.x) * 180) / Math.PI,
  };

  const startOrientation = orientationFromPosition(sourcePosition, startFallback);
  const endOrientation = orientationFromPosition(targetPosition, endFallback);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: edgeColor, strokeWidth: 1.6, pointerEvents: 'stroke', cursor: 'pointer', ...(style ?? {}) }}
      />

      {/* Símbolos na extremidade inicial (perto do source) */}
      <Cardinality x={sx} y={sy} orientation={startOrientation} kind={startKind} side="start" />
      {/* Símbolos na extremidade final (perto do target) */}
      <Cardinality x={ex} y={ey} orientation={endOrientation} kind={endKind} side="end" />

    </>
  );
};

// Helper export para registrar no ReactFlow facilmente:
// import { crowFootEdgeType } from './CrowFootEdge';
// <ReactFlow edgeTypes={crowFootEdgeType} />
export const crowFootEdgeType = { crowFoot: CrowFootEdge } as const;

// Helper puro para atualizar cardinalidades em uma lista de edges.
// Pode ser usado com setEdges: setEdges((eds) => updateEdgeCardinality(eds, edgeId, { start: 'many', end: 'one' }))
export function updateEdgeCardinality<T extends { id: string; data?: Partial<CrowFootEdgeData> }>(
  edges: T[],
  edgeId: string,
  data: Partial<CrowFootEdgeData>
): T[] {
  const sanitized: Partial<CrowFootEdgeData> = { ...data };
  if (data.start !== undefined) {
    sanitized.start = normalizeCardinality(data.start, 'many');
  }
  if (data.end !== undefined) {
    sanitized.end = normalizeCardinality(data.end, 'one');
  }
  return edges.map((e) =>
    e.id === edgeId
      ? ({ ...e, data: { ...(e.data as object), ...sanitized } } as T)
      : e
  );
}

// Kind type used across the helpers (máxima cardinalidade apenas)
export type Kind = 'one' | 'many';

export function normalizeCardinality(
  value: RawKind | null | undefined,
  fallback: Kind = 'one',
): Kind {
  if (value === 'many' || value === 'one_or_many' || value === 'zero_or_many') {
    return 'many';
  }
  if (value === 'one' || value === 'one_and_only_one' || value === 'zero_or_one') {
    return 'one';
  }
  return fallback;
}

// Compute start/end cardinalities from model facts (pure)
export function computeKindsFromModel(params: {
  fkNullable: boolean;
  fkIsUnique: boolean;
  refIsUnique: boolean;
}): { start: Kind; end: Kind } {
  const { fkIsUnique, refIsUnique } = params;

  const start: Kind = fkIsUnique ? 'one' : 'many';
  const end: Kind = refIsUnique ? 'one' : 'many';

  return { start, end };
}

// Given an edge-like data object and the current model, infer start/end kinds.
// edgeData must include sourceTableId, sourceColumnId, targetTableId, targetColumnId
export function computeKindsForEdgeData(
  edgeData: Partial<CrowFootEdgeData> & Record<string, any>,
  model: DbModel,
) {
  const fallback = { start: 'many' as Kind, end: 'one' as Kind };
  const { sourceTableId, sourceColumnId, targetTableId, targetColumnId } = edgeData;
  if (!sourceTableId || !sourceColumnId || !targetTableId || !targetColumnId) {
    return fallback;
  }
  const sourceTable = model.tables.find((t) => t.id === sourceTableId);
  const targetTable = model.tables.find((t) => t.id === targetTableId);
  if (!sourceTable || !targetTable) {
    return fallback;
  }
  const sourceCol = sourceTable.columns.find((c) => c.id === sourceColumnId);
  const targetCol = targetTable.columns.find((c) => c.id === targetColumnId);
  if (!sourceCol || !targetCol) {
    return fallback;
  }

  const fkNullable = !!sourceCol.nullable;
  const fkIsUnique = !!(sourceCol.isPrimaryKey || sourceCol.isUnique);
  const refIsUnique = !!(targetCol.isPrimaryKey || targetCol.isUnique);
  return computeKindsFromModel({ fkNullable, fkIsUnique, refIsUnique });
}
