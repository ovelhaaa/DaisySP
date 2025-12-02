import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data }) => {
  const onFileChange = (e) => {
      const file = e.target.files[0];
      if (file && data.onUpload) {
          data.onUpload(file);
      }
  };

  return (
    <div style={{ background: '#eef', padding: '10px', borderRadius: '5px', border: '1px solid #77a', minWidth: '120px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>Audio Input / Player</div>

      <div style={{ fontSize: '10px', marginBottom: '5px' }}>
        Hardware In (C++) <br/> File Player (Web)
      </div>

      <input type="file" accept="audio/*" onChange={onFileChange} style={{ fontSize: '10px', width: '100%' }} />

      <Handle type="source" position={Position.Right} id="out" style={{ background: '#555' }} />
    </div>
  );
});
