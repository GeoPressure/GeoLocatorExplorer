# GeoLocatorExplorer

A playful, data-rich explorer for geolocator migrations. Spin the globe, dive into projects,
and track individual tags with a cinematic 3D bird view.

## What this app does
- Globe view for a big-picture look at all projects and tags.
- Project view for metadata, species context, and map exploration.
- Tag view for timelines, pressure paths, and a 3D bird model that follows the track.

Built with Vue + Vite, Mapbox GL, Threebox, and Plotly.

## GeoLocator DP + Zenodo
This project is designed to work with the GeoLocator Data Package (GeoLocator DP), a
standardized format for geolocator data that follows the Data Package specification. It
separates metadata, core resources, and optional trajectory data (GeoPressureR outputs).

Explore the standard and documentation here:
- GeoLocator DP overview: <https://raphaelnussbaumer.com/GeoLocator-DP/>
- Zenodo community (all published GeoLocator DP datasets): <https://zenodo.org/communities/geolocator-dp>

## Quick start
```bash
npm install
npm run dev
```

## Data pipeline
Raw data lives in `raw_data/` and is processed into `public/data/` for the frontend.

```bash
npm run build:data
```

Outputs include:
- `public/data/projects.json`
- `public/data/tags.json`
- `public/data/globe.json`
- `public/data/tags/<tag_id>.json`

## Deploy (GitHub Pages)
This repo includes a GitHub Actions workflow for Pages. Make sure `public/data/` is present
in the repo so the site can load data at build time.

## Tech stack
- Vue 3 + Vite
- Mapbox GL JS
- Threebox (3D model on the map)
- Plotly (charts)
- Tailwind CSS

## Credits
GeoLocator DP and its ecosystem (GeoPressureR, GeoLocatoR) are maintained by the GeoLocator
development team. This explorer is built to showcase those data packages on the web.
