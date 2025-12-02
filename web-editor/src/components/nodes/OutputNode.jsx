import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data }) => {
  return (
    <div style={{ background: '#333', color: '#fff', padding: '10px', borderRadius: '5px', border: '1px solid #000', minWidth: '80px' }}>
      <Handle type="target" position={Position.Left} id="in" style={{ background: '#fff' }} />
      <div style={{ fontWeight: 'bold', textAlign: 'center' }}>Audio Out</div>
    </div>
  );
});
