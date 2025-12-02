import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import OscillatorNode from './components/nodes/OscillatorNode';
import FilterNode from './components/nodes/FilterNode';
import OutputNode from './components/nodes/OutputNode';
import InputNode from './components/nodes/InputNode';
import { audioManager } from './audio/audio-context';
import { generateCpp } from './utils/code-generator';
import { estimateResources } from './utils/resource-manager';

const nodeTypes = {
  oscillator: OscillatorNode,
  filter: FilterNode,
  output: OutputNode,
  input: InputNode,
};

const initialNodes = [
  { id: '1', type: 'oscillator', position: { x: 50, y: 50 }, data: { freq: 440, amp: 0.5, waveform: 0 } },
  { id: '2', type: 'output', position: { x: 400, y: 50 }, data: { label: 'Output' } },
];

let idCounter = 3;

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [resources, setResources] = useState({ ramBytes: 0, cpuCycles: 0, cpuPercentSTM32H7: 0 });

  useEffect(() => {
    // Init audio on first interaction (browser policy usually)
    const handleClick = () => {
        audioManager.init().then(() => {
             // Sync initial state
             nodes.forEach(n => {
                 audioManager.sendMessage({ type: 'CREATE_NODE', id: n.id, nodeType: n.type, params: n.data });
             });
        });
        document.removeEventListener('click', handleClick);
    };
    document.addEventListener('click', handleClick);
  }, []);

  useEffect(() => {
      setResources(estimateResources(nodes));
  }, [nodes]);

  const onConnect = useCallback((params) => {
      setEdges((eds) => addEdge(params, eds));
      // ReactFlow IDs are the strings we passed.
      audioManager.sendMessage({ type: 'CONNECT', sourceId: params.source, targetId: params.target });

  }, [setEdges]);

  const onNodesDelete = useCallback((deleted) => {
      deleted.forEach(node => {
          audioManager.sendMessage({ type: 'DELETE_NODE', id: node.id });
      });
  }, []);

  const onEdgesDelete = useCallback((deleted) => {
      deleted.forEach(edge => {
          audioManager.sendMessage({ type: 'DISCONNECT', sourceId: edge.source, targetId: edge.target });
      });
  }, []);

  const onFileUpload = useCallback((id, file) => {
      audioManager.uploadFile(id, file);
  }, []);

  const addNode = (type) => {
      const id = `${idCounter++}`;
      const newNode = {
          id,
          type,
          position: { x: Math.random() * 400, y: Math.random() * 400 },
          data: type === 'oscillator' ? { freq: 220, amp: 0.5, waveform: 0 }
              : type === 'filter' ? { cutoff: 1000, res: 0.5 }
              : type === 'input' ? { onUpload: (f) => onFileUpload(id, f) }
              : {}
      };
      // If we are adding an input node, make sure the onUpload callback is fresh
      if (type === 'input') {
          newNode.data.onUpload = (f) => onFileUpload(id, f);
      }

      setNodes((nds) => nds.concat(newNode));
      audioManager.sendMessage({ type: 'CREATE_NODE', id: id, nodeType: type, params: newNode.data });
  };

  const updateNodeData = (id, newData) => {
      setNodes((nds) => nds.map((node) => {
          if (node.id === id) {
              const updated = { ...node, data: { ...node.data, ...newData } };
              // Send updates to audio
              Object.keys(newData).forEach(key => {
                  audioManager.sendMessage({ type: 'UPDATE_PARAM', id, param: key, value: newData[key] });
              });
              return updated;
          }
          return node;
      }));
  };

  const handleExport = () => {
      const code = generateCpp(nodes, edges);
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'main.cpp';
      a.click();
      URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '50px', background: '#333', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '10px' }}>
          <h3>DaisySP Visual Editor</h3>
          <button onClick={() => addNode('oscillator')}>Add Oscillator</button>
          <button onClick={() => addNode('filter')}>Add Filter</button>
          <button onClick={() => addNode('input')}>Add Audio Input</button>
          <button onClick={() => addNode('output')}>Add Output</button>
          <div style={{ flexGrow: 1 }}></div>
          <button onClick={() => audioManager.resume()}>Resume Audio</button>
          <button onClick={handleExport} style={{ background: '#4CAF50', border: 'none', padding: '5px 10px', color: 'white' }}>Export C++</button>
      </div>

      <div style={{ flexGrow: 1, display: 'flex' }}>
          <div style={{ flexGrow: 1 }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelectedNode(node)}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap />
                <Panel position="top-right" style={{ background: 'rgba(255,255,255,0.8)', padding: '10px', borderRadius: '5px' }}>
                    <div>Est. RAM: {resources.ramBytes} bytes</div>
                    <div>Est. CPU (H7): {resources.cpuPercentSTM32H7.toFixed(2)}%</div>
                </Panel>
            </ReactFlow>
          </div>

          {selectedNode && selectedNode.type !== 'output' && selectedNode.type !== 'input' && (
              <div style={{ width: '250px', background: '#f4f4f4', padding: '20px', borderLeft: '1px solid #ccc' }}>
                  <h4>Properties</h4>
                  <div>ID: {selectedNode.id}</div>
                  <div>Type: {selectedNode.type}</div>
                  <hr/>
                  {selectedNode.type === 'oscillator' && (
                      <>
                          <label>Frequency (Hz)</label>
                          <input
                              type="range" min="20" max="2000" step="1"
                              value={selectedNode.data.freq}
                              onChange={(e) => updateNodeData(selectedNode.id, { freq: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.freq}</span>

                          <br/><br/>
                          <label>Amplitude</label>
                          <input
                              type="range" min="0" max="1" step="0.01"
                              value={selectedNode.data.amp}
                              onChange={(e) => updateNodeData(selectedNode.id, { amp: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.amp}</span>

                          <br/><br/>
                          <label>Waveform</label>
                          <select
                             value={selectedNode.data.waveform}
                             onChange={(e) => updateNodeData(selectedNode.id, { waveform: parseInt(e.target.value) })}
                          >
                              <option value="0">Sine</option>
                              <option value="1">Triangle</option>
                              <option value="2">Saw</option>
                              <option value="3">Ramp</option>
                              <option value="4">Square</option>
                          </select>
                      </>
                  )}
                  {selectedNode.type === 'filter' && (
                      <>
                          <label>Cutoff (Hz)</label>
                          <input
                              type="range" min="20" max="5000" step="1"
                              value={selectedNode.data.cutoff}
                              onChange={(e) => updateNodeData(selectedNode.id, { cutoff: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.cutoff}</span>

                          <br/><br/>
                          <label>Resonance</label>
                          <input
                              type="range" min="0" max="1" step="0.01"
                              value={selectedNode.data.res}
                              onChange={(e) => updateNodeData(selectedNode.id, { res: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.res}</span>
                      </>
                  )}
              </div>
          )}
      </div>
    </div>
  );
}
