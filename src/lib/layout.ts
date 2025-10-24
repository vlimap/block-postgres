import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';
import type { DbModel } from '../types/model';

type ElkLayout = {
  layout(graph: ElkNode): Promise<ElkNode>;
};

let elkInstancePromise: Promise<ElkLayout> | null = null;

const getElkInstance = async (): Promise<ElkLayout> => {
  if (!elkInstancePromise) {
    elkInstancePromise = import('elkjs/lib/elk.bundled.js').then(
      ({ default: Elk }) => new Elk(),
    );
  }
  return elkInstancePromise;
};

export type LayoutPositions = Record<string, { x: number; y: number }>;

export const computeLayout = async (model: DbModel): Promise<LayoutPositions> => {
  const elk = await getElkInstance();
  const edges: ElkExtendedEdge[] = [];

  model.tables.forEach((table) => {
    table.foreignKeys.forEach((fk) => {
      edges.push({
        id: fk.id,
        sources: [table.id],
        targets: [fk.toTableId],
      });
    });
  });

  const children: ElkNode['children'] = model.tables.map((table) => ({
    id: table.id,
    width: 240,
    height: Math.max(120, 80 + table.columns.length * 24),
  }));

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '100',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
    },
    children,
    edges,
  };

  const layouted = await elk.layout(graph);
  const positions: LayoutPositions = {};

  layouted.children?.forEach((child) => {
    positions[child.id] = {
      x: child.x ?? 0,
      y: child.y ?? 0,
    };
  });

  return positions;
};
