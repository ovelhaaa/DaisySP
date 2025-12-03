import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

const FILTER_TYPES = ['Low', 'High', 'Band', 'Notch', 'Peak'];

export default memo(({ id, data }) => {
    const { deleteElements } = useReactFlow();

    const handleDelete = () => {
        deleteElements({ nodes: [{ id }] });
    };

  return (
    <div style={{ background: '#ddd', padding: '10px', borderRadius: '5px', border: '1px solid #777', minWidth: '100px', position: 'relative' }}>
      <button
        onClick={handleDelete}
        style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'red',
            color: 'white',
            border: 'none',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}
      >
        ×
      </button>

      <Handle type="target" position={Position.Left} id="in" style={{ top: '30%', background: '#555' }} />
      <div style={{ position: 'absolute', left: '-20px', top: '28%', fontSize: '8px' }}>In</div>

      <div style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>Filter (SVF)</div>

      <div style={{ fontSize: '10px', marginBottom: '5px' }}>
        Type: {FILTER_TYPES[data.filterType || 0]}
      </div>

       <div style={{ position: 'relative', marginBottom: '5px' }}>
         <Handle type="target" position={Position.Left} id="cutoff" style={{ top: '50%', background: '#555' }} />
         <div style={{ marginLeft: '10px', fontSize: '10px' }}>Cutoff: {data.cutoff} Hz</div>
      </div>

      <div style={{ position: 'relative', marginBottom: '5px' }}>
         <Handle type="target" position={Position.Left} id="res" style={{ top: '50%', background: '#555' }} />
         <div style={{ marginLeft: '10px', fontSize: '10px' }}>Res: {data.res}</div>
      </div>

      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
});
