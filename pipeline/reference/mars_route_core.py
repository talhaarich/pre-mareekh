"""
Mars EVA route planner - corrected core (replaces sections 3-6 of the brief).

What changed vs the brief:
  * src.nodata (not src.nodatavalue) and NaN-safe handling
  * DEM is reprojected to a LOCAL METRIC CRS first, so dx/dy really are metres
    (a geographic or Eqc lat_ts=0 DEM has pixel sizes that are NOT metres at 18 N)
  * Horn 3x3 slope (what gdaldem uses) with real dx/dy; np.gradient was in "per pixel"
  * Cost = lookup table (np.interp) so the table and the maths cannot disagree
  * Distance is applied ONCE (the brief baked D into the cost and A* multiplied it again)
  * Routing via skimage MCP (C speed) instead of a pure-Python heapq loop

All slope/cost numbers below are TEAM ASSUMPTIONS, not official NASA limits.
"""
import numpy as np
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
from skimage.graph import route_through_array

# Metric CRS centred on Jezero (sphere R = 3,396,190 m). True scale at 18.4 N.
LOCAL_CRS = "+proj=eqc +lat_ts=18.4 +lat_0=0 +lon_0=77.5 +a=3396190 +b=3396190 +units=m +no_defs"

# (slope deg, cost multiplier) anchors. Edit these - the table IS the function.
SLOPE_ANCHORS = [0.0, 5.0, 10.0, 15.0]
COST_ANCHORS = [1.0, 2.5, 8.0, 35.0]
SLOPE_LIMIT_DEG = 15.0  # above this -> impassable (assumption, make it a UI slider)


def load_dem(path, res_m=None):
    """Read a DEM, reproject to LOCAL_CRS. Returns (dem float32 with NaN, res_m)."""
    with rasterio.open(path) as src:
        tr, w, h = calculate_default_transform(
            src.crs, LOCAL_CRS, src.width, src.height, *src.bounds, resolution=res_m
        )
        dem = np.full((h, w), np.nan, dtype=np.float32)
        reproject(
            rasterio.band(src, 1), dem, src_nodata=src.nodata, dst_nodata=np.nan,
            dst_transform=tr, dst_crs=LOCAL_CRS, resampling=Resampling.bilinear,
        )
    return dem, abs(tr.a)


def slope_deg(dem, res_m):
    """Horn 3x3 slope in degrees. NaN in -> NaN out."""
    z = np.pad(dem, 1, mode="edge")
    a, b, c = z[:-2, :-2], z[:-2, 1:-1], z[:-2, 2:]
    d, f = z[1:-1, :-2], z[1:-1, 2:]
    g, h, i = z[2:, :-2], z[2:, 1:-1], z[2:, 2:]
    dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * res_m)
    dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * res_m)
    return np.degrees(np.arctan(np.hypot(dzdx, dzdy)))


def cost_surface(slope, limit_deg=SLOPE_LIMIT_DEG, extra=None):
    """Per-cell cost multiplier (>= 1). Blocked cells = np.inf.
    extra: optional array added on top (roughness, shadow, comms...)."""
    cost = np.interp(slope, SLOPE_ANCHORS, COST_ANCHORS).astype(np.float64)
    if extra is not None:
        cost = cost + extra
    cost[~np.isfinite(slope) | (slope > limit_deg)] = np.inf
    return cost


def plan_route(cost, start, goal):
    """start/goal = (row, col). Returns (path [(r,c)...], total weighted cost)."""
    return route_through_array(cost, start, goal, fully_connected=True, geometric=True)


def path_stats(path, dem, slope, res_m):
    """Length (km), max slope on route (deg), total climb (m)."""
    p = np.array(path)
    step = np.hypot(*np.diff(p, axis=0).T) * res_m
    z = dem[p[:, 0], p[:, 1]]
    return {
        "length_km": float(step.sum() / 1000.0),
        "max_slope_deg": float(np.nanmax(slope[p[:, 0], p[:, 1]])),
        "total_climb_m": float(np.nansum(np.clip(np.diff(z), 0, None))),
    }


if __name__ == "__main__":
    # Synthetic demo so everyone can run this before real data exists.
    n, res = 600, 20.0
    y, x = np.mgrid[0:n, 0:n]
    ridge = 400 * np.exp(-((x - 300) ** 2) / (2 * 40 ** 2))           # N-S ridge, steeper than 15 deg
    notch = 1 - np.exp(-((y - 300) ** 2) / (2 * 60 ** 2))             # smooth low pass at row 300
    dem = (ridge * notch).astype(np.float32)
    sl = slope_deg(dem, res)
    cost = cost_surface(sl)
    path, total = plan_route(cost, (300, 20), (300, 580))
    print(path_stats(path, dem, sl, res), "weighted cost:", round(total, 1))