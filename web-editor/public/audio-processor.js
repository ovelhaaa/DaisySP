
// DaisySP-like DSP classes ported to JavaScript

const TWO_PI = 2.0 * Math.PI;

function fclamp(inVal, min, max) {
  return Math.min(Math.max(inVal, min), max);
}

// Polyblep helper
function Polyblep(phase_inc, t) {
  let dt = phase_inc;
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1.0;
  } else if (t > 1.0 - dt) {
    t = (t - 1.0) / dt;
    return t * t + t + t + 1.0;
  } else {
    return 0.0;
  }
}

class Oscillator {
  constructor() {
    this.WAVE_SIN = 0;
    this.WAVE_TRI = 1;
    this.WAVE_SAW = 2;
    this.WAVE_RAMP = 3;
    this.WAVE_SQUARE = 4;
    this.WAVE_POLYBLEP_TRI = 5;
    this.WAVE_POLYBLEP_SAW = 6;
    this.WAVE_POLYBLEP_SQUARE = 7;

    this.sr_ = 48000.0;
    this.sr_recip_ = 1.0 / 48000.0;
    this.freq_ = 100.0;
    this.amp_ = 0.5;
    this.pw_ = 0.5;
    this.phase_ = 0.0;
    this.phase_inc_ = 0.0;
    this.waveform_ = this.WAVE_SIN;
    this.eoc_ = true;
    this.eor_ = true;
    this.last_out_ = 0.0;
  }

  Init(sample_rate) {
    this.sr_ = sample_rate;
    this.sr_recip_ = 1.0 / sample_rate;
    this.freq_ = 100.0;
    this.amp_ = 0.5;
    this.pw_ = 0.5;
    this.phase_ = 0.0;
    this.phase_inc_ = this.CalcPhaseInc(this.freq_);
    this.waveform_ = this.WAVE_SIN;
    this.eoc_ = true;
    this.eor_ = true;
    this.last_out_ = 0.0;
  }

  SetFreq(f) {
    this.freq_ = f;
    this.phase_inc_ = this.CalcPhaseInc(f);
  }

  SetAmp(a) {
    this.amp_ = a;
  }

  SetWaveform(wf) {
    this.waveform_ = wf;
  }

  SetPw(pw) {
    this.pw_ = fclamp(pw, 0.0, 1.0);
  }

  CalcPhaseInc(f) {
    return f * this.sr_recip_;
  }

  Process() {
    let out = 0.0;
    let t = 0.0;

    switch (this.waveform_) {
      case this.WAVE_SIN:
        out = Math.sin(this.phase_ * TWO_PI);
        break;
      case this.WAVE_TRI:
        t = -1.0 + (2.0 * this.phase_);
        out = 2.0 * (Math.abs(t) - 0.5);
        break;
      case this.WAVE_SAW:
        out = -1.0 * (((this.phase_ * 2.0)) - 1.0);
        break;
      case this.WAVE_RAMP:
        out = ((this.phase_ * 2.0)) - 1.0;
        break;
      case this.WAVE_SQUARE:
        out = this.phase_ < this.pw_ ? 1.0 : -1.0;
        break;
      case this.WAVE_POLYBLEP_TRI:
        t = this.phase_;
        out = this.phase_ < 0.5 ? 1.0 : -1.0;
        out += Polyblep(this.phase_inc_, t);
        out -= Polyblep(this.phase_inc_, (t + 0.5) % 1.0);
        out = this.phase_inc_ * out + (1.0 - this.phase_inc_) * this.last_out_;
        this.last_out_ = out;
        out *= 4.0;
        break;
      case this.WAVE_POLYBLEP_SAW:
        t = this.phase_;
        out = (2.0 * t) - 1.0;
        out -= Polyblep(this.phase_inc_, t);
        out *= -1.0;
        break;
      case this.WAVE_POLYBLEP_SQUARE:
        t = this.phase_;
        out = this.phase_ < this.pw_ ? 1.0 : -1.0;
        out += Polyblep(this.phase_inc_, t);
        out -= Polyblep(this.phase_inc_, (t + (1.0 - this.pw_)) % 1.0);
        out *= 0.707;
        break;
      default:
        out = 0.0;
        break;
    }

    this.phase_ += this.phase_inc_;
    if (this.phase_ > 1.0) {
      this.phase_ -= 1.0;
      this.eoc_ = true;
    } else {
      this.eoc_ = false;
    }

    // JS doesn't support pointer arithmetic for phase - phase_inc < 0.5
    // so we approximate the logic
    this.eor_ = (this.phase_ - this.phase_inc_ < 0.5 && this.phase_ >= 0.5);

    return out * this.amp_;
  }
}

