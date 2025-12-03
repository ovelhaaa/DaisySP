import { topologicalSort } from './graph-utils.js';

export function generateCpp(nodes, edges) {
    let includes = `#include "daisysp.h"\n#include "daisy_seed.h"\n\nusing namespace daisysp;\nusing namespace daisy;\n\nDaisySeed hw;\n`;
    let declarations = `\n// DSP Modules\n`;
    let init = `\nvoid AudioCallback(AudioHandle::InputBuffer in, AudioHandle::OutputBuffer out, size_t size)\n{\n    for (size_t i = 0; i < size; i++)\n    {\n`;
    let setup = `\nint main(void)\n{\n    hw.Configure();\n    hw.Init();\n    float sample_rate = hw.AudioSampleRate();\n`;

    // 1. Declarations
    nodes.forEach(node => {
        const safeId = `node_${node.id}`;
        if (node.type === 'oscillator') {
            declarations += `Oscillator ${safeId};\n`;
            setup += `    ${safeId}.Init(sample_rate);\n`;
            setup += `    ${safeId}.SetFreq(${node.data.freq}f);\n`;
            setup += `    ${safeId}.SetAmp(${node.data.amp}f);\n`;
            setup += `    ${safeId}.SetWaveform(${node.data.waveform});\n`;
        } else if (node.type === 'filter') {
            declarations += `Svf ${safeId};\n`;
            setup += `    ${safeId}.Init(sample_rate);\n`;
            setup += `    ${safeId}.SetFreq(${node.data.cutoff}f);\n`;
            setup += `    ${safeId}.SetRes(${node.data.res}f);\n`;
        } else if (node.type === 'allpass') {
            declarations += `Comb ${safeId};\n`; // Placeholder mapping
            setup += `    ${safeId}.Init(sample_rate, 9600);\n`;
            setup += `    ${safeId}.SetPeriod(${node.data.delay}f * sample_rate);\n`;
            setup += `    ${safeId}.SetDamp(${node.data.rev_time}f);\n`;
        } else if (node.type === 'phaser') {
            declarations += `Phaser ${safeId};\n`;
            setup += `    ${safeId}.Init(sample_rate);\n`;
            setup += `    ${safeId}.SetFreq(${node.data.freq}f);\n`;
            setup += `    ${safeId}.SetLfoDepth(${node.data.depth}f);\n`;
            setup += `    ${safeId}.SetFeedback(${node.data.feedback}f);\n`;
        } else if (node.type === 'compressor') {
            declarations += `Compressor ${safeId};\n`;
            setup += `    ${safeId}.Init(sample_rate);\n`;
            setup += `    ${safeId}.SetThreshold(${node.data.thresh}f);\n`;
            setup += `    ${safeId}.SetRatio(${node.data.ratio}f);\n`;
        } else if (node.type === 'limiter') {
            declarations += `Limiter ${safeId};\n`;
            setup += `    ${safeId}.Init();\n`;
        } else if (node.type === 'reverb') {
            declarations += `ReverbSc ${safeId};\n`;
            setup += `    ${safeId}.Init(sample_rate);\n`;
            setup += `    ${safeId}.SetFeedback(${node.data.time}f);\n`;
            setup += `    ${safeId}.SetLpFreq(${node.data.damp}f);\n`;
        } else if (node.type === 'delay') {
            declarations += `DelayLine<float, 96000> ${safeId};\n`;
            setup += `    ${safeId}.Init();\n`;
            setup += `    ${safeId}.SetDelay(${node.data.time}f * sample_rate);\n`;
        } else if (node.type === 'pitchshifter') {
            declarations += `PitchShifter ${safeId};\n`;
            setup += `    ${safeId}.Init(sample_rate);\n`;
            setup += `    ${safeId}.SetTransposition(${node.data.shift}f);\n`;
        } else if (node.type === 'granulardelay') {
            declarations += `Grainlet ${safeId};\n`; // Using Grainlet as approx or similar
            setup += `    ${safeId}.Init(sample_rate);\n`;
            setup += `    ${safeId}.SetFreq(${node.data.density}f * 10.0f);\n`; // rough mapping
            // Grainlet API might differ, assume simple mapping or comments
        }
    });

    setup += `\n    hw.StartAudio(AudioCallback);\n    while(1) {}\n}\n`;

    // 2. Audio Callback Logic

    // Declare output variables for all nodes (except output node)
    nodes.forEach(node => {
        if (node.type !== 'output') {
             init += `        float out_${node.id} = 0.0f;\n`;
        }
    });

    init += `\n        // Processing\n`;

    // Sort nodes to ensure dependencies are calculated first
    const sortedIds = topologicalSort(nodes, edges);
    const sortedNodes = sortedIds.map(id => nodes.find(n => n.id === id)).filter(n => n !== undefined);

    sortedNodes.forEach(node => {
        const safeId = `node_${node.id}`;

        if (node.type === 'input') {
            init += `        out_${node.id} = in[0][i];\n`;
        } else if (node.type === 'oscillator') {
            const freqEdges = edges.filter(e => e.target === node.id && e.targetHandle === 'freq');
            const ampEdges = edges.filter(e => e.target === node.id && e.targetHandle === 'amp');

            if (freqEdges.length > 0) {
                const freqMod = freqEdges.map(e => `out_${e.source}`).join(' + ');
                init += `        ${safeId}.SetFreq(${node.data.freq}f + ${freqMod});\n`;
            }
            if (ampEdges.length > 0) {
                 const ampMod = ampEdges.map(e => `out_${e.source}`).join(' + ');
                 init += `        ${safeId}.SetAmp(${node.data.amp}f + ${ampMod});\n`;
            }
            init += `        out_${node.id} = ${safeId}.Process();\n`;
        } else if (node.type === 'filter') {
            const inputEdges = edges.filter(e => e.target === node.id && (!e.targetHandle || e.targetHandle === 'in'));
            let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
            if (inputSum === '') inputSum = '0.0f';

            const cutoffEdges = edges.filter(e => e.target === node.id && e.targetHandle === 'cutoff');
            const resEdges = edges.filter(e => e.target === node.id && e.targetHandle === 'res');

            if (cutoffEdges.length > 0) {
                 const mod = cutoffEdges.map(e => `out_${e.source}`).join(' + ');
                 init += `        ${safeId}.SetFreq(${node.data.cutoff}f + ${mod});\n`;
            }
            if (resEdges.length > 0) {
                 const mod = resEdges.map(e => `out_${e.source}`).join(' + ');
                 init += `        ${safeId}.SetRes(${node.data.res}f + ${mod});\n`;
            }
            init += `        ${safeId}.Process(${inputSum});\n`;
            const fType = node.data.filterType || 0;
            if (fType === 0) init += `        out_${node.id} = ${safeId}.Low();\n`;
            else if (fType === 1) init += `        out_${node.id} = ${safeId}.High();\n`;
            else if (fType === 2) init += `        out_${node.id} = ${safeId}.Band();\n`;
            else if (fType === 3) init += `        out_${node.id} = ${safeId}.Notch();\n`;
            else if (fType === 4) init += `        out_${node.id} = ${safeId}.Peak();\n`;
            else init += `        out_${node.id} = ${safeId}.Low();\n`;
        } else if (node.type === 'output') {
            const inputEdges = edges.filter(e => e.target === node.id);
            let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
            if (inputSum === '') inputSum = '0.0f';

            init += `        out[0][i] = ${inputSum};\n`;
            init += `        out[1][i] = ${inputSum};\n`;
        } else if (node.type === 'allpass') {
             const inputEdges = edges.filter(e => e.target === node.id);
             let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
             if (inputSum === '') inputSum = '0.0f';
             init += `        out_${node.id} = ${safeId}.Process(${inputSum});\n`;
        } else if (node.type === 'phaser') {
             const inputEdges = edges.filter(e => e.target === node.id);
             let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
             if (inputSum === '') inputSum = '0.0f';
             init += `        out_${node.id} = ${safeId}.Process(${inputSum});\n`;
        } else if (node.type === 'compressor') {
             const inputEdges = edges.filter(e => e.target === node.id && (!e.targetHandle || e.targetHandle === 'in'));
             let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
             if (inputSum === '') inputSum = '0.0f';

             const scEdges = edges.filter(e => e.target === node.id && e.targetHandle === 'sidechain');
             let scSum = inputSum;
             if (scEdges.length > 0) {
                 scSum = scEdges.map(e => `out_${e.source}`).join(' + ');
             }
             init += `        out_${node.id} = ${safeId}.Process(${inputSum}, ${scSum});\n`;
        } else if (node.type === 'limiter') {
             const inputEdges = edges.filter(e => e.target === node.id);
             let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
             if (inputSum === '') inputSum = '0.0f';
             init += `        out_${node.id} = ${safeId}.Process(${inputSum});\n`;
        } else if (node.type === 'reverb') {
             const inputEdges = edges.filter(e => e.target === node.id);
             let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
             if (inputSum === '') inputSum = '0.0f';

             init += `        float rv_outL, rv_outR;\n`;
             init += `        ${safeId}.Process(${inputSum}, ${inputSum}, &rv_outL, &rv_outR);\n`;
             init += `        out_${node.id} = (rv_outL + rv_outR) * 0.5f;\n`;
        } else if (node.type === 'delay') {
             const inputEdges = edges.filter(e => e.target === node.id);
             let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
             if (inputSum === '') inputSum = '0.0f';

             init += `        float d_out = ${safeId}.Read();\n`;
             init += `        ${safeId}.Write(${inputSum} + d_out * ${node.data.feedback}f);\n`;
             init += `        out_${node.id} = (${inputSum} * (1.0f - ${node.data.mix}f)) + (d_out * ${node.data.mix}f);\n`;
        } else if (node.type === 'pitchshifter') {
             const inputEdges = edges.filter(e => e.target === node.id);
             let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
             if (inputSum === '') inputSum = '0.0f';
             init += `        out_${node.id} = ${safeId}.Process(${inputSum});\n`;
        } else if (node.type === 'granulardelay') {
             const inputEdges = edges.filter(e => e.target === node.id);
             let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
             if (inputSum === '') inputSum = '0.0f';
             init += `        out_${node.id} = ${safeId}.Process(${inputSum});\n`;
        }
    });

    init += `    }\n}\n`;

    return includes + declarations + init + setup;
}
