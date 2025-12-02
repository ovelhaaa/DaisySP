
// Generic Topological Sort for DAG
// nodes: array of objects with 'id'
// edges: array of { source: id, target: id }
// Returns array of node IDs in execution order
export function topologicalSort(nodes, edges) {
    const graph = new Map();
    const inDegree = new Map();

    nodes.forEach(node => {
        graph.set(node.id, []);
        inDegree.set(node.id, 0);
    });

    edges.forEach(edge => {
        if (graph.has(edge.source) && graph.has(edge.target)) {
            graph.get(edge.source).push(edge.target);
            inDegree.set(edge.target, inDegree.get(edge.target) + 1);
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

    if (result.length !== nodes.length) {
        // Cycle detected or disconnected graph issues (though disconnected is fine if acyclic).
        // If cycle, we just return the naive order or result so far + remaining.
        // For audio DAGs, cycles usually imply feedback loops which need specific handling (1-sample delay).
        // We will just append remaining nodes to prevent crashing.
        const visited = new Set(result);
        nodes.forEach(n => {
            if (!visited.has(n.id)) result.push(n.id);
        });
    }

    return result;
}
