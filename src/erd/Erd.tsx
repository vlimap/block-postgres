import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState,
  Connection, Edge, Node, OnEdgeClick,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';
import TableNode from './TableNode';

type Identifier = string;
type Column = { name: Identifier; type?: any };
type Table = { schema: Identifier; name: Identifier; columns: Column[] };
type Model = { tables: Table[] };

const elk = new ELK();

async function layout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const graph = {
    id: 'root',
    layoutOptions: { 'elk.algorithm': 'layered', 'elk.layered.spacing.nodeNodeBetweenLayers': '60' },
    children: nodes.map(n => ({ id: n.id, width: 240, height: 32 + 22 * ((n.data as any).columns?.length ?? 1) })),
    edges: edges.map(e => ({ id: e.id, sources: [e.source!], targets: [e.target!] }))
  };
  const res = await elk.layout(graph);
  return nodes.map(n => {
    const g = res.children!.find(c => c.id === n.id)!;
    return { ...n, position: { x: g.x!, y: g.y! } };
  });
}

function modelToFlow(model: Model): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = model.tables.map(t => ({
    id: `${t.schema}.${t.name}`,
    type: 'table',
    data: { label: t.name, columns: t.columns.map(c => c.name) },
    position: { x: 0, y: 0 }
  }));
  return { nodes, edges: [] };
}

export function Erd({ model }: { model: Model }) {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => modelToFlow(model), [model]);
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);

  useEffect(() => { layout(nodes, edges).then(setNodes); /* eslint-disable-line */ }, []);

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
    const sourceCol = conn.sourceHandle.replace(/^src:/, '');
    const targetCol = conn.targetHandle.replace(/^tgt:/, '');
    const newEdge: Edge = {
      id: `${conn.source}-${sourceCol}__${conn.target}-${targetCol}`,
      source: conn.source,
      target: conn.target,
    };
    setEdges(eds => addEdge(newEdge, eds));
  }, [setEdges]);

  const onEdgeClick: OnEdgeClick = useCallback((_e, edge) => {
    // destaque visual pode ser aplicado via state e className/style
    console.log('edge selected', edge.id);
  }, []);

  return (
    <div style={{ width: '100%', height: '70vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={{ table: TableNode }}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
