@echo off
REM ==================================================================
REM  download_jezero_data.bat
REM  Downloads every Phase 1 source layer for the Jezero region into
REM  data\raw\ (relative to the repo root). Windows + OSGeo4W (GDAL).
REM
REM  Usage: run from the repo root:   pipeline\scripts\download_jezero_data.bat
REM  Needs: OSGeo4W / QGIS installed (for gdal_translate), curl (built into Windows 10+)
REM  Output: data\raw\...  plus data\raw\download_log.txt
REM  Large files are NOT committed to git - share via the team Drive.
REM  Box: 17.95-18.85 N, 77.10-78.00 E  (see pipeline\manifests\jezero.yaml)
REM ==================================================================
setlocal

REM --- GDAL environment (edit if OSGeo4W is installed elsewhere) ---
if exist "%LOCALAPPDATA%\Programs\OSGeo4W\bin\o4w_env.bat" call "%LOCALAPPDATA%\Programs\OSGeo4W\bin\o4w_env.bat"
if exist "C:\OSGeo4W\bin\o4w_env.bat" call "C:\OSGeo4W\bin\o4w_env.bat"
where gdal_translate >nul 2>&1 || (echo ERROR: gdal_translate not found. Install OSGeo4W/QGIS. & exit /b 1)

set "ROOT=%~dp0..\.."
set "OUT=%ROOT%\data\raw"
if not exist "%OUT%\meda" mkdir "%OUT%\meda"
cd /d "%OUT%"
set "LOG=%OUT%\download_log.txt"
echo Started %DATE% %TIME% > "%LOG%"

set "BOX=-projwin 77.10 18.85 78.00 17.95 -projwin_srs "+proj=longlat +R=3396190 +no_defs""
set "CTX=https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL"

REM --- 1. CTX height (20 m) ---
call :get "M20_JezeroCrater_CTXDEM_20m.tif" "%CTX%/M20_JezeroCrater_CTXDEM_20m.tif"

REM --- 2. CTX photo (5 m, ~360 MB) ---
call :get "M20_JezeroCrater_CTXortho_mosaic_5m.tif" "%CTX%/M20_JezeroCrater_CTXortho_mosaic_5m.tif"

REM --- 3. MOLA 463 m, clipped to the box (reads only the needed part of the 2 GB global file) ---
echo [MOLA] clipping to box...
gdal_translate %BOX% /vsicurl/https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif mola_463m_jezero.tif >> "%LOG%" 2>&1 && (echo RESULT mola OK>>"%LOG%") || (echo RESULT mola FAILED>>"%LOG%")

REM --- 4. CRISM mineral map + colour key (Zenodo 5575824) ---
call :get "jezeroFinal.tif" "https://zenodo.org/records/5575824/files/jezeroFinal.tif?download=1"
call :get "Jezero_readme.pdf" "https://zenodo.org/records/5575824/files/Jezero_readme.pdf?download=1"

REM --- 5. THEMIS day IR 100 m, clipped to the box (Syrtis Major tile) ---
echo [THEMIS] clipping to box...
gdal_translate %BOX% /vsicurl/https://planetarymaps.usgs.gov/mosaic/Mars/THEMIS_controlled_mosaics/SyrtisMajor_DayIR_31July2014/THEMIS_DayIR_ControlledMosaic_SyrtisMajor_00N45E_100mpp.tif themis_dayir_100m_jezero.tif >> "%LOG%" 2>&1 && (echo RESULT themis OK>>"%LOG%") || (echo RESULT themis FAILED>>"%LOG%")

REM --- 6. MEDA derived weather CSVs + PDS labels, sols 100-102 ---
set "M=https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/sol_0090_0179"
REM Each line: <sol folder> <file name without extension>. Use the highest version (Pxx) on PDS.
for %%L in (
 "sol_0100 WE__0100___________DER_PS__________________P01"
 "sol_0100 WE__0100___________DER_RHS_________________P02"
 "sol_0100 WE__0100___________DER_TIRS________________P03"
 "sol_0100 WE__0100___________DER_WS__________________P02"
 "sol_0101 WE__0101___________DER_PS__________________P01"
 "sol_0101 WE__0101___________DER_RHS_________________P02"
 "sol_0101 WE__0101___________DER_TIRS________________P03"
 "sol_0101 WE__0101___________DER_WS__________________P02"
 "sol_0102 WE__0102___________DER_PS__________________P01"
 "sol_0102 WE__0102___________DER_RHS_________________P02"
 "sol_0102 WE__0102___________DER_TIRS________________P03"
 "sol_0102 WE__0102___________DER_WS__________________P03"
) do for /f "tokens=1,2" %%A in (%%L) do (
  call :get "meda\%%B.CSV" "%M%/%%A/%%B.CSV"
  call :get "meda\%%B.xml" "%M%/%%A/%%B.xml"
)

echo Finished %DATE% %TIME% >> "%LOG%"
echo.
type "%LOG%"
endlocal
exit /b 0

REM --- helper: download %2 to %1 unless it already exists ---
:get
if exist "%~1" (echo SKIP %~1 already present>>"%LOG%" & exit /b 0)
echo Downloading %~1 ...
curl -L --fail -sS -o "%~1" "%~2" >> "%LOG%" 2>&1
if errorlevel 1 (echo RESULT %~1 FAILED>>"%LOG%" & if exist "%~1" del "%~1") else (echo RESULT %~1 OK>>"%LOG%")
exit /b 0
