"""
Build the three shared test grids for the route finder (Python vs JavaScript).

    python pipeline/reference/make_test_grids.py

Writes pipeline/reference/tests/grids/{open,wall_gap,walled_in}.json.
Each file holds: name, width, height, cost (row-major, null = blocked), start, goal,
expected_cost and expected_path (both null when there is no route).
Expected values come from plan_route() in mars_route_core.py, the Python reference.

Costs are multiples of 0.25, so they are exact in float32 and float64 alike.
The JavaScript tests compare total cost (not the exact path), because two different
paths can have the same cost.
"""
import json
import pathlib
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from mars_route_core import plan_route  # noqa: E402

OUT = HERE / "tests" / "grids"


def random_costs(h, w, seed):
    rs = np.random.RandomState(seed)
    return 1.0 + 0.25 * rs.randint(0, 13, size=(h, w))  # 1.00 .. 4.00 in steps of 0.25


def solve(cost, start, goal):
    try:
        path, total = plan_route(cost, start, goal)
        return [[int(r), int(c)] for r, c in path], float(total)
    except ValueError:  # skimage raises ValueError when no route exists
        return None, None


def write(name, cost, start, goal):
    h, w = cost.shape
    path, total = solve(cost, start, goal)
    flat = [None if not np.isfinite(v) else float(v) for v in cost.ravel()]
    data = {
        "name": name, "width": w, "height": h, "cost": flat,
        "start": list(start), "goal": list(goal),
        "expected_cost": total, "expected_path": path,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}.json").write_text(json.dumps(data))
    print(f"{name:10s} {w}x{h}  expected_cost={total}  path_len={None if path is None else len(path)}")


def main():
    # 1. open ground: random costs, no obstacles
    open_grid = random_costs(30, 30, seed=1)
    write("open", open_grid, (2, 3), (27, 26))

    # 2. a wall of blocked cells down column 15 with a single gap at row 22
    wall = random_costs(30, 30, seed=2)
    wall[:, 15] = np.inf
    wall[22, 15] = 2.0
    write("wall_gap", wall, (5, 3), (6, 27))

    # 3. the goal is ringed by blocked cells: no route exists
    ringed = random_costs(20, 20, seed=3)
    ringed[9:12, 9:12] = np.inf
    ringed[10, 10] = 1.0  # the goal cell itself is open, but unreachable
    write("walled_in", ringed, (1, 1), (10, 10))


if __name__ == "__main__":
    main()
