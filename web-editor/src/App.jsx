import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import OscillatorNode from './components/nodes/OscillatorNode';
import FilterNode from './components/nodes/FilterNode';
import OutputNode from './components/nodes/OutputNode';
import InputNode from './components/nodes/InputNode';
import AllPassNode from './components/nodes/AllPassNode';
import PhaserNode from './components/nodes/PhaserNode';
import CompressorNode from './components/nodes/CompressorNode';
import LimiterNode from './components/nodes/LimiterNode';
import ReverbNode from './components/nodes/ReverbNode';
import DelayNode from './components/nodes/DelayNode';
import PitchShifterNode from './components/nodes/PitchShifterNode';
import GranularDelayNode from './components/nodes/GranularDelayNode';

import { audioManager } from './audio/audio-context';
import { generateCpp } from './utils/code-generator';
import { estimateResources } from './utils/resource-manager';

const nodeTypes = {
  oscillator: OscillatorNode,
  filter: FilterNode,
  output: OutputNode,
  input: InputNode,
  allpass: AllPassNode,
  phaser: PhaserNode,
  compressor: CompressorNode,
  limiter: LimiterNode,
  reverb: ReverbNode,
  delay: DelayNode,
  pitchshifter: PitchShifterNode,
  granulardelay: GranularDelayNode,
};

const initialNodes = [
  { id: '1', type: 'oscillator', position: { x: 50, y: 50 }, data: { freq: 440, amp: 0.5, waveform: 0 } },
  { id: '2', type: 'output', position: { x: 400, y: 50 }, data: { label: 'Output' } },
];

let idCounter = 3;

