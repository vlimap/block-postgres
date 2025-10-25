// CrowFootEdge.tsx
import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';

export type CrowFootEdgeData = {
  label?: string;
  // 0..1, 1..1, 0..N, 1..N e variações simplificadas
  start?: 'one' | 'many' | 'one_and_only_one' | 'zero_or_one' | 'one_or_many' | 'zero_or_many';
  end?:   'one' | 'many' | 'one_and_only_one' | 'zero_or_one' | 'one_or_many' | 'zero_or_many';
};

export type CrowFootEdgeType = Edge<CrowFootEdgeData, 'crowFoot'>;

const color = '#475569';      // Slate-700
const edgeColor = '#64748B';  // Slate-500

// Pequenos ícones SVG (20x20) orientados para a direita; serão rotacionados no render.
function Glyph({ kind }: { kind: NonNullable<CrowFootEdgeData['start']> }) {
  const strokeW = 2;
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* many: pé-de-galinha (duas diagonais + traço central) */}
        {(kind === 'many' || kind === 'one_or_many' || kind === 'zero_or_many') && (
          <>
            <path d="M2,2 L18,10" />
            <path d="M2,18 L18,10" />
            <path d="M4,10 L18,10" />
          </>
        )}

        {/* one: barra; one_and_only_one: duas barras paralelas */}
        {(kind === 'one' || kind === 'one_and_only_one' || kind === 'zero_or_one' || kind === 'one_or_many') && (
          <path d="M14,5 L14,15" />
        )}
        {(kind === 'one_and_only_one') && <path d="M11,5 L11,15" />}

        {/* zero: círculo pequeno (combinado em zero_or_one / zero_or_many) */}
        {(kind === 'zero_or_one' || kind === 'zero_or_many') && (
          <circle cx="9" cy="10" r="3" strokeWidth={1.6} />
        )}
      </g>
    </svg>
  );
}

// Composição de símbolos por lado (para 0..1 são DOIS glifos: círculo + barra)
function glyphsFor(kind: NonNullable<CrowFootEdgeData['start']>): Array<'zero' | 'one' | 'many' | 'twoBars'> {
  switch (kind) {
    case 'one': return ['one'];
    case 'many': return ['many'];
    case 'one_and_only_one': return ['twoBars'];
    case 'zero_or_one': return ['zero', 'one'];
    case 'one_or_many': return ['one', 'many'];
    case 'zero_or_many': return ['zero', 'many'];
    default: return ['one'];
  }
}

