# Manifest spec

A manifest is one YAML file per region (for example `pipeline/manifests/jezero.yaml`). It tells the pipeline which data layers exist, where each file is, and how to read and show it. The pipeline turns it into the `manifest.json` that the web layer panel reads.

Status: draft by Sadia, 16 Oct 2026. Needs sign-off from Maheen.

## Top level

| Field | Required | Meaning |
|---|---|---|
| `manifest_version` | yes | Integer. Bump it when a field is added or renamed. |
| `region` | yes | The area of interest (see below). |
| `layers` | yes | List of source layers that are downloaded files. |
| `derived` | no | Layers the pipeline makes from other layers (for example slope). |

## `region`

| Field | Meaning |
|---|---|
| `id` | Short lowercase name, used in file paths. Example `jezero`. |
| `name` | Display name. |
| `body` | Planet. Always `mars` for now. |
| `bbox` | `west`, `south`, `east`, `north` in degrees, planetocentric latitude, longitude positive east (0-360). |
| `base_crs` | The CRS the bbox is written in. For us the Mars 2000 sphere in degrees. |

## Fields for each entry in `layers`

| Field | Required | Meaning | Example |
|---|---|---|---|
| `id` | yes | Unique, lowercase, underscores. Used in code and in `manifest.json`. | `ctx_dem` |
| `name` | yes | Label shown in the layer panel. | `Height (CTX, 20 m)` |
| `type` | yes | `raster` (one band of numbers), `raster_rgb` (3-band colour image) or `table` (CSV data, no map). | `raster` |
| `source` | yes | `path` to the local file (relative to the repo root), plus `url` where it came from. Tables can use `pattern`, `sols` and `sensors` to describe a set of files. | see `jezero.yaml` |
| `units` | yes | Unit of the pixel values. Use `none`, `relative` or `class` when there is no physical unit. For tables, a map of column name to unit. | `m` |
| `nodata` | yes | Value meaning "no measurement". Write it even if the file header lacks it (then the pipeline applies it). Use `null` if there truly is none. For RGB, a list of three values. | `-32768` |
| `crs_override` | yes | `null` if the file's own CRS header is correct. Otherwise a PROJ string or WKT that replaces the header. **Do not** use it to reproject; reprojecting is the pipeline's job. | `null` |
| `colormap` | yes | How the web map colours the layer: a named colormap (`terrain`, `greys`, `inferno`, `viridis`), `embedded` (use the file's own colours), or `null` for tables. | `terrain` |
| `credit` | yes | Attribution text shown in the app. Must name the mission or instrument and who made the product. | `NASA/JPL/MSSS (MRO CTX)…` |
| `caveat` | yes | One or two sentences on the layer's main limitation, shown as a tooltip. | `Covers only the landing area.` |

## Fields for each entry in `derived`

| Field | Meaning |
|---|---|
| `id`, `name`, `type`, `units`, `colormap`, `caveat` | Same as above. |
| `from` | `id` of the source layer. |
| `method` | How it is computed (for slope: `horn`). |
| `path` | Where the pipeline writes the output. |

## Rules

1. Every source layer has all ten fields: id, name, type, source, units, nodata, crs_override, colormap, credit, caveat. No blanks; write `null` or `unknown` and explain in `caveat`.
2. Units and vertical reference come from the file header or the provider's label, never guessed. If a unit is assumed, say so.
3. Paths point to `data/raw/`. Large files are not in git; get them from the team Drive folder.
4. A layer that only partly covers the bbox stays in the manifest. Say so in `caveat`.

## Known quirks in `jezero.yaml`

- THEMIS has `lon_0 = 180`; all other rasters use `lon_0 = 0`. Its header is correct, so `crs_override` is `null`, but the pipeline must reproject it with the others.
- CTX photo and CRISM have no NoData stored in the file; the manifest supplies it.
- MEDA is point data from the rover, so it has no CRS and no colormap.
