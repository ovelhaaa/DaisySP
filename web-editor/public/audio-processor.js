
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

// --- New DSP Modules ---

class Allpass {
    constructor() {
        this.buffer = new Float32Array(48000); // 1 sec max
        this.bufferSize = 48000;
        this.writeIdx = 0;
        this.revTime = 0.5;
        this.loopTime = 0.1;
        this.sr = 48000;
        this.coef = 0.5;
    }

    Init(sr) {
        this.sr = sr;
        this.CalcCoef();
    }

    SetRevTime(rt) {
        this.revTime = rt;
        this.CalcCoef();
    }

    SetDelay(d) {
        this.loopTime = d;
        this.CalcCoef();
    }

    CalcCoef() {
        if (this.revTime <= 0) this.coef = 0;
        else this.coef = Math.pow(10.0, (-3.0 * this.loopTime) / this.revTime);
    }

    Process(inVal) {
        let delaySamps = Math.floor(this.loopTime * this.sr);
        if (delaySamps >= this.bufferSize) delaySamps = this.bufferSize - 1;
        if (delaySamps < 1) delaySamps = 1;

        let readIdx = this.writeIdx - delaySamps;
        if (readIdx < 0) readIdx += this.bufferSize;

        let bufOut = this.buffer[readIdx];
        let out = -inVal + bufOut;
        this.buffer[this.writeIdx] = inVal + (bufOut * this.coef);

        this.writeIdx++;
        if (this.writeIdx >= this.bufferSize) this.writeIdx = 0;

        return out;
    }
}

class Phaser {
    constructor() {
        this.lfoPhase = 0;
        this.lfoFreq = 0.5;
        this.depth = 0.5;
        this.feedback = 0.0;
        this.lastOut = 0.0;

        this.ap = new Array(6).fill(0).map(() => ({ x: 0, y: 0 }));
        this.sr = 48000;
    }

    Init(sr) { this.sr = sr; }

    SetFreq(f) { this.lfoFreq = f; }
    SetDepth(d) { this.depth = d; }
    SetFeedback(fb) { this.feedback = fb; }

    Process(inVal) {
        this.lfoPhase += this.lfoFreq / this.sr;
        if (this.lfoPhase > 1) this.lfoPhase -= 1;
        const lfo = (Math.sin(this.lfoPhase * TWO_PI) + 1.0) * 0.5;

        const minFreq = 100;
        const maxFreq = 3000;
        const freq = minFreq + (maxFreq - minFreq) * lfo * this.depth;

        const sp = Math.tan(Math.PI * freq / this.sr);
        const a = (1.0 - sp) / (1.0 + sp);

        let sig = inVal + this.lastOut * this.feedback;

        for (let i = 0; i < 6; i++) {
             let y = a * (sig - this.ap[i].y) + this.ap[i].x;
             this.ap[i].x = sig;
             this.ap[i].y = y;
             sig = y;
        }

        this.lastOut = sig;
        return sig;
    }
}

class Compressor {
    constructor() {
        this.thresh = -20; // dB
        this.ratio = 2.0;
        this.attack = 0.01;
        this.release = 0.1;
        this.gain = 1.0;
        this.sr = 48000;
        this.env = 0.0;
    }

    Init(sr) { this.sr = sr; }
    SetThresh(t) { this.thresh = t; }
    SetRatio(r) { this.ratio = r; }

    Process(inVal, sidechain) {
        const det = Math.abs(sidechain);

        const attCoef = Math.exp(-1.0 / (this.attack * this.sr));
        const relCoef = Math.exp(-1.0 / (this.release * this.sr));

        const coef = det > this.env ? attCoef : relCoef;
        this.env = coef * this.env + (1.0 - coef) * det;

        const env_db = 20.0 * Math.log10(this.env + 1e-6);
        let gain_db = 0.0;

        if (env_db > this.thresh) {
            gain_db = (this.thresh - env_db) * (1.0 - 1.0 / this.ratio);
        }

        const target_gain = Math.pow(10.0, gain_db / 20.0);

        return inVal * target_gain;
    }
}

