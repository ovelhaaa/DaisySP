import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data }) => {
  return (
    <div style={{ background: '#eee', padding: '10px', borderRadius: '5px', border: '1px solid #777', minWidth: '100px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>Oscillator</div>

      <div style={{ fontSize: '10px', marginBottom: '5px' }}>
        Freq: {data.freq} Hz
      </div>
      <div style={{ fontSize: '10px', marginBottom: '5px' }}>
        Wave: {['Sin','Tri','Saw','Ramp','Sqr'][data.waveform] || 'Sin'}
      </div>

      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
});
