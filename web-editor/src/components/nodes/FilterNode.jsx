import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data }) => {
  return (
    <div style={{ background: '#ddd', padding: '10px', borderRadius: '5px', border: '1px solid #777', minWidth: '100px' }}>
      <Handle type="target" position={Position.Left} id="in" style={{ background: '#555' }} />

      <div style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>Filter (SVF)</div>
       <div style={{ fontSize: '10px', marginBottom: '5px' }}>
        Cutoff: {data.cutoff} Hz
      </div>
      <div style={{ fontSize: '10px', marginBottom: '5px' }}>
        Res: {data.res}
      </div>

      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
});
