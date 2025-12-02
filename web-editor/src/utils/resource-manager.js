export const estimateResources = (nodes) => {
    let cpu = 0; // Cycles per sample (approx)
    let ram = 0; // Bytes

    // Base overhead
    ram += 4096; // Stack/Global overhead
    cpu += 100; // Callback overhead

    nodes.forEach(node => {
        if (node.type === 'oscillator') {
            ram += 64; // float fields
            cpu += 80; // Polyblep is roughly 60-100 cycles?
        } else if (node.type === 'filter') {
            ram += 80;
            cpu += 150; // SVF is heavier
        }
    });

    return {
        ramBytes: ram,
        cpuCycles: cpu,
        cpuPercentSTM32H7: (cpu / 480000000) * 48000 * 100 // VERY rough % of 480MHz running at 48k
    };
};