class Svf {
  constructor() {
    this.sr_ = 48000.0;
    this.fc_ = 200.0;
    this.res_ = 0.5;
    this.drive_ = 0.5;
    this.pre_drive_ = 0.5;
    this.freq_ = 0.25;
    this.damp_ = 0.0;
    this.notch_ = 0.0;
    this.low_ = 0.0;
    this.high_ = 0.0;
    this.band_ = 0.0;
    this.peak_ = 0.0;
    this.input_ = 0.0;
    this.out_notch_ = 0.0;
    this.out_low_ = 0.0;
    this.out_high_ = 0.0;
    this.out_peak_ = 0.0;
    this.out_band_ = 0.0;
    this.fc_max_ = 48000.0 / 3.0;
  }

  Init(sample_rate) {
    this.sr_ = sample_rate;
    this.fc_max_ = this.sr_ / 3.0;
    this.InitDefaults();
  }

  InitDefaults() {
    this.fc_ = 200.0;
    this.res_ = 0.5;
    this.drive_ = 0.5;
    this.pre_drive_ = 0.5;
    this.freq_ = 0.25;
    this.damp_ = 0.0;
    this.notch_ = 0.0;
    this.low_ = 0.0;
    this.high_ = 0.0;
    this.band_ = 0.0;
    this.peak_ = 0.0;
    this.input_ = 0.0;
    this.out_notch_ = 0.0;
    this.out_low_ = 0.0;
    this.out_high_ = 0.0;
    this.out_peak_ = 0.0;
    this.out_band_ = 0.0;
  }

  Process(inVal) {
    this.input_ = inVal;
    // first pass
    this.notch_ = this.input_ - this.damp_ * this.band_;
    this.low_ = this.low_ + this.freq_ * this.band_;
    this.high_ = this.notch_ - this.low_;
    this.band_ = this.freq_ * this.high_ + this.band_ - this.drive_ * this.band_ * this.band_ * this.band_;

    // take first sample of output
    this.out_low_ = 0.5 * this.low_;
    this.out_high_ = 0.5 * this.high_;
    this.out_band_ = 0.5 * this.band_;
    this.out_peak_ = 0.5 * (this.low_ - this.high_);
    this.out_notch_ = 0.5 * this.notch_;

    // second pass
    this.notch_ = this.input_ - this.damp_ * this.band_;
    this.low_ = this.low_ + this.freq_ * this.band_;
    this.high_ = this.notch_ - this.low_;
    this.band_ = this.freq_ * this.high_ + this.band_ - this.drive_ * this.band_ * this.band_ * this.band_;

    // average second pass outputs
    this.out_low_ += 0.5 * this.low_;
    this.out_high_ += 0.5 * this.high_;
    this.out_band_ += 0.5 * this.band_;
    this.out_peak_ += 0.5 * (this.low_ - this.high_);
    this.out_notch_ += 0.5 * this.notch_;
  }

