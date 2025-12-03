import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default memo(({ id, data }) => {
  const { deleteElements } = useReactFlow();
  const handleDelete = () => deleteElements({ nodes: [{ id }] });

  return (
    <div style={{ background: '#b39ddb', padding: '10px', borderRadius: '5px', border: '1px solid #777', minWidth: '100px', position: 'relative' }}>
      <button onClick={handleDelete} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '20px', height: '20px', borderRadius: '50%', background: 'red', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

      <Handle type="target" position={Position.Left} id="in" style={{ top: '30%', background: '#555' }} />
      <div style={{ position: 'absolute', left: '-20px', top: '28%', fontSize: '8px' }}>In</div>

      <div style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>GranularDelay</div>

      <div style={{ fontSize: '10px' }}>GrainSize: {data.size || 0.1}s</div>
      <div style={{ fontSize: '10px' }}>Density: {data.density || 0.5}</div>
      <div style={{ fontSize: '10px' }}>Spread: {data.spread || 0.1}</div>

      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
});
