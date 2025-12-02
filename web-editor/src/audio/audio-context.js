// Manage AudioContext and AudioWorklet
export class AudioContextManager {
    constructor() {
        this.ctx = null;
        this.node = null;
    }

    async init() {
        if (this.ctx) return;

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        await this.ctx.audioWorklet.addModule('audio-processor.js'); // Vite serves files in public/ at root

        this.node = new AudioWorkletNode(this.ctx, 'daisy-audio-processor');
        this.node.connect(this.ctx.destination);

        this.node.port.postMessage({ type: 'INIT', sampleRate: this.ctx.sampleRate });
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    sendMessage(msg) {
        if (this.node) {
            this.node.port.postMessage(msg);
        }
    }

    async uploadFile(id, file) {
        if (!this.ctx) await this.init();

        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

        // We only take the first channel for now (mono processing)
        const channelData = audioBuffer.getChannelData(0);

        this.sendMessage({
            type: 'UPLOAD_BUFFER',
            id: id,
            buffer: channelData
        });
    }
}

export const audioManager = new AudioContextManager();