function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [resources, setResources] = useState({ ramBytes: 0, cpuCycles: 0, cpuPercentSTM32H7: 0 });

  useEffect(() => {
    // Init audio on first interaction (browser policy usually)
    const handleClick = () => {
        audioManager.init().then(() => {
             // Sync initial state
             nodes.forEach(n => {
                 // Sanitize params for audio thread
                 const { onUpload, ...audioParams } = n.data;
                 audioManager.sendMessage({ type: 'CREATE_NODE', id: n.id, nodeType: n.type, params: audioParams });
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
      // Now including handles for modulation support
      audioManager.sendMessage({
          type: 'CONNECT',
          sourceId: params.source,
          targetId: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle
      });

  }, [setEdges]);

  const onNodesDelete = useCallback((deleted) => {
      deleted.forEach(node => {
          audioManager.sendMessage({ type: 'DELETE_NODE', id: node.id });
      });
      if (deleted.find(n => n.id === selectedNodeId)) {
          setSelectedNodeId(null);
      }
  }, [selectedNodeId]);

  const onEdgesDelete = useCallback((deleted) => {
      deleted.forEach(edge => {
          audioManager.sendMessage({
              type: 'DISCONNECT',
              sourceId: edge.source,
              targetId: edge.target,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle
          });
      });
  }, []);

  const onFileUpload = useCallback((id, file) => {
      audioManager.uploadFile(id, file);
  }, []);

  const addNode = (type) => {
      const id = `${idCounter++}`;
      let data = {};
      if (type === 'oscillator') data = { freq: 220, amp: 0.5, waveform: 0 };
      else if (type === 'filter') data = { cutoff: 1000, res: 0.5 };
      else if (type === 'input') data = { onUpload: (f) => onFileUpload(id, f) };
      else if (type === 'allpass') data = { delay: 0.1, rev_time: 0.5 };
      else if (type === 'phaser') data = { freq: 0.5, depth: 0.5, feedback: 0.0 };
      else if (type === 'compressor') data = { thresh: -20, ratio: 2.0 };
      else if (type === 'limiter') data = { thresh: -0.1 };
      else if (type === 'reverb') data = { time: 0.9, damp: 15000 };
      else if (type === 'delay') data = { time: 0.5, feedback: 0.5, mix: 0.5 };
      else if (type === 'pitchshifter') data = { shift: 0.0 };
      else if (type === 'granulardelay') data = { size: 0.1, density: 0.5, spread: 0.1 };

      const newNode = {
          id,
          type,
          position: { x: Math.random() * 400, y: Math.random() * 400 },
          data
      };

      setNodes((nds) => nds.concat(newNode));

      // Sanitize params before sending to audio manager (remove functions)
      const { onUpload, ...audioParams } = newNode.data;
      audioManager.sendMessage({ type: 'CREATE_NODE', id: id, nodeType: type, params: audioParams });
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

  const deleteSelected = () => {
      if (selectedNodeId) {
          const nodeToDelete = nodes.find(n => n.id === selectedNodeId);
          if (nodeToDelete) {
               setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
               setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
               audioManager.sendMessage({ type: 'DELETE_NODE', id: selectedNodeId });
               setSelectedNodeId(null);
          }
      }
  };

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '50px', background: '#333', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '10px' }}>
          <h3>DaisySP Visual Editor</h3>
          <button onClick={() => addNode('oscillator')}>Osc</button>
          <button onClick={() => addNode('filter')}>Filt</button>
          <button onClick={() => addNode('delay')}>Delay</button>
          <button onClick={() => addNode('granulardelay')}>GranD</button>
          <button onClick={() => addNode('reverb')}>Verb</button>
          <button onClick={() => addNode('phaser')}>Phas</button>
          <button onClick={() => addNode('pitchshifter')}>Pitch</button>
          <button onClick={() => addNode('compressor')}>Comp</button>
          <button onClick={() => addNode('limiter')}>Lim</button>
          <button onClick={() => addNode('allpass')}>AllP</button>
          <button onClick={() => addNode('input')}>In</button>
          <button onClick={() => addNode('output')}>Out</button>
          <div style={{ flexGrow: 1 }}></div>
          <button onClick={() => audioManager.resume()}>Resume</button>
          <button onClick={() => audioManager.suspend()}>Pause</button>
          <button onClick={() => audioManager.stop()}>Stop</button>
          <button onClick={handleExport} style={{ background: '#4CAF50', border: 'none', padding: '5px 10px', color: 'white' }}>Export</button>
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
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
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
              <div style={{ width: '250px', background: '#f4f4f4', padding: '20px', borderLeft: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
                  <h4>Properties</h4>
                  <div>ID: {selectedNode.id}</div>
                  <div>Type: {selectedNode.type}</div>
                  <button onClick={deleteSelected} style={{ background: '#f44336', color: 'white', border: 'none', padding: '5px', marginTop: '10px', cursor: 'pointer' }}>Delete Node</button>
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
                          <label>Filter Type</label>
                          <select
                             value={selectedNode.data.filterType || 0}
                             onChange={(e) => updateNodeData(selectedNode.id, { filterType: parseInt(e.target.value) })}
                          >
                              <option value="0">Low Pass</option>
                              <option value="1">High Pass</option>
                              <option value="2">Band Pass</option>
                              <option value="3">Notch</option>
                              <option value="4">Peak</option>
                          </select>

                          <br/><br/>
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
                  {selectedNode.type === 'allpass' && (
                      <>
                          <label>Delay (s)</label>
                          <input type="range" min="0.01" max="1.0" step="0.01"
                              value={selectedNode.data.delay}
                              onChange={(e) => updateNodeData(selectedNode.id, { delay: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.delay}</span>
                          <br/><br/>
                          <label>Rev Time (s)</label>
                          <input type="range" min="0.01" max="5.0" step="0.01"
                              value={selectedNode.data.rev_time}
                              onChange={(e) => updateNodeData(selectedNode.id, { rev_time: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.rev_time}</span>
                      </>
                  )}
                  {selectedNode.type === 'phaser' && (
                      <>
                          <label>Freq (Hz)</label>
                          <input type="range" min="0.1" max="10" step="0.1"
                              value={selectedNode.data.freq}
                              onChange={(e) => updateNodeData(selectedNode.id, { freq: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.freq}</span>
                          <br/><br/>
                          <label>Depth</label>
                          <input type="range" min="0" max="1" step="0.01"
                              value={selectedNode.data.depth}
                              onChange={(e) => updateNodeData(selectedNode.id, { depth: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.depth}</span>
                          <br/><br/>
                          <label>Feedback</label>
                          <input type="range" min="0" max="0.99" step="0.01"
                              value={selectedNode.data.feedback}
                              onChange={(e) => updateNodeData(selectedNode.id, { feedback: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.feedback}</span>
                      </>
                  )}
                   {selectedNode.type === 'compressor' && (
                      <>
                          <label>Threshold (dB)</label>
                          <input type="range" min="-60" max="0" step="1"
                              value={selectedNode.data.thresh}
                              onChange={(e) => updateNodeData(selectedNode.id, { thresh: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.thresh}</span>
                          <br/><br/>
                          <label>Ratio</label>
                          <input type="range" min="1" max="20" step="0.1"
                              value={selectedNode.data.ratio}
                              onChange={(e) => updateNodeData(selectedNode.id, { ratio: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.ratio}</span>
                      </>
                  )}
                   {selectedNode.type === 'limiter' && (
                      <>
                          <label>Threshold (dB)</label>
                          <input type="range" min="-60" max="0" step="0.1"
                              value={selectedNode.data.thresh}
                              onChange={(e) => updateNodeData(selectedNode.id, { thresh: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.thresh}</span>
                      </>
                  )}
                  {selectedNode.type === 'reverb' && (
                      <>
                          <label>Time</label>
                          <input type="range" min="0.1" max="0.99" step="0.01"
                              value={selectedNode.data.time}
                              onChange={(e) => updateNodeData(selectedNode.id, { time: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.time}</span>
                          <br/><br/>
                          <label>Damp (Hz)</label>
                          <input type="range" min="100" max="18000" step="100"
                              value={selectedNode.data.damp}
                              onChange={(e) => updateNodeData(selectedNode.id, { damp: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.damp}</span>
                      </>
                  )}
                  {selectedNode.type === 'delay' && (
                      <>
                          <label>Time (s)</label>
                          <input type="range" min="0.01" max="2.0" step="0.01"
                              value={selectedNode.data.time}
                              onChange={(e) => updateNodeData(selectedNode.id, { time: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.time}</span>
                          <br/><br/>
                          <label>Feedback</label>
                          <input type="range" min="0" max="1.0" step="0.01"
                              value={selectedNode.data.feedback}
                              onChange={(e) => updateNodeData(selectedNode.id, { feedback: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.feedback}</span>
                          <br/><br/>
                          <label>Mix</label>
                          <input type="range" min="0" max="1.0" step="0.01"
                              value={selectedNode.data.mix}
                              onChange={(e) => updateNodeData(selectedNode.id, { mix: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.mix}</span>
                      </>
                  )}
                  {selectedNode.type === 'pitchshifter' && (
                      <>
                          <label>Shift (semitones)</label>
                          <input type="range" min="-12" max="12" step="1"
                              value={selectedNode.data.shift}
                              onChange={(e) => updateNodeData(selectedNode.id, { shift: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.shift}</span>
                      </>
                  )}
                  {selectedNode.type === 'granulardelay' && (
                      <>
                          <label>Grain Size (s)</label>
                          <input type="range" min="0.01" max="0.5" step="0.01"
                              value={selectedNode.data.size}
                              onChange={(e) => updateNodeData(selectedNode.id, { size: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.size}</span>
                          <br/><br/>
                          <label>Density</label>
                          <input type="range" min="0.1" max="1.0" step="0.01"
                              value={selectedNode.data.density}
                              onChange={(e) => updateNodeData(selectedNode.id, { density: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.density}</span>
                          <br/><br/>
                          <label>Spread</label>
                          <input type="range" min="0.0" max="1.0" step="0.01"
                              value={selectedNode.data.spread}
                              onChange={(e) => updateNodeData(selectedNode.id, { spread: parseFloat(e.target.value) })}
                          />
                          <span>{selectedNode.data.spread}</span>
                      </>
                  )}
              </div>
          )}
          {selectedNode && (selectedNode.type === 'output' || selectedNode.type === 'input') && (
               <div style={{ width: '250px', background: '#f4f4f4', padding: '20px', borderLeft: '1px solid #ccc' }}>
                   <h4>Properties</h4>
                   <div>ID: {selectedNode.id}</div>
                   <div>Type: {selectedNode.type}</div>
                   <button onClick={deleteSelected} style={{ background: '#f44336', color: 'white', border: 'none', padding: '5px', marginTop: '10px', cursor: 'pointer' }}>Delete Node</button>
               </div>
          )}
      </div>
    </div>
  );
}

export default function App() {
    return (
        <ReactFlowProvider>
            <FlowEditor />
        </ReactFlowProvider>
    );
}
