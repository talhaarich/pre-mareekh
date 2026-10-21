# Data — Jezero Crater

## Study area (the "box")

| Edge | Value |
|---|---|
| North | 18.85 °N |
| South | 17.95 °N |
| West | 77.10 °E |
| East | 78.00 °E |

## Footprint check — CTX height file (DEM)

- **File:** `M20_JezeroCrater_CTXDEM_20m.tif`
- **Source:** https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif
- **Checked on:** 16 Oct 2026
- **Command:** `gdalinfo /vsicurl/<link above>` (GDAL 3.13.3)

| Property | Value |
|---|---|
| Size (pixels, width × height) | 4456 × 5067 (about 89.1 km × 101.3 km) |
| Pixel size | 20 m × 20 m |
| Data type | Float32, 1 band (height in metres) |
| Coordinate system | `Jezero_Crater_Projection` — Equidistant Cylindrical on the Mars 2000 sphere (radius 3,396,190 m), standard parallel 18.4663°, central meridian 0°, units metres |
| NoData value | -3.4028235e+38 |
| Upper left | 76.9974 °E, 19.2902 °N |
| Lower left | 76.9974 °E, 17.5805 °N |
| Upper right | 78.5826 °E, 19.2902 °N |
| Lower right | 78.5826 °E, 17.5805 °N |
| Centre | 77.7900 °E, 18.4354 °N |

**File extent in degrees:** 17.58–19.29 °N, 77.00–78.58 °E

### Does it cover the box?

**YES — the file covers the whole box.** Every edge of the file lies outside the box:

| Edge | Box | File | Margin |
|---|---|---|---|
| North | 18.85 °N | 19.29 °N | +0.44° |
| South | 17.95 °N | 17.58 °N | +0.37° |
| West | 77.10 °E | 77.00 °E | +0.10° |
| East | 78.00 °E | 78.58 °E | +0.58° |

**Usable bounds:** the full box, 17.95–18.85 °N, 77.10–78.00 °E.

**Caveat:** this checks the file's outer frame only. The mosaic may contain NoData gaps inside the frame (for example, between stitched DEM strips); confirm visually in QGIS before relying on every pixel.

## Data log

All files live in `data/raw/` (large files shared by Drive link, not git). Coordinate systems were read from each file's own header with GDAL/rasterio on 16 Oct 2026. All rasters use the Mars 2000 sphere (radius 3,396,190 m), Equidistant Cylindrical projection, units metres; they differ only in standard parallel (`lat_ts`) and central meridian (`lon_0`).

| Layer | File name | Source link | Resolution | Coordinate system | Units and vertical reference | Download date | Credit |
|---|---|---|---|---|---|---|---|
| Height (sharp) | `M20_JezeroCrater_CTXDEM_20m.tif` | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif | 20 m, 4456 × 5067 px, Float32 | Eqc, Mars 2000 sphere, lat_ts 18.4663, lon_0 0 | Metres; vertically tied to MOLA (areoid). NoData −3.4028235e+38. Range seen in QGIS: −3447 to −506 m | 6 Oct 2026 (file date) | NASA/JPL/MSSS (MRO CTX); mosaic by F. Calef, USGS Astrogeology (2021) |
| Height (coarse) | `mola_463m_jezero.tif` (clipped to box from the global mosaic) | https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif | 463 m, 116 × 116 px, Int16 | Eqc, Mars 2000 sphere, lat_ts 0, lon_0 0 | Metres above the areoid (GMM-2B). NoData −32768. Range −2888 to −1465 m | 16 Oct 2026 | NASA/GSFC MGS MOLA Science Team; mosaic by USGS Astrogeology |
| Photo | `M20_JezeroCrater_CTXortho_mosaic_5m.tif` | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXortho_mosaic_5m.tif | 5 m, 17766 × 20234 px, 8-bit grey | Eqc, Mars 2000 sphere, lat_ts 18.4663, lon_0 0 (same as the CTX height file) | Image brightness 0–255, no physical unit. No NoData set in the file (black edges are 0). Covers 17.58–19.29 °N, 77.00–78.58 °E | 16 Oct 2026 | NASA/JPL/MSSS (MRO CTX); mosaic by USGS Astrogeology / JPL |
| Minerals | `jezeroFinal.tif` (+ colour key in `Jezero_readme.pdf`) | https://zenodo.org/records/5575824 | 36 m, 614 × 751 px, 3-band RGB 8-bit | Eqc, Mars 2000 sphere, lat_ts 0, lon_0 0 | Class map: each RGB colour is a mineral class at high or medium confidence (see readme). 0,0,0 = no match / no data. Covers only 18.28–18.74 °N, 77.27–77.64 °E | 16 Oct 2026 | M. Parente, Y. Itoh, A. M. Saranathan (UMass), from MRO CRISM scenes HRL000040FF, FRT000047A3, FRT00005C5E, FRS00031442; CC BY 4.0 |
| Heat | `themis_dayir_100m_jezero.tif` (clipped to box from the Syrtis Major tile) | https://astrogeology.usgs.gov/search/map/mars_themis_day_ir_controlled_mosaic_syrtis_major_00n_45e_100_mpp | 100 m, 534 × 535 px, 8-bit | Eqc, Mars 2000 sphere, lat_ts 0, **lon_0 180** | Relative daytime infrared brightness 1–255, not a calibrated temperature. NoData 0 | 16 Oct 2026 | NASA/ASU Mars Odyssey THEMIS; controlled mosaic by USGS Astrogeology (2014) |
| Weather | `meda/WE__010[0-2]___…_DER_{PS,RHS,TIRS,WS}_…CSV` (12 CSVs + 12 XML labels) | https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/sol_0090_0179/ | Point data at the rover, about 1 reading per second; sols 100, 101, 102 | None (single point at the rover's position each sol); time columns SCLK, LMST, LTST | PS: pressure (Pa). RHS: relative humidity (unit not stated in label; values like 3.6 suggest %), sensor temperature (K), water volume mixing ratio (ppm). TIRS: downward and upward long-wave irradiance (W/m²). WS: horizontal and vertical wind speed (m/s), wind direction (°). Missing value 999999999 in WS. Exact units are in each XML label | 16 Oct 2026 | NASA/JPL-Caltech, CAB (CSIC-INTA) Mars 2020 MEDA team; NASA PDS Atmospheres Node |
| Slope | not downloaded; derived from the CTX height file by Maheen (`slope.tif`) | — | 20 m (same as source) | Same as CTX height file after reprojection | Degrees | — | Derived by the team from the CTX DEM |

### Notes for the team

- **THEMIS uses a different central meridian (lon_0 180)** from every other layer (lon_0 0). The file is correctly georeferenced, but it needs reprojecting before it is stacked with the others. This is a likely `crs_override` / reprojection case for the manifest.
- **CRISM and the photo layers have no NoData value stored in the file.** Treat 0 (black) as NoData when displaying them.
- **The CRISM map covers only the landing area,** not the whole box. The app should show it as a smaller overlay.
- **The MEDA TIRS derived files hold irradiance (W/m²), not ground temperature.** Ground temperature in kelvin is in the calibrated (`data_calibrated_env`) collection if we need it.
- **Vertical references differ slightly:** MOLA heights are above the areoid. The CTX DEM was adjusted vertically to match MOLA, so the two should agree to within tens of metres. Spot-check a few points before comparing them directly.
- **Large files** (CTX photo 360 MB, CTX height 90 MB) are shared through Google Drive, not committed to git.
