/**
 * Route finder for the cost grid (Dijkstra, binary heap, 8 neighbours).
 *
 * Matches the Python reference (skimage MCP_Geometric via plan_route in mars_route_core.py):
 *   step cost = step length (1 or sqrt 2) x the AVERAGE of the two cell costs.
 * The start cell is included in that average, and nothing else is added on top.
 *
 * Rules for the cost grid:
 *   - row-major, row 0 = north edge, length must equal width * height
 *   - Infinity (or NaN) = blocked
 *   - finite costs must be > 0
 */

/** [row, col] */
export type Cell = [row: number, col: number];

export interface RouteResult {
  /** Cells from start to goal, inclusive. */
  path: Cell[];
  /** Total weighted cost, same units as the Python reference. */
  cost: number;
}

const DR = [-1, -1, -1, 0, 0, 1, 1, 1];
const DC = [-1, 0, 1, -1, 1, -1, 0, 1];
const STEP = [Math.SQRT2, 1, Math.SQRT2, 1, 1, Math.SQRT2, 1, Math.SQRT2];

/** Binary min-heap of (key, node) pairs stored in typed arrays. Grows as needed. */
class MinHeap {
  private keys: Float64Array;
  private nodes: Int32Array;
  size = 0;

  constructor(capacity = 1024) {
    this.keys = new Float64Array(capacity);
    this.nodes = new Int32Array(capacity);
  }

  push(key: number, node: number): void {
    if (this.size === this.keys.length) {
      const keys = new Float64Array(this.size * 2);
      const nodes = new Int32Array(this.size * 2);
      keys.set(this.keys);
      nodes.set(this.nodes);
      this.keys = keys;
      this.nodes = nodes;
    }
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= key) break;
      this.keys[i] = this.keys[parent];
      this.nodes[i] = this.nodes[parent];
      i = parent;
    }
    this.keys[i] = key;
    this.nodes[i] = node;
  }

  /** Removes the smallest entry. Read topKey and topNode BEFORE calling. */
  pop(): void {
    const last = --this.size;
    if (last === 0) return;
    const key = this.keys[last];
    const node = this.nodes[last];
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= last) break;
      if (child + 1 < last && this.keys[child + 1] < this.keys[child]) child++;
      if (this.keys[child] >= key) break;
      this.keys[i] = this.keys[child];
      this.nodes[i] = this.nodes[child];
      i = child;
    }
    this.keys[i] = key;
    this.nodes[i] = node;
  }

  get topKey(): number {
    return this.keys[0];
  }

  get topNode(): number {
    return this.nodes[0];
  }
}

/**
 * Cheapest route from start to goal, or null if there is none
 * (blocked start or goal, or the goal cannot be reached).
 * Throws RangeError for a wrong-sized grid or cells outside the grid.
 */
export function findRoute(
  cost: ArrayLike<number>,
  width: number,
  height: number,
  start: Cell,
  goal: Cell,
): RouteResult | null {
  if (cost.length !== width * height) {
    throw new RangeError(`cost has ${cost.length} cells, expected ${width} x ${height} = ${width * height}`);
  }
  const [sr, sc] = start;
  const [gr, gc] = goal;
  for (const [r, c] of [start, goal]) {
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r >= height || c >= width) {
      throw new RangeError(`cell [${r}, ${c}] is outside the ${width} x ${height} grid`);
    }
  }

  const s = sr * width + sc;
  const g = gr * width + gc;
  if (!(cost[s] < Infinity) || !(cost[g] < Infinity)) return null; // blocked (Infinity or NaN)

  const dist = new Float64Array(width * height).fill(Infinity);
  const prev = new Int32Array(width * height).fill(-1);
  const heap = new MinHeap();
  dist[s] = 0;
  heap.push(0, s);

  while (heap.size > 0) {
    const d = heap.topKey;
    const u = heap.topNode;
    heap.pop();
    if (d > dist[u]) continue; // stale entry
    if (u === g) break;

    const r = (u / width) | 0;
    const c = u - r * width;
    const cu = cost[u];
    for (let k = 0; k < 8; k++) {
      const nr = r + DR[k];
      const nc = c + DC[k];
      if (nr < 0 || nc < 0 || nr >= height || nc >= width) continue;
      const v = nr * width + nc;
      const cv = cost[v];
      if (!(cv < Infinity)) continue; // blocked
      const nd = d + STEP[k] * 0.5 * (cu + cv);
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        heap.push(nd, v);
      }
    }
  }

  if (dist[g] === Infinity) return null;

  const path: Cell[] = [];
  for (let u = g; u !== -1; u = prev[u]) {
    const r = (u / width) | 0;
    path.push([r, u - r * width]);
  }
  path.reverse();
  return { path, cost: dist[g] };
}
