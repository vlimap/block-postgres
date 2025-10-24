import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

type TableNodeProps = {
  data: {
    label: string;
    columns: string[]; // nomes das colunas
  };
};

// Este nó exibe handles por coluna para permitir "conectar coluna → coluna"
function TableNode({ data }: TableNodeProps) {
  return (
    <div style={{ border: '1px solid #bbb', borderRadius: 6, background: '#fff', minWidth: 220 }}>
      <div style={{ padding: '6px 8px', fontWeight: 600, borderBottom: '1px solid #eee' }}>{data.label}</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: '6px 8px' }}>
        {data.columns.map((c, idx) => (
          <li key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 12, height: 20 }}>
            {/* Source handle à direita (origem) */}
            <span style={{ flex: 1 }}>{c}</span>
            <Handle type="source" id={`src:${c}`} position={Position.Right} style={{ right: -6 }} />
            {/* Target handle à esquerda (destino) */}
            <Handle type="target" id={`tgt:${c}`} position={Position.Left} style={{ left: -6 }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default memo(TableNode);