class Limiter {
    constructor() {
        this.thresh = -0.1;
        this.sr = 48000;
    }
    Init(sr) { this.sr = sr; }
    Process(inVal) {
        const limit = Math.pow(10, this.thresh / 20);
        let out = inVal;

        if (out > limit) out = limit;
        if (out < -limit) out = -limit;

        return out;
    }
}

class Delay {
    constructor() {
        this.buffer = new Float32Array(96000); // 2 sec
        this.writeIdx = 0;
        this.delayTime = 0.5;
        this.feedback = 0.5;
        this.mix = 0.5;
        this.sr = 48000;
    }

    Init(sr) { this.sr = sr; }
    SetDelay(t) { this.delayTime = t; }
    SetFeedback(f) { this.feedback = f; }
    SetMix(m) { this.mix = m; }

    Process(inVal) {
        let delaySamps = Math.floor(this.delayTime * this.sr);
        if (delaySamps >= 96000) delaySamps = 95999;
        if (delaySamps < 1) delaySamps = 1;

        let readIdx = this.writeIdx - delaySamps;
        if (readIdx < 0) readIdx += 96000;

        const bufOut = this.buffer[readIdx];

        // Write to buffer with feedback
        this.buffer[this.writeIdx] = inVal + (bufOut * this.feedback);

        this.writeIdx++;
        if (this.writeIdx >= 96000) this.writeIdx = 0;

        // Wet/Dry
        return (inVal * (1.0 - this.mix)) + (bufOut * this.mix);
    }
}

class PitchShifter {
    constructor() {
        this.shift = 0.0; // semitones
        this.sr = 48000;
        this.buffer = new Float32Array(4000); // Small buffer
        this.writeIdx = 0;
        this.phase = 0.0;
        this.windowSize = 2000;
    }

    Init(sr) { this.sr = sr; }
    SetShift(st) { this.shift = st; }

    Process(inVal) {
        const ratio = Math.pow(2.0, this.shift / 12.0);

        this.buffer[this.writeIdx] = inVal;
        this.writeIdx = (this.writeIdx + 1) % 4000;

        this.phase += (1.0 - ratio) / this.windowSize;
        if (this.phase < 0) this.phase += 1.0;
        if (this.phase >= 1) this.phase -= 1.0;

        const offset1 = this.phase * this.windowSize;
        const offset2 = ((this.phase + 0.5) % 1.0) * this.windowSize;

        const r1 = this.GetSample(this.writeIdx - offset1);
        const r2 = this.GetSample(this.writeIdx - offset2);

        const g1 = Math.sin(this.phase * Math.PI);
        const g2 = Math.sin(((this.phase + 0.5) % 1.0) * Math.PI);

        return (r1 * g1 + r2 * g2) * 0.707;
    }

    GetSample(idx) {
        let i = Math.floor(idx);
        if (i < 0) i += 4000;
        if (i >= 4000) i -= 4000; // wrap
        return this.buffer[i];
    }
}

class Reverb {
    constructor() {
        this.time = 0.9;
        this.damp = 15000;
        this.combs = [
            { buf: new Float32Array(2000), idx: 0, size: 1557, val: 0 },
            { buf: new Float32Array(2000), idx: 0, size: 1617, val: 0 },
            { buf: new Float32Array(2000), idx: 0, size: 1491, val: 0 },
            { buf: new Float32Array(2000), idx: 0, size: 1422, val: 0 }
        ];
        this.allpasses = [
            { buf: new Float32Array(1000), idx: 0, size: 225, val: 0 },
            { buf: new Float32Array(1000), idx: 0, size: 556, val: 0 }
        ];
        this.sr = 48000;
    }

    Init(sr) { this.sr = sr; }
    SetTime(t) { this.time = t; }
    SetDamp(d) { this.damp = d; }