// Renderiza os glifos em posições incrementais ao longo da tangente da aresta
function Cardinality({
  x, y, angleDeg, kind, side,
}: { x: number; y: number; angleDeg: number; kind: NonNullable<CrowFootEdgeData['start']>; side: 'start' | 'end' }) {
  const items = glyphsFor(kind);
  // offsets em px a partir da extremidade da aresta (ordem do mais próximo para o mais distante do nó)
  // imagem de referência coloca o "zero" mais próximo do retângulo, depois barra, depois pé.
  const base = 12;
  const step = 8;

  return (
    <>
      {items.map((k, i) => {
        // ordem de desenho para manter círculo antes da barra/pé no sentido da aresta
        const offset = base + i * step;
        const rot = side === 'start' ? angleDeg + 180 : angleDeg;
        // para mapear nossa lista para os glifos SVG:
        const resolved: CrowFootEdgeData['start'] =
          k === 'zero' ? 'zero_or_one'
          : k === 'twoBars' ? 'one_and_only_one'
          : (k as any);

        return (
          <EdgeLabelRenderer key={`${side}-${k}-${i}`}>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg) translate(${offset}px, 0)`,
                pointerEvents: 'none',
                width: 20,
                height: 20,
              }}
            >
              <Glyph kind={resolved!} />
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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  // Vetor/ângulo da aresta (para rotacionar os glifos)
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Posições de ancoragem para colocar símbolos (levemente “para dentro” da aresta)
  // usamos uma fração do caminho (3% e 97%) para não colar no contorno do nó
  const tStart = 0.03;
  const tEnd = 0.97;
  const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
  const sx = lerp(sourceX, targetX, tStart);
  const sy = lerp(sourceY, targetY, tStart);
  const ex = lerp(sourceX, targetX, tEnd);
  const ey = lerp(sourceY, targetY, tEnd);

  const startKind: NonNullable<CrowFootEdgeData['start']> = data?.start ?? 'zero_or_many'; // ajuste padrão se quiser
  const endKind:   NonNullable<CrowFootEdgeData['end']>   = data?.end   ?? 'one';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: edgeColor, strokeWidth: 1.6, ...(style ?? {}) }}
      />

      {/* Símbolos na extremidade inicial (perto do source) */}
      <Cardinality x={sx} y={sy} angleDeg={angleDeg} kind={startKind} side="start" />
      {/* Símbolos na extremidade final (perto do target) */}
      <Cardinality x={ex} y={ey} angleDeg={angleDeg} kind={endKind} side="end" />

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'auto',
              backgroundColor: 'rgba(148,163,184,0.15)',
              color: '#334155',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 6,
              border: '1px solid rgba(148,163,184,0.5)',
              backdropFilter: 'blur(2px)',
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// Helper export para registrar no ReactFlow facilmente:
// import { crowFootEdgeType } from './CrowFootEdge';
// <ReactFlow edgeTypes={crowFootEdgeType} />
export const crowFootEdgeType = { crowFoot: CrowFootEdge } as const;

// Helper puro para atualizar cardinalidades em uma lista de edges.
// Pode ser usado com setEdges: setEdges((eds) => updateEdgeCardinality(eds, edgeId, { start: 'zero_or_one', end: 'one_or_many' }))
export function updateEdgeCardinality<T extends { id: string; data?: Partial<CrowFootEdgeData> }>(
  edges: T[],
  edgeId: string,
  data: Partial<CrowFootEdgeData>
): T[] {
  return edges.map((e) =>
    e.id === edgeId
      ? ({ ...e, data: { ...(e.data as object), ...data } } as T)
      : e
  );
}

// Kind type used across the helpers
export type Kind =
  | 'one'
  | 'many'
  | 'one_and_only_one'
  | 'zero_or_one'
  | 'one_or_many'
  | 'zero_or_many';

// Compute start/end cardinalities from model facts (pure)
export function computeKindsFromModel(params: {
  fkNullable: boolean;
  refIsUnique: boolean;
}): { start: Kind; end: Kind } {
  const start: Kind = params.fkNullable ? 'zero_or_many' : 'one_or_many';
  const end: Kind = params.fkNullable ? 'zero_or_one' : 'one';

  if (!params.refIsUnique) {
    return { start, end: 'many' };
  }
  return { start, end };
}

// Given an edge-like data object and the current model, infer start/end kinds.
// edgeData must include sourceTableId, sourceColumnId, targetTableId, targetColumnId
export function computeKindsForEdgeData(edgeData: Partial<CrowFootEdgeData> & Record<string, any>, model: any) {
  const { sourceTableId, sourceColumnId, targetTableId, targetColumnId } = edgeData;
  try {
    const sourceTable = model.tables.find((t: any) => t.id === sourceTableId);
    const targetTable = model.tables.find((t: any) => t.id === targetTableId);
    const sourceCol = sourceTable?.columns.find((c: any) => c.id === sourceColumnId);
    const targetCol = targetTable?.columns.find((c: any) => c.id === targetColumnId);

    const fkNullable = !!sourceCol?.nullable;
    const refIsUnique = !!(targetCol?.isPrimaryKey || targetCol?.isUnique);
    return computeKindsFromModel({ fkNullable, refIsUnique });
  } catch (e) {
    // fallback defaults
    return { start: 'one_or_many' as Kind, end: 'one' as Kind };
  }
}
