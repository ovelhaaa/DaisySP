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
        }
        // Input and Output nodes don't need C++ classes
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
            // Hardware input (stereo summed to mono for simple MVP)
            init += `        out_${node.id} = in[0][i];\n`;
        } else if (node.type === 'oscillator') {
            init += `        out_${node.id} = ${safeId}.Process();\n`;
        } else if (node.type === 'filter') {
            // Find inputs
            const inputEdges = edges.filter(e => e.target === node.id);
            let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
            if (inputSum === '') inputSum = '0.0f';

            init += `        ${safeId}.Process(${inputSum});\n`;
            init += `        out_${node.id} = ${safeId}.Low();\n`;
        } else if (node.type === 'output') {
            const inputEdges = edges.filter(e => e.target === node.id);
            let inputSum = inputEdges.map(e => `out_${e.source}`).join(' + ');
            if (inputSum === '') inputSum = '0.0f';

            init += `        out[0][i] = ${inputSum};\n`;
            init += `        out[1][i] = ${inputSum};\n`;
        }
    });

    init += `    }\n}\n`;

    return includes + declarations + init + setup;
}