  SetFreq(f) {
    this.fc_ = fclamp(f, 1.0e-6, this.fc_max_);
    // Set Internal Frequency for fc_
    this.freq_ = 2.0 * Math.sin(Math.PI * Math.min(0.25, this.fc_ / (this.sr_ * 2.0)));
    // recalculate damp
    this.damp_ = Math.min(2.0 * (1.0 - Math.pow(this.res_, 0.25)), Math.min(2.0, 2.0 / this.freq_ - this.freq_ * 0.5));
  }

  SetRes(r) {
    let res = fclamp(r, 0.0, 1.0);
    this.res_ = res;
    // recalculate damp
    this.damp_ = Math.min(2.0 * (1.0 - Math.pow(this.res_, 0.25)), Math.min(2.0, 2.0 / this.freq_ - this.freq_ * 0.5));
    this.drive_ = this.pre_drive_ * this.res_;
  }

  Low() { return this.out_low_; }
  High() { return this.out_high_; }
  Band() { return this.out_band_; }
  Notch() { return this.out_notch_; }
  Peak() { return this.out_peak_; }
}

class BufferPlayer {
    constructor() {
        this.buffer = null;
        this.readIdx = 0;
        this.loop = true;
        this.playing = true;
    }

    SetBuffer(buffer) {
        this.buffer = buffer;
        this.readIdx = 0;
    }

    Process() {
        if (!this.playing || !this.buffer) return 0.0;

        let out = this.buffer[Math.floor(this.readIdx)];
        this.readIdx++;

        if (this.readIdx >= this.buffer.length) {
            if (this.loop) this.readIdx = 0;
            else {
                this.readIdx = this.buffer.length - 1;
                this.playing = false;
            }
        }
        return out;
    }
}


