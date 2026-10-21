# Pre-Mareekh

An interactive, layered map of **Jezero Crater, Mars**, with an astronaut route planner, plus a **pipeline** that can build the same kind of map for other places on Mars from a short settings file.

Built for the **NASA Space Apps Challenge 2026**, challenge: *Interplanetary Survival Guide: Martian Map*.

> **Status:** early setup (Oct 2026). Some files listed below do not exist yet. The tree shows the plan.

## What it does

- **Layers you can switch on and off:** height (elevation), photo, minerals, heat and weather, each with a legend, credit and caveat.
- **Click inspector:** latitude, longitude, height and slope at any point.
- **Route planner:** pick a start and a goal, get the cheapest walking route that avoids steep ground, with length, steepest slope, total climb and an elevation profile.
- **3D view:** terrain and hillshade built from the height data.
- **Pipeline:** a settings file (the manifest) lists a place and its layers. The pipeline fetches, checks, clips, reprojects and packages everything the app needs.

## Team

| Area | People |
| --- | --- |
| Frontend, map and routing (`web/`) | Talha, Rafay |
| Data pipeline (`pipeline/`, `data/`) | Sadia, Maheen |

Ask before changing the other side's folders.

## Folder structure

```
pre-mareekh/
├── README.md
├── LICENSE
├── .gitignore
├── environment.yml                 # Python environment (conda-forge)
│
├── data/
│   ├── README.md                   # data log: source, resolution, CRS, date, credit for every file
│   ├── raw/                        # original downloads. NOT in git (share by drive link)
│   └── processed/                  # clipped + reprojected rasters. NOT in git
│
├── pipeline/
│   ├── fetch.py                    # download once, cache, checksum
│   ├── validate.py                 # CRS, units, coverage and resolution checks
│   ├── meda.py                     # MEDA weather CSV -> meda.json
│   ├── report.py                   # validation report
│   ├── manifests/
│   │   └── jezero.yaml             # settings file: the place and its layers
│   ├── scripts/
│   │   └── download_jezero_data.bat  # Windows + OSGeo4W: downloads every source layer into data/raw/
│   ├── steps/
│   │   ├── normalise.py            # clip + reproject to a local metric CRS
│   │   ├── derive.py               # slope, hillshade, hazard classes, cost grid
│   │   ├── package_grids.py        # dem.bin, slope.bin, cost.bin, grid.json
│   │   └── write_manifest.py       # manifest.json for the app
│   └── reference/
│       ├── mars_route_core.py      # tested Python reference: load DEM, slope, cost, route
│       ├── make_test_routes.py     # three test routes as GeoJSON
│       └── tests/grids/            # shared test grids (Python vs JavaScript router)
│
├── web/
│   ├── public/data/                # what the app loads: tiles, grids, manifest.json, meda.json
│   └── src/
│       ├── components/             # layer panel, legends, inspector, route tool, charts
│       ├── map/                    # map engine setup (MapLibre GL JS)
│       ├── state/                  # app state (layers on/off, opacity, route)
│       ├── lib/                    # mars.ts (distance), grid.ts (cell <-> lat/lon), router.ts
│       └── workers/                # router.worker.ts (route finding off the main thread)
│
└── docs/                           # team guide, technical brief, data contract, notes
    ├── MANIFEST_SPEC.md            # what every field in a manifest means
    └── layers/                     # one plain-English explainer per layer + preview images in img/
```

Git does not track empty folders. Put an empty `.gitkeep` file in `data/raw/` and `data/processed/` so they exist after a clone.

## Getting started

These commands work once the matching files are committed.

**Python pipeline**

```bash
conda env create -f environment.yml
python pipeline/reference/mars_route_core.py     # runs a demo on synthetic terrain
```

**Web app**

```bash
cd web
npm install
npm run dev
```

## Data

Data files are **not** stored in git. Every file we use is logged in [`data/README.md`](data/README.md) with its source, resolution, coordinate system, download date and credit.

