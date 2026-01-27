
function analyzeCycles(n, g) {
    const visited = new Int8Array(n).fill(0); // 0: unvisited, 1: visiting, 2: visited
    const cycles = [];
    const basins = []; // One per cycle (including 0)

    for (let i = 0; i < n; i++) {
        if (visited[i] === 2) continue;

        let path = [];
        let curr = i;
        while (visited[curr] === 0) {
            visited[curr] = 1;
            path.push(curr);
            curr = (curr * g) % n;
        }

        // Now curr is either in current path (new cycle found) or previously visited (merge)
        if (visited[curr] === 1) {
            // New cycle found in this path
            const cycleStart = path.indexOf(curr);
            const cycle = path.slice(cycleStart);
            const prePeriod = path.slice(0, cycleStart);
            cycles.push(cycle);
            // Mark all in path as visited 2
            path.forEach(v => visited[v] = 2);
        } else {
            // Merged into existing
            path.forEach(v => visited[v] = 2);
        }
    }

    return cycles;
}

const n = 76;
const g = 2;
console.log(`Analyzing cycles for N=${n}, g=${g}`);
const cycles = analyzeCycles(n, g);
console.log(`Found ${cycles.length} disjoint cycles/components:`);
cycles.forEach((c, idx) => {
    console.log(`Cycle ${idx}: [${c.join(', ')}] (Length: ${c.length})`);
});