    Process(inVal) {
        let out = 0;
        for (let i = 0; i < 4; i++) {
            const c = this.combs[i];
            const read = c.buf[c.idx];
            const newVal = inVal + (read * this.time);
            c.val = c.val * 0.5 + newVal * 0.5;
            c.buf[c.idx] = c.val;
            c.idx++;
            if (c.idx >= c.size) c.idx = 0;
            out += read;
        }
        for (let i = 0; i < 2; i++) {
            const a = this.allpasses[i];
            const read = a.buf[a.idx];
            const processed = -out + read;
            a.buf[a.idx] = out + (read * 0.5);
            a.idx++;
            if (a.idx >= a.size) a.idx = 0;
            out = processed;
        }
        return out * 0.2;
    }
}

class GranularDelay {
    constructor() {
        this.buffer = new Float32Array(48000); // 1s buffer
        this.writeIdx = 0;
        this.size = 0.1; // 100ms
        this.density = 0.5;
        this.spread = 0.1;
        this.sr = 48000;

        this.grains = [];
        this.maxGrains = 10;
        for(let i=0; i<this.maxGrains; i++) {
            this.grains.push({ active: false, pos: 0, startPos: 0, life: 0, maxLife: 0, speed: 1.0 });
        }

        this.scheduler = 0;
    }

    Init(sr) { this.sr = sr; }
    SetSize(s) { this.size = fclamp(s, 0.001, 0.5); }
    SetDensity(d) { this.density = fclamp(d, 0.01, 1.0); }
    SetSpread(s) { this.spread = s; }

    Process(inVal) {
        // Write
        this.buffer[this.writeIdx] = inVal;

        // Spawn Grains
        // Density dictates rate. 1.0 = rapid fire (every 100 samples?), 0.1 = slow
        const rate = 1.0 / (this.density * 50 + 1); // rough mapping
        this.scheduler += 1.0/this.sr;

        if (this.scheduler > rate * 0.1) { // Spawn?
             // Find inactive grain
             const grain = this.grains.find(g => !g.active);
             if (grain) {
                 grain.active = true;
                 grain.maxLife = this.size * this.sr;
                 grain.life = 0;

                 // Random start pos (jitter) based on spread
                 // Read from somewhat recent past
                 const jitter = (Math.random() - 0.5) * this.spread * this.sr;
                 let start = this.writeIdx - (this.sr * 0.1) + jitter; // 100ms delay + jitter
                 if (start < 0) start += 48000;
                 grain.startPos = start;
                 grain.pos = 0;
                 grain.speed = 1.0; // Could add pitch rand
             }
             this.scheduler = 0;
        }

        this.writeIdx++;
        if (this.writeIdx >= 48000) this.writeIdx = 0;

        // Process Grains
        let out = 0.0;
        let activeCount = 0;

        for (let i = 0; i < this.maxGrains; i++) {
            const g = this.grains[i];
            if (g.active) {
                // Window (Hanning)
                const phase = g.life / g.maxLife;
                const win = 0.5 * (1.0 - Math.cos(TWO_PI * phase));

                let readIdx = g.startPos + g.pos;
                if (readIdx >= 48000) readIdx -= 48000;

                out += this.buffer[Math.floor(readIdx)] * win;

                g.pos += g.speed;
                g.life++;
                if (g.life >= g.maxLife) g.active = false;
                activeCount++;
            }
        }

        return out * (1.0 / (activeCount + 1)) * 2.0; // Normalization
    }
}