// Graph Processor
class DaisyAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.nodes = new Map();
    this.connections = []; // Array of {sourceId, targetId}
    this.sampleRate = 48000;
    this.sortedOrder = [];

    this.port.onmessage = (event) => {
      const data = event.data;
      switch (data.type) {
        case 'INIT':
            this.sampleRate = data.sampleRate;
            break;
        case 'CREATE_NODE':
          this.createNode(data.id, data.nodeType, data.params);
          this.updateSort();
          break;
        case 'DELETE_NODE':
          this.deleteNode(data.id);
          this.updateSort();
          break;
        case 'CONNECT':
          this.connect(data.sourceId, data.targetId);
          this.updateSort();
          break;
        case 'DISCONNECT':
          this.disconnect(data.sourceId, data.targetId);
          this.updateSort();
          break;
        case 'UPDATE_PARAM':
          this.updateParam(data.id, data.param, data.value);
          break;
        case 'UPLOAD_BUFFER':
            this.setBuffer(data.id, data.buffer);
            break;
      }
    };
  }

  updateSort() {
      // Topological sort of nodes based on connections
      // 1. Build simple graph
      const graph = new Map();
      const inDegree = new Map();

      this.nodes.forEach((_, id) => {
          graph.set(id, []);
          inDegree.set(id, 0);
      });

      this.connections.forEach(conn => {
          if (graph.has(conn.sourceId) && graph.has(conn.targetId)) {
            graph.get(conn.sourceId).push(conn.targetId);
            inDegree.set(conn.targetId, inDegree.get(conn.targetId) + 1);
          }
      });

      const queue = [];
      inDegree.forEach((degree, id) => {
          if (degree === 0) queue.push(id);
      });

      const result = [];

      while (queue.length > 0) {
          const u = queue.shift();
          result.push(u);

          if (graph.has(u)) {
              graph.get(u).forEach(v => {
                  inDegree.set(v, inDegree.get(v) - 1);
                  if (inDegree.get(v) === 0) {
                      queue.push(v);
                  }
              });
          }
      }

      // Check for remaining nodes (cycles)
      const visited = new Set(result);
      this.nodes.forEach((_, id) => {
          if (!visited.has(id)) result.push(id);
      });

      this.sortedOrder = result;
  }

  createNode(id, type, params) {
    let node;
    if (type === 'oscillator') {
      node = new Oscillator();
      node.Init(this.sampleRate);
      if (params) {
          if (params.freq !== undefined) node.SetFreq(params.freq);
          if (params.amp !== undefined) node.SetAmp(params.amp);
          if (params.waveform !== undefined) node.SetWaveform(params.waveform);
      }
    } else if (type === 'filter') {
      node = new Svf();
      node.Init(this.sampleRate);
      if (params) {
          if (params.cutoff !== undefined) node.SetFreq(params.cutoff);
          if (params.res !== undefined) node.SetRes(params.res);
      }
    } else if (type === 'input') {
        node = new BufferPlayer();
    } else if (type === 'output') {
        node = { type: 'output', Process: (inVal) => inVal };
    }

    if (node) {
      this.nodes.set(id, { instance: node, type: type, output: 0.0 });
    }
  }

  deleteNode(id) {
    this.nodes.delete(id);
    this.connections = this.connections.filter(c => c.sourceId !== id && c.targetId !== id);
  }

  connect(sourceId, targetId) {
    this.connections.push({ sourceId, targetId });
  }

  disconnect(sourceId, targetId) {
    this.connections = this.connections.filter(c => !(c.sourceId === sourceId && c.targetId === targetId));
  }

  updateParam(id, param, value) {
    const nodeData = this.nodes.get(id);
    if (!nodeData) return;
    const node = nodeData.instance;

    if (nodeData.type === 'oscillator') {
      if (param === 'freq') node.SetFreq(value);
      if (param === 'amp') node.SetAmp(value);
      if (param === 'waveform') node.SetWaveform(value);
    } else if (nodeData.type === 'filter') {
      if (param === 'cutoff') node.SetFreq(value);
      if (param === 'res') node.SetRes(value);
      if (param === 'filterType') nodeData.filterType = value;
    }
  }

  setBuffer(id, buffer) {
      const nodeData = this.nodes.get(id);
      if (nodeData && nodeData.type === 'input') {
          nodeData.instance.SetBuffer(buffer);
      }
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channelCount = output.length;

    // Use sortedOrder
    for (let i = 0; i < output[0].length; ++i) {

        // Reset/Update inputs?
        // We will pull inputs on demand inside the loop over sorted nodes to ensure
        // we use the *current sample's* computed output from upstream nodes.

        for (const id of this.sortedOrder) {
            const nodeData = this.nodes.get(id);
            if (!nodeData) continue;
            const node = nodeData.instance;

            // Gather inputs for this node
            let inputSum = 0.0;
            // Find connections where target is this node
            // OPTIMIZATION: pre-calculate incoming edges per node to avoid searching array every sample
            // But for MVP JS, iterating small connection list is okay.
            for (const conn of this.connections) {
                if (conn.targetId === id) {
                    const sourceNode = this.nodes.get(conn.sourceId);
                    if (sourceNode) {
                        inputSum += sourceNode.output;
                    }
                }
            }

            let val = 0.0;

             if (nodeData.type === 'oscillator') {
                 val = node.Process();
             } else if (nodeData.type === 'filter') {
                 node.Process(inputSum);
                 const fType = nodeData.filterType || 0;
                 if (fType === 0) val = node.Low();
                 else if (fType === 1) val = node.High();
                 else if (fType === 2) val = node.Band();
                 else if (fType === 3) val = node.Notch();
                 else if (fType === 4) val = node.Peak();
                 else val = node.Low();
             } else if (nodeData.type === 'input') {
                 val = node.Process();
             } else if (nodeData.type === 'output') {
                 val = inputSum;
                 // Write to system output
                 // Assuming mono processing, duplicate to stereo
                 for (let ch = 0; ch < channelCount; ++ch) {
                    output[ch][i] = val;
                 }
             }

             nodeData.output = val;
        }
    }

    return true;
  }
}

registerProcessor('daisy-audio-processor', DaisyAudioProcessor);
