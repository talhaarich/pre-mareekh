import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findRoute, type Cell } from './router';

// Shared grids made by pipeline/reference/make_test_grids.py (repo root).
interface GridFile {
  name: string;
  width: number;
  height: number;
  cost: (number | null)[];
  start: Cell;
  goal: Cell;
  expected_cost: number | null;
  expected_path: Cell[] | null;
}

function loadGrid(name: string): GridFile {
  const url = new URL(`../../../pipeline/reference/tests/grids/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as GridFile;
}

/** null (blocked) -> Infinity, stored as Float32 like the real cost.bin. */
function toFloat32(g: GridFile): Float32Array {
  return Float32Array.from(g.cost, (v) => (v === null ? Infinity : v));
}

const STEP_LEN = (a: Cell, b: Cell) => (a[0] !== b[0] && a[1] !== b[1] ? Math.SQRT2 : 1);

/** Recompute a path's cost with the same rule as the Python reference. */
function pathCost(path: Cell[], cost: Float32Array, width: number): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    total += STEP_LEN(a, b) * 0.5 * (cost[a[0] * width + a[1]] + cost[b[0] * width + b[1]]);
  }
  return total;
}

describe('findRoute vs the Python reference', () => {
  for (const name of ['open', 'wall_gap']) {
    it(`${name}: same total cost as plan_route, and the path is valid`, () => {
      const g = loadGrid(name);
      const cost = toFloat32(g);
      const res = findRoute(cost, g.width, g.height, g.start, g.goal);
      expect(res).not.toBeNull();
      if (!res) return;

      expect(Math.abs(res.cost - (g.expected_cost as number))).toBeLessThan(1e-9);
      expect(res.path[0]).toEqual(g.start);
      expect(res.path[res.path.length - 1]).toEqual(g.goal);

      for (let i = 1; i < res.path.length; i++) {
        const [r0, c0] = res.path[i - 1];
        const [r1, c1] = res.path[i];
        expect(Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0))).toBe(1); // one 8-neighbour step
        expect(cost[r1 * g.width + c1]).toBeLessThan(Infinity); // never through a blocked cell
      }
      expect(Math.abs(pathCost(res.path, cost, g.width) - res.cost)).toBeLessThan(1e-9);
    });
  }

  it('wall_gap: the route crosses the wall only through the gap (row 22)', () => {
    const g = loadGrid('wall_gap');
    const res = findRoute(toFloat32(g), g.width, g.height, g.start, g.goal);
    const crossing = res?.path.filter(([, c]) => c === 15) ?? [];
    expect(crossing.length).toBeGreaterThan(0);
    for (const [r] of crossing) expect(r).toBe(22);
  });

  it('walled_in: returns null when the goal cannot be reached', () => {
    const g = loadGrid('walled_in');
    expect(g.expected_cost).toBeNull();
    expect(findRoute(toFloat32(g), g.width, g.height, g.start, g.goal)).toBeNull();
  });
});

describe('findRoute edge cases', () => {
  const flat = new Float32Array(25).fill(1);

  it('start equals goal: zero cost, one-cell path', () => {
    expect(findRoute(flat, 5, 5, [2, 2], [2, 2])).toEqual({ path: [[2, 2]], cost: 0 });
  });

  it('blocked start or goal: null', () => {
    const c = flat.slice();
    c[0] = Infinity;
    expect(findRoute(c, 5, 5, [0, 0], [4, 4])).toBeNull();
    expect(findRoute(c, 5, 5, [4, 4], [0, 0])).toBeNull();
  });

  it('NaN counts as blocked', () => {
    const c = flat.slice();
    c[12] = NaN;
    const res = findRoute(c, 5, 5, [2, 0], [2, 4]);
    expect(res).not.toBeNull();
    expect(res?.path.some(([r, col]) => r === 2 && col === 2)).toBe(false);
  });

  it('diagonal move costs sqrt 2 on flat ground', () => {
    const res = findRoute(flat, 5, 5, [0, 0], [4, 4]);
    expect(res?.cost).toBeCloseTo(4 * Math.SQRT2, 9);
  });

  it('throws on a wrong-sized grid or a cell outside the grid', () => {
    expect(() => findRoute(flat, 4, 5, [0, 0], [1, 1])).toThrow(RangeError);
    expect(() => findRoute(flat, 5, 5, [0, 0], [5, 0])).toThrow(RangeError);
    expect(() => findRoute(flat, 5, 5, [-1, 0], [1, 1])).toThrow(RangeError);
  });
});
