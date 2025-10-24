import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';

export type CrowFootEdgeData = {
  label?: string;
};

export type CrowFootEdgeType = Edge<CrowFootEdgeData, 'crowFoot'>;

export const CrowFootEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
  markerStart,
}: EdgeProps<CrowFootEdgeType>) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const markerId = `${id}-crow-foot`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth={16}
          markerHeight={16}
          refX={16}
          refY={8}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L16,8"
            stroke="#64748b"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M0,8 L16,8"
            stroke="#64748b"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M0,16 L16,8"
            stroke="#64748b"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: '#64748b', strokeWidth: 1.5, ...(style ?? {}) }}
        markerEnd={`url(#${markerId})`}
        markerStart={markerStart}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'auto',
              backgroundColor: 'rgba(148, 163, 184, 0.15)',
              color: '#334155',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.5)',
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
