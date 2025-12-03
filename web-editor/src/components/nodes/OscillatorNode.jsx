import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default memo(({ id, data }) => {
  const { deleteElements } = useReactFlow();

  const handleDelete = () => {
      deleteElements({ nodes: [{ id }] });
  };

  return (
    <div style={{ background: '#eee', padding: '10px', borderRadius: '5px', border: '1px solid #777', minWidth: '100px', position: 'relative' }}>
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

      <div style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>Oscillator</div>

      <div style={{ position: 'relative', marginBottom: '5px' }}>
         <Handle type="target" position={Position.Left} id="freq" style={{ top: '50%', background: '#555' }} />
         <div style={{ marginLeft: '10px', fontSize: '10px' }}>Freq: {data.freq} Hz</div>
      </div>

      <div style={{ position: 'relative', marginBottom: '5px' }}>
         <Handle type="target" position={Position.Left} id="amp" style={{ top: '50%', background: '#555' }} />
         <div style={{ marginLeft: '10px', fontSize: '10px' }}>Amp: {data.amp}</div>
      </div>

      <div style={{ fontSize: '10px', marginBottom: '5px', marginLeft: '10px' }}>
        Wave: {['Sin','Tri','Saw','Ramp','Sqr'][data.waveform] || 'Sin'}
      </div>

      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
});