**Region box:** 17.95–18.85 °N, 77.10–78.00 °E. All rasters are on the Mars 2000 sphere (radius 3,396,190 m).

Sources in use (all public, downloaded 16 Oct 2026):

| Layer | File in `data/raw/` | Resolution | Coverage | Source |
| --- | --- | --- | --- | --- |
| Height | `M20_JezeroCrater_CTXDEM_20m.tif` | 20 m | Whole box | Mars 2020 CTX DEM mosaic, USGS Astrogeology |
| Height (context) | `mola_463m_jezero.tif` | 463 m | Whole box (clipped) | MGS MOLA global DEM, USGS Astrogeology |
| Photo | `M20_JezeroCrater_CTXortho_mosaic_5m.tif` | 5 m | Whole box | CTX orthomosaic, USGS (planetarymaps.usgs.gov) |
| Minerals | `jezeroFinal.tif` + `Jezero_readme.pdf` | 36 m | Landing area only | CRISM mineral map, Zenodo record 5575824 |
| Heat | `themis_dayir_100m_jezero.tif` | 100 m | Whole box (clipped) | THEMIS day IR controlled mosaic (Syrtis Major tile), USGS |
| Weather | `meda/*.CSV` (+ PDS labels) | ~1 reading/s | Rover position, sols 100–102 | MEDA derived data, PDS Atmospheres Node |

Display imagery can also come from NASA's Mars Trek tile service.

**Getting the data:** download the shared Drive folder from the team chat into `data/raw/`, or rebuild it with `pipeline\scripts\download_jezero_data.bat` (Windows, needs OSGeo4W/QGIS for GDAL).

**Known data quirks** (details in [`data/README.md`](data/README.md)):

- THEMIS uses a central meridian of 180°; every other raster uses 0°. It must be reprojected before stacking.
- The CTX photo and CRISM files store no NoData value; treat 0 (black) as NoData.
- MEDA TIRS derived files hold infrared irradiance (W/m²), not ground temperature.

Layer explainers for the judges and the team are in [`docs/layers/`](docs/layers/). The manifest format is described in [`docs/MANIFEST_SPEC.md`](docs/MANIFEST_SPEC.md).

**Rule:** Mars Trek tiles are pictures, so we use them for display only. Slope and routes are computed from the original raster files.

## Assumptions and limits

- The **15° slope limit** and the **effort table** used for routing are team assumptions, not official NASA numbers. They are adjustable in the app and labelled as assumptions.
- The route planner is a planning aid, not a safety system. It ignores rocks, dust and radiation unless a layer for them is added, and it treats uphill and downhill the same.
- Slope depends on the pixel size of the height data, so routes use the 20 m CTX DEM, not the 463 m MOLA map.
- Web map engines assume an Earth-sized world, so distances and scale use our own Mars functions (radius 3,396,190 m).

## Work done before the event

Anything built before the hackathon weekend is listed here so it is clear what is new. Add a row for each group of pre-event commits.

| Date | What | Who |
| --- | --- | --- |
| 12 Oct 2026 | Repo, README, `.gitignore`; Python reference for slope, cost and routing (`mars_route_core.py`); technical brief | Talha |
| 16 Oct 2026 | Data downloads and footprint check; data log (`data/README.md`); layer explainers (`docs/layers/`); manifest spec and `jezero.yaml` draft; download script (`pipeline/scripts/`) | Sadia |

## AI assistance

Parts of the planning documents, the Python reference file, the data log, layer explainers, manifest spec and download script were drafted with Claude (Anthropic) and then reviewed and tested by the team. Update this section if the 2026 rules ask for a specific format.

## Credits

NASA, JPL, the USGS Astrogeology Science Center, the Planetary Data System, the Mars Trek team, and the CTX, HiRISE, CRISM, THEMIS, MOLA and MEDA instrument teams. Map engine: MapLibre GL JS.

## License

See [`LICENSE`](LICENSE).
