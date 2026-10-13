# Handover: `pipeline/reference/mars_route_core.py`

For Maheen walkthrough (Task Board: due Wed 14 Oct). About one hour.

## What the file does

| Function | In | Out |
| --- | --- | --- |
| `load_dem(path, res_m=None)` | a DEM GeoTIFF | `(dem, res_m)`: float32 heights with NaN for NoData, reprojected to a local metric CRS |
| `slope_deg(dem, res_m)` | heights in metres | slope in degrees (Horn 3×3, NaN stays NaN) |
| `cost_surface(slope, limit_deg=15, extra=None)` | slope | cost multiplier per cell, `inf` = blocked |
| `plan_route(cost, start, goal)` | cost grid, `(row, col)` ×2 | `(path, total_cost)` |
| `path_stats(path, dem, slope, res_m)` | a route | length (km), max slope (°), total climb (m) |

Run `python pipeline/reference/mars_route_core.py` for a demo on synthetic terrain (a ridge with one pass).

## Things to understand (the reasons behind the code)

1. **Metres, not degrees.** `load_dem` reprojects to `LOCAL_CRS` (equirectangular, `lat_ts=18.4`, `lon_0=77.5`, Mars sphere R = 3,396,190 m). A geographic DEM has pixel sizes in degrees, which would break slope and distance.
2. **Horn slope with the real cell size.** `np.gradient` works per pixel, not per metre.
3. **The table is the function.** `SLOPE_ANCHORS` and `COST_ANCHORS` are interpolated. Edit the table, not the maths. They are **team assumptions**, not NASA numbers (15° limit; 1×, 2.5×, 8×, 35× at 0°, 5°, 10°, 15°).
4. **Step cost = step length × the average of the two cell costs.** This is how skimage's `MCP_Geometric` works (checked on small grids), and `router.ts` copies it. Do not multiply by distance again. The start cell is part of the first average.
5. **No route raises `ValueError`.** `plan_route` raises it for an unreachable goal or a blocked start. Catch it.
6. **Cell ↔ latitude/longitude is linear** because the grid is equirectangular: `lng = west + (col + 0.5) / width × (east − west)`, `lat = north − (row + 0.5) / height × (north − south)`.

## What Maheen builds on top (Task Board)

- `normalise.py`: clip the CTX DEM to the box, reproject with `load_dem` → `data/processed/dem_local.tif`.
- `derive.py`: slope, hillshade, hazard classes, cost grid. Check slope against `gdaldem slope` (Horn), within 0.5°.
- `package_grids.py`: `dem.bin`, `slope.bin`, `cost.bin`, `grid.json`. Compute slope at 20 m first, then reduce to the ~1,000 × 1,000 route grid with a max filter.
- `make_test_routes.py`: three routes as GeoJSON for the JavaScript comparison.

## Known limits

- Uphill and downhill cost the same.
- Rocks, dust and radiation are ignored unless added through `extra`.
- 20 m pixels can hide small cliffs.
- It is a planning aid, not a safety system.

## Check yourself

- [ ] You can explain why the 15° limit is an assumption.
- [ ] You can explain why distance is applied only once.
- [ ] `python pipeline/reference/make_test_grids.py` regenerates the three test grids.
