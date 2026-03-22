# GeoLocatorExplorer

A playful, data-rich explorer for bird migration. Spin the globe, dive into projects, and track individual tags with a cinematic 3D bird view.

This visualization tool shows all Geolocator studies submitted to the [Geolocator DP Zenodo community](https://zenodo.org/communities/geolocator-dp) and following the standardized format [GeoLocator Data Package (GeoLocator DP)](https://raphaelnussbaumer.com/GeoLocator-DP/).

## Raw data source

The `raw_data/` folder is the source used to build the frontend data assets.  
It consists of a snapshot from Zenodo record `10.5281/zenodo.18187093` (not yet published).

Core input files are:

- `datapackage.json` (resource schema/column definitions)
- `datapackages.csv` (project-level metadata)
- `tags.csv`
- `observations.csv`
- `paths.csv`
- `staps.csv`
- `edges.csv`
- `pressurepaths.csv`
- `twilights.csv`
- `species.csv`

## How `raw_data` is processed

Processing is done by [`scripts/process_data.py`](scripts/process_data.py):

1. Load project metadata from `raw_data/datapackages.csv`.
2. Load and enrich species metadata from `raw_data/species.csv`:
   - canonical scientific name
   - common name
   - Cornell species code
   - `in_ebirdst`
3. Parse tags, observations, movement paths, stopovers, edges, and pressure paths.
4. Keep only the first 10 simulations where `j <= 10` for raw `paths`/`pressurepaths` embedded in tag assets.
5. Filter to tags with valid `staps` + `paths` data.
6. Write optimized frontend assets into `public/data/`:
   - `projects.json`
   - `tags.json`
   - `globe.json`
   - `projects/<project_id>.json`
   - `tags/<tag_id>.json`

## How to run

```bash
# 1) install JS dependencies
npm install

# 2) prepare local Python env for scripts/process_data.py
[ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/python -m pip install pandas

# 3) set env vars
cp .env.example .env
# then set at least: VITE_MAPBOX_TOKEN

# 4) build processed data assets from raw_data/
.venv/bin/python scripts/process_data.py

# optional: skip pressurepaths processing for faster builds
.venv/bin/python scripts/process_data.py --skip-pressurepaths

# 5) start local dev server
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

If build fails with `stream did not contain valid UTF-8` from `threebox-plugin`, run:

```bash
npm run fix:threebox-encoding
npm run build
```

## What this app does

### Global view

[<img width="1199" height="629" alt="Globe view screenshot" src="https://github.com/user-attachments/assets/00395512-95c1-4395-8f96-2ee7fdb649a3" />
](https://geopressure.org/GeoLocatorExplorer/)
[Globe view](https://geopressure.org/GeoLocatorExplorer/) — big-picture look at all projects and tags.

### Project view

[<img width="1199" height="629" alt="Project view screenshot" src="https://github.com/user-attachments/assets/fbdc9cf6-0a46-41a1-8252-be2a576d9112" />
](https://geopressure.org/GeoLocatorExplorer/project/)

[Project view](https://geopressure.org/GeoLocatorExplorer/project/) — metadata, species context, and map exploration.

### Tag view

[<img width="1577" height="1090" alt="Tag view screenshot" src="https://github.com/user-attachments/assets/2c09a85a-cbee-4ecf-8998-c56c7421ea5d" />
](https://geopressure.org/GeoLocatorExplorer/tag/)

[Tag view](https://geopressure.org/GeoLocatorExplorer/tag/) — timelines, pressure paths, and a 3D bird model that follows the track.

[<img width="927" height="583" alt="BirdView screenshot" src="https://github.com/user-attachments/assets/d96cbe0f-1713-4761-bfb4-a5861b65224d" />
](https://geopressure.org/GeoLocatorExplorer/tag/)

Try BirdView mode in full screen.

## Tech stack

<table width="100%">
  <thead>
    <tr>
      <th align="center">
        Vue<br/>
        <sub>UI framework</sub>
      </th>
      <th align="center">
        Vite<br/>
        <sub>Build & dev tooling</sub>
      </th>
      <th align="center">
        Tailwind CSS<br/>
        <sub>Utility-first styling</sub>
      </th>
      <th align="center">
        Mapbox GL JS<br/>
        <sub>Interactive maps & globe</sub>
      </th>
      <th align="center">
        Threebox<br/>
        <sub>3D bird model on map</sub>
      </th>
      <th align="center">
        Plotly<br/>
        <sub>Charts & timelines</sub>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <a href="https://vuejs.org/">
          <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vuejs/vuejs-original.svg" height="40"/>
        </a>
      </td>
      <td align="center">
        <a href="https://vite.dev/">
          <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vitejs/vitejs-original.svg" height="40"/>
        </a>
      </td>
      <td align="center">
        <a href="https://tailwindcss.com/">
          <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" height="40"/>
        </a>
      </td>
      <td align="center">
        <a href="https://docs.mapbox.com/mapbox-gl-js/guides/">
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/1f/Mapbox_logo_2019.svg" height="40"/>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/jscastro76/threebox">
          <img src="https://threejs.org/files/favicon.ico" height="40"/>
        </a>
      </td>
      <td align="center">
        <a href="https://plotly.com/javascript/">
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Plotly-logo.png" height="40"/>
        </a>
      </td>
    </tr>
  </tbody>
</table>