// Graph Processor
class DaisyAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.nodes = new Map();
    this.connections = []; // Array of {sourceId, targetId, sourceHandle, targetHandle}
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
          this.connect(data.sourceId, data.targetId, data.sourceHandle, data.targetHandle);
          this.updateSort();
          break;
        case 'DISCONNECT':
          this.disconnect(data.sourceId, data.targetId, data.sourceHandle, data.targetHandle);
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
    // Default params object if undefined
    const p = params || {};

    if (type === 'oscillator') {
      node = new Oscillator();
      node.Init(this.sampleRate);
      if (p.freq !== undefined) node.SetFreq(p.freq);
      if (p.amp !== undefined) node.SetAmp(p.amp);
      if (p.waveform !== undefined) node.SetWaveform(p.waveform);
    } else if (type === 'filter') {
      node = new Svf();
      node.Init(this.sampleRate);
      if (p.cutoff !== undefined) node.SetFreq(p.cutoff);
      if (p.res !== undefined) node.SetRes(p.res);
    } else if (type === 'input') {
        node = new BufferPlayer();
    } else if (type === 'output') {
        node = { type: 'output', Process: (inVal) => inVal };
    } else if (type === 'allpass') {
        node = new Allpass();
        node.Init(this.sampleRate);
        if (p.delay !== undefined) node.SetDelay(p.delay);
        if (p.rev_time !== undefined) node.SetRevTime(p.rev_time);
    } else if (type === 'phaser') {
        node = new Phaser();
        node.Init(this.sampleRate);
        if (p.freq !== undefined) node.SetFreq(p.freq);
        if (p.depth !== undefined) node.SetDepth(p.depth);
        if (p.feedback !== undefined) node.SetFeedback(p.feedback);
    } else if (type === 'compressor') {
        node = new Compressor();
        node.Init(this.sampleRate);
        if (p.thresh !== undefined) node.SetThresh(p.thresh);
        if (p.ratio !== undefined) node.SetRatio(p.ratio);
    } else if (type === 'limiter') {
        node = new Limiter();
        node.Init(this.sampleRate);
    } else if (type === 'reverb') {
        node = new Reverb();
        node.Init(this.sampleRate);
        if (p.time !== undefined) node.SetTime(p.time);
        if (p.damp !== undefined) node.SetDamp(p.damp);
    } else if (type === 'delay') {
        node = new Delay();
        node.Init(this.sampleRate);
        if (p.time !== undefined) node.SetDelay(p.time);
        if (p.feedback !== undefined) node.SetFeedback(p.feedback);
        if (p.mix !== undefined) node.SetMix(p.mix);
    } else if (type === 'pitchshifter') {
        node = new PitchShifter();
        node.Init(this.sampleRate);
        if (p.shift !== undefined) node.SetShift(p.shift);
    } else if (type === 'granulardelay') {
        node = new GranularDelay();
        node.Init(this.sampleRate);
        if (p.size !== undefined) node.SetSize(p.size);
        if (p.density !== undefined) node.SetDensity(p.density);
        if (p.spread !== undefined) node.SetSpread(p.spread);
    }

    if (node) {
      // Store params in nodeData for reference (e.g. base freq)
      this.nodes.set(id, { instance: node, type: type, output: 0.0, params: p });
    }
  }

  deleteNode(id) {
    this.nodes.delete(id);
    this.connections = this.connections.filter(c => c.sourceId !== id && c.targetId !== id);
  }

  connect(sourceId, targetId, sourceHandle, targetHandle) {
    this.connections.push({ sourceId, targetId, sourceHandle, targetHandle });
  }

  disconnect(sourceId, targetId, sourceHandle, targetHandle) {
    this.connections = this.connections.filter(c =>
        !(c.sourceId === sourceId && c.targetId === targetId &&
          c.sourceHandle === sourceHandle && c.targetHandle === targetHandle)
    );
  }

  updateParam(id, param, value) {
    const nodeData = this.nodes.get(id);
    if (!nodeData) return;
    const node = nodeData.instance;

    // Update stored params
    nodeData.params[param] = value;

    // Direct update logic (will be overridden by Process if modulation exists)
    if (nodeData.type === 'oscillator') {
      if (param === 'freq') node.SetFreq(value);
      if (param === 'amp') node.SetAmp(value);
      if (param === 'waveform') node.SetWaveform(value);
    } else if (nodeData.type === 'filter') {
      if (param === 'cutoff') node.SetFreq(value);
      if (param === 'res') node.SetRes(value);
      if (param === 'filterType') nodeData.filterType = value;
    } else if (nodeData.type === 'allpass') {
      if (param === 'delay') node.SetDelay(value);
      if (param === 'rev_time') node.SetRevTime(value);
    } else if (nodeData.type === 'phaser') {
      if (param === 'freq') node.SetFreq(value);
      if (param === 'depth') node.SetDepth(value);
      if (param === 'feedback') node.SetFeedback(value);
    } else if (nodeData.type === 'compressor') {
      if (param === 'thresh') node.SetThresh(value);
      if (param === 'ratio') node.SetRatio(value);
    } else if (nodeData.type === 'limiter') {
        if (param === 'thresh') node.thresh = value;
    } else if (nodeData.type === 'reverb') {
        if (param === 'time') node.SetTime(value);
        if (param === 'damp') node.SetDamp(value);
    } else if (nodeData.type === 'delay') {
        if (param === 'time') node.SetDelay(value);
        if (param === 'feedback') node.SetFeedback(value);
        if (param === 'mix') node.SetMix(value);
    } else if (nodeData.type === 'pitchshifter') {
        if (param === 'shift') node.SetShift(value);
    } else if (nodeData.type === 'granulardelay') {
        if (param === 'size') node.SetSize(value);
        if (param === 'density') node.SetDensity(value);
        if (param === 'spread') node.SetSpread(value);
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

    for (let i = 0; i < output[0].length; ++i) {

        for (const id of this.sortedOrder) {
            const nodeData = this.nodes.get(id);
            if (!nodeData) continue;
            const node = nodeData.instance;

            // Gather inputs for this node
            let inputSum = 0.0;
            let sidechainSum = 0.0;
            let freqMod = 0.0;
            let ampMod = 0.0;
            let cutoffMod = 0.0;
            let resMod = 0.0;

            // Connections to this node
            for (const conn of this.connections) {
                if (conn.targetId === id) {
                    const sourceNode = this.nodes.get(conn.sourceId);
                    if (sourceNode) {
                        const val = sourceNode.output;

                        // Check targetHandle
                        const handle = conn.targetHandle;
                        if (!handle || handle === 'in') {
                            inputSum += val;
                        } else if (handle === 'sidechain') {
                            sidechainSum += val;
                        } else if (handle === 'freq') {
                            freqMod += val;
                        } else if (handle === 'amp') {
                            ampMod += val;
                        } else if (handle === 'cutoff') {
                            cutoffMod += val;
                        } else if (handle === 'res') {
                            resMod += val;
                        }
                    }
                }
            }

            let val = 0.0;

             if (nodeData.type === 'oscillator') {
                 // Apply Modulation
                 let finalFreq = (nodeData.params.freq || 100) + freqMod;
                 node.SetFreq(finalFreq);

                 let finalAmp = (nodeData.params.amp || 0.5) + ampMod;
                 if (finalAmp < 0) finalAmp = 0;
                 if (finalAmp > 1) finalAmp = 1;
                 node.SetAmp(finalAmp);

                 val = node.Process();
             } else if (nodeData.type === 'filter') {
                 // Cutoff Mod
                 let finalCutoff = (nodeData.params.cutoff || 1000) + cutoffMod;
                 node.SetFreq(finalCutoff);

                 let finalRes = (nodeData.params.res || 0.0) + resMod;
                 if (finalRes < 0) finalRes = 0;
                 if (finalRes > 1) finalRes = 1;
                 node.SetRes(finalRes);

                 node.Process(inputSum);
                 const fType = nodeData.params.filterType || 0;
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
                 for (let ch = 0; ch < channelCount; ++ch) {
                    output[ch][i] = val;
                 }
             } else if (nodeData.type === 'allpass') {
                 val = node.Process(inputSum);
             } else if (nodeData.type === 'phaser') {
                 val = node.Process(inputSum);
             } else if (nodeData.type === 'compressor') {
                 let sc = sidechainSum;
                 const hasSC = this.connections.some(c => c.targetId === id && c.targetHandle === 'sidechain');
                 if (!hasSC) sc = inputSum;

                 val = node.Process(inputSum, sc);
             } else if (nodeData.type === 'limiter') {
                 val = node.Process(inputSum);
             } else if (nodeData.type === 'reverb') {
                 val = node.Process(inputSum);
             } else if (nodeData.type === 'delay') {
                 val = node.Process(inputSum);
             } else if (nodeData.type === 'pitchshifter') {
                 val = node.Process(inputSum);
             } else if (nodeData.type === 'granulardelay') {
                 val = node.Process(inputSum);
             }

             nodeData.output = val;
        }
    }

    return true;
  }
}

registerProcessor('daisy-audio-processor', DaisyAudioProcessor);
