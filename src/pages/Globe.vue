<template>
  <section class="map-root">
    <div ref="mapContainer" class="absolute inset-0 h-full w-full"></div>

    <div class="pointer-events-none absolute inset-0">
      <div
        ref="panelRef"
        class="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 top-auto w-auto sm:bottom-auto sm:left-6 sm:right-auto sm:top-28 sm:w-[min(92vw,420px)]"
      >
        <div class="panel pointer-events-auto max-h-[58vh] overflow-y-auto sm:max-h-none">
          <div class="flex items-start justify-between gap-3">
            <p class="panel-title">Global Geolocator Data Package</p>
            <button
              type="button"
              class="button-ghost pointer-events-auto sm:hidden"
              @click="togglePanel"
              :aria-expanded="!isPanelCollapsed"
            >
              <svg v-if="isPanelCollapsed" viewBox="0 0 24 24" class="h-4 w-4" fill="none">
                <path
                  d="M18 15l-6-6-6 6"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none">
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
          <div v-show="!isPanelCollapsed || !isMobile">
            <p class="mt-3 text-sm text-fg/70 sm:text-sm">
              Explore the migration movements of small birds tracked with multi-sensor geolocators.
            </p>

            <div class="mt-4 flex items-center gap-3 sm:mt-5">
              <button class="button-primary" @click="togglePlayback">
                {{ isPlaying ? "Pause" : "Play" }}
              </button>
              <label class="flex items-center gap-2">
                <span class="eyebrow">Speed</span>
                <span class="relative inline-flex items-center">
                  <select
                    v-model.number="speed"
                    aria-label="Playback speed"
                    class="cursor-pointer appearance-none rounded-full border border-fg/20 bg-shade/40 py-1.5 pl-3.5 pr-8 text-sm font-semibold tabular-nums text-fg/90 transition hover:border-fg/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--teal)]"
                  >
                    <option
                      v-for="option in speedOptions"
                      :key="option"
                      :value="option"
                      class="bg-[color:var(--ink)] text-fg"
                    >
                      {{ option }}×
                    </option>
                  </select>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="pointer-events-none absolute right-3 h-3.5 w-3.5 text-fg/60"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </label>
            </div>

            <div class="mt-4 sm:mt-5">
              <div
                class="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-fg/60"
              >
                <span>{{ formatDay(currentDay) }}</span>
              </div>
              <input
                type="range"
                min="1"
                :max="totalDays"
                v-model.number="currentDay"
                @input="jumpToDay"
                @mousedown="startScrub"
                @touchstart="startScrub"
                class="mt-2 w-full accent-[color:var(--teal)]"
              />
            </div>

            <div
              class="mt-5 grid grid-cols-3 gap-2 text-[11px] text-fg/70 sm:mt-6 sm:gap-3 sm:text-xs"
            >
              <div class="card px-2 py-2 sm:px-3 sm:py-3">
                <div
                  class="eyebrow flex items-center gap-2"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="h-4 w-4 text-[color:var(--teal)]"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  Projects
                </div>
                <p class="mt-1 font-display text-lg text-fg sm:mt-2">{{ stats.projects }}</p>
              </div>
              <div class="card px-2 py-2 sm:px-3 sm:py-3">
                <div
                  class="eyebrow flex items-center gap-2"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="h-4 w-4 text-[color:var(--accent)]"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="4.5" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                  Tags
                </div>
                <p class="mt-1 font-display text-lg text-fg sm:mt-2">{{ stats.tags }}</p>
              </div>
              <div class="card px-2 py-2 sm:px-3 sm:py-3">
                <div
                  class="eyebrow flex items-center gap-2"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="h-4 w-4 text-[color:var(--ember)]"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M7 7c2-3 8-3 10 0" />
                    <path d="M7 17c2 3 8 3 10 0" />
                    <circle cx="9" cy="9" r="1.5" />
                    <circle cx="15" cy="15" r="1.5" />
                  </svg>
                  Species
                </div>
                <p class="mt-1 font-display text-lg text-fg sm:mt-2">{{ stats.species }}</p>
              </div>
            </div>

            <p class="mt-4 text-sm text-fg/70 sm:mt-5">
              This
              <a href="https://doi.org/10.5281/zenodo.18187092" target="_blank" rel="noreferrer" class="link">open-access dataset</a>
              is the result of a global community of
              <template v-if="stats.researchers">{{ stats.researchers }}</template>
              researchers openly sharing their data to advance bird research, conservation, and
              public outreach.
            </p>
            <p class="mt-3 text-sm text-fg/70">
              Read more about the
              <a href="https://geopressure.org/GeoLocator-DP/" target="_blank" rel="noreferrer" class="link">GeoLocator Data Package</a>
              standard and the associated data paper
              <a href="https://doi.org/10.1038/s41597-026-08873-x" target="_blank" rel="noreferrer" class="link">Nussbaumer et al. (2026)</a>.
            </p>
          </div>
        </div>
      </div>
      <MapTips
        title="Navigation tips"
        storage-key="geolocator-explorer:nav-tips-dismissed:v1"
        panel-id="navigation-tips"
        position-class="right-4 top-28 sm:bottom-14 sm:right-6 sm:top-auto"
      >
        <li>Each dot is an individual bird, colored by project.</li>
        <li>{{ isMobile ? "Drag to move the globe; pinch to zoom." : "Drag to move the globe; scroll to zoom." }}</li>
        <li>{{ isMobile ? "Tap" : "Click" }} a dot to learn more about the bird or its project.</li>
      </MapTips>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import mapboxgl from "mapbox-gl";
import MapTips from "../components/MapTips.vue";
import { loadGlobe, loadProjects } from "../lib/data";
import { projectSlug } from "../lib/format";
import { MAPBOX_TOKEN } from "../lib/config";
import { buildTagPopupHtml } from "../lib/popup";
import { createSidePopup } from "../lib/mapbox";
import { basemapStyle, mapFog, useTheme } from "../lib/theme";
import chroma from "chroma-js";

const { theme } = useTheme();
const mapContainer = ref(null);
const panelRef = ref(null);
const isMobile = ref(false);
const isPanelCollapsed = ref(false);
const isPlaying = ref(true);
const isScrubbing = ref(false);
const wasPlayingBeforeScrub = ref(false);
const speed = ref(1);
const speedOptions = [0.5, 1, 2, 4];
const currentDay = ref(1);
const totalDays = ref(100);
const stats = ref({ projects: 0, tags: 0, species: 0, researchers: 0 });

let mapInstance;
// True once the current basemap style has loaded (reset while switching theme).
// Not map.isStyleLoaded(): that also stays false while tiles are still downloading.
let styleReady = false;
let geojsonSource;
let geojsonData;
let tailSource;
let tailGeojson;
const dayStart = 1;
let animationId;
let lastTime = 0;
let accumulator = 0;
let dayPositions = [];
let tagLineMap = new Map();
let tagMetaMap = new Map();
let speciesColorMap = new Map();
let hoverPopup;
let hoverLineSource;
let hoverTagId = null;
let pinnedTagId = null;
let handleResize;

const iucnCategoryMeta = (value) => {
  const code = String(value || "").trim().toUpperCase();
  if (!code) return null;
  const labels = {
    LC: "Least Concern",
    NT: "Near Threatened",
    VU: "Vulnerable",
    EN: "Endangered",
    CR: "Critically Endangered",
    DD: "Data Deficient",
  };
  const iconCodes = new Set(Object.keys(labels));
  const icon = iconCodes.has(code) ? `${import.meta.env.BASE_URL}icons/iucn_${code}.png` : "";
  return {
    code,
    label: labels[code] || code,
    icon,
  };
};

const baseDurationMs = 20000;
const tailDays = 30;
const baseUrl = import.meta.env.BASE_URL || "/";

const buildLineSegments = (positions) => {
  const segments = [];
  let current = [];
  let nullRun = 0;
  positions.forEach((pos) => {
    if (pos) {
      if (nullRun > 4 && current.length) {
        segments.push(current);
        current = [];
      }
      nullRun = 0;
      current.push(pos);
      return;
    }
    nullRun += 1;
    if (nullRun > 4 && current.length) {
      segments.push(current);
      current = [];
    }
  });
  if (current.length) {
    segments.push(current);
  }
  if (segments.length > 1 && positions[0] && positions[positions.length - 1]) {
    segments[0] = segments[segments.length - 1].concat(segments[0]);
    segments.pop();
  }
  return segments;
};

const updateMapPadding = () => {
  if (!mapInstance || !mapContainer.value || !panelRef.value) {
    return;
  }
  const mapRect = mapContainer.value.getBoundingClientRect();
  const panelRect = panelRef.value.getBoundingClientRect();
  const isMobile = window.matchMedia("(max-width: 639px)").matches;
  const isSmall = window.matchMedia("(max-width: 1023px)").matches;
  const padding = { top: 0, right: 0, bottom: 0, left: 0 };

  if (isMobile) {
    const overlap = mapRect.bottom - panelRect.top;
    padding.bottom = Math.max(0, overlap + 16);
  } else if (isSmall) {
    const overlap = panelRect.right - mapRect.left;
    padding.left = Math.max(0, overlap + 16);
  }

  mapInstance.setPadding(padding);
};

const updateIsMobile = () => {
  const mobile = window.matchMedia("(max-width: 639px)").matches;
  if (mobile !== isMobile.value) {
    isMobile.value = mobile;
    isPanelCollapsed.value = mobile ? true : false;
  }
};

const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value;
  requestAnimationFrame(() => {
    updateMapPadding();
  });
};

const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
const formatDay = (day) => dayFormatter.format(new Date(Date.UTC(2021, 0, day)));

// Bright pastels read well on the dark basemap; the light basemap needs deeper tones.
const SPECIES_ANCHORS = {
  dark: ["#56f0c4", "#7dd3fc", "#f5b470", "#f97316", "#34d399", "#facc15"],
  light: ["#0a7d5e", "#0369a1", "#b45309", "#c2410c", "#047857", "#a16207"],
};

const buildSpeciesColors = (species) => {
  const unique = Array.from(new Set(species.filter(Boolean)));
  const anchors = SPECIES_ANCHORS[theme.value] || SPECIES_ANCHORS.dark;
  const palette = chroma.scale(anchors).mode("lch").colors(Math.max(unique.length, 1));
  const map = new Map();
  unique.forEach((name, index) => {
    map.set(name, palette[index % palette.length]);
  });
  return map;
};

const setupDots = (paths) => {
  const tags = Array.isArray(paths) ? paths : paths.tags;
  totalDays.value = 365;
  currentDay.value = dayStart;

  dayPositions = tags.map((tag) => tag.positions || []);

  const features = tags.map((tag) => {
    const tagId = tag.tag_id;
    const meta = tagMetaMap.get(tagId);
    const species = meta.species;
    const color = speciesColorMap.get(species) || SPECIES_ANCHORS[theme.value][0];
    return {
      type: "Feature",
      properties: {
        tagId,
        color,
        visible: 0,
      },
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };
  });

  geojsonData = {
    type: "FeatureCollection",
    features,
  };

  tailGeojson = {
    type: "FeatureCollection",
    features: tags.map((tag) => ({
      type: "Feature",
      properties: {
        tagId: tag.tag_id,
        color: speciesColorMap.get(tagMetaMap.get(tag.tag_id).species) || SPECIES_ANCHORS[theme.value][0],
      },
      geometry: {
        type: "LineString",
        coordinates: [],
      },
    })),
  };

  addMapLayers();
  bindMapEvents();
};

// Sources and layers are dropped whenever the basemap style changes (theme switch),
// so they are (re)created here from the data kept in memory.
const addMapLayers = () => {
  mapInstance.addSource("path-dots", {
    type: "geojson",
    data: geojsonData,
  });

  mapInstance.addSource("paths-tail", {
    type: "geojson",
    data: tailGeojson,
  });

  mapInstance.addLayer({
    id: "paths-tail-line",
    type: "line",
    source: "paths-tail",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 2,
      "line-opacity": 0.35,
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  });

  mapInstance.addLayer({
    id: "paths-dots",
    type: "circle",
    source: "path-dots",
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["case", ["==", ["get", "visible"], 1], 4, 0],
      "circle-opacity": ["case", ["==", ["get", "visible"], 1], 0.9, 0],
      "circle-blur": 0.2,
      "circle-stroke-width": 0.5,
      "circle-stroke-color": "rgba(0,0,0,0.6)",
    },
  });

  geojsonSource = mapInstance.getSource("path-dots");
  tailSource = mapInstance.getSource("paths-tail");

  mapInstance.addSource("hover-path", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  mapInstance.addLayer({
    id: "hover-path-line",
    type: "line",
    source: "hover-path",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 2.5,
      "line-opacity": 0.85,
    },
  });
  hoverLineSource = mapInstance.getSource("hover-path");

  updateDay(currentDay.value);
  if (isPlaying.value && !animationId) {
    animationId = requestAnimationFrame(tick);
  }
};

const bindMapEvents = () => {
  mapInstance.on("mousemove", "paths-dots", (event) => {
    if (!event.features || !event.features.length) {
      return;
    }
    mapInstance.getCanvas().style.cursor = "pointer";
    if (!pinnedTagId) {
      setHover(event.features[0], event.lngLat);
    }
  });

  mapInstance.on("mouseleave", "paths-dots", () => {
    mapInstance.getCanvas().style.cursor = "";
    clearHover();
  });

  mapInstance.on("click", "paths-dots", (event) => {
    if (!event.features || !event.features.length) {
      return;
    }
    setHover(event.features[0], event.lngLat, { lock: true });
  });

  mapInstance.on("click", (event) => {
    const hit = mapInstance.queryRenderedFeatures(event.point, { layers: ["paths-dots"] });
    if (!hit.length && pinnedTagId) {
      clearHover({ force: true });
    }
  });
};

const updateDay = (day) => {
  if (!geojsonSource || !tailSource) {
    return;
  }
  const dayIndex = day - 1;
  geojsonData.features.forEach((feature, index) => {
    const positions = dayPositions[index];
    const coords = positions[dayIndex];
    if (coords) {
      feature.geometry.coordinates = coords;
      feature.properties.visible = 1;
    } else {
      feature.properties.visible = 0;
    }
  });
  geojsonSource.setData(geojsonData);

  tailGeojson.features.forEach((feature, index) => {
    const positions = dayPositions[index];
    if (!positions[dayIndex]) {
      feature.geometry.coordinates = [];
      return;
    }
    const coords = [];
    for (let offset = tailDays - 1; offset >= 0; offset -= 1) {
      let idx = dayIndex - offset;
      if (idx < 0) {
        idx += totalDays.value;
      }
      const point = positions[idx];
      if (point) {
        coords.push(point);
      }
    }
    feature.geometry.coordinates = coords;
  });
  tailSource.setData(tailGeojson);
};

const jumpToDay = () => {
  updateDay(currentDay.value);
};

const startScrub = () => {
  if (isScrubbing.value) {
    return;
  }
  isScrubbing.value = true;
  wasPlayingBeforeScrub.value = isPlaying.value;
  isPlaying.value = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
};

const endScrub = () => {
  if (!isScrubbing.value) {
    return;
  }
  isScrubbing.value = false;
  if (wasPlayingBeforeScrub.value) {
    isPlaying.value = true;
    if (!animationId) {
      animationId = requestAnimationFrame(tick);
    }
  }
};

const tick = (time) => {
  if (!isPlaying.value) {
    animationId = null;
    lastTime = 0;
    accumulator = 0;
    return;
  }
  if (!lastTime) {
    lastTime = time;
  }
  const delta = time - lastTime;
  lastTime = time;
  accumulator += delta;
  const step = baseDurationMs / totalDays.value / speed.value;
  while (accumulator >= step) {
    currentDay.value += 1;
    if (currentDay.value > totalDays.value) {
      currentDay.value = dayStart;
    }
    updateDay(currentDay.value);
    accumulator -= step;
  }
  animationId = requestAnimationFrame(tick);
};

const togglePlayback = () => {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value && !animationId) {
    animationId = requestAnimationFrame(tick);
  }
};

const setHover = (feature, lngLat, { lock = false } = {}) => {
  const props = feature.properties;
  const tagId = props.tagId;
  if (!lock && pinnedTagId) {
    return;
  }
  if (lock) {
    pinnedTagId = tagId;
  }
  if (hoverTagId === tagId && hoverPopup && !lock) {
    hoverPopup.setLngLat(lngLat);
    return;
  }
  hoverTagId = tagId;
  const color = props.color || SPECIES_ANCHORS[theme.value][0];
  const segments = tagLineMap.get(tagId);
  const meta = tagMetaMap.get(tagId);

  hoverLineSource.setData(
    segments.length
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { color },
              geometry: {
                type: segments.length === 1 ? "LineString" : "MultiLineString",
                coordinates: segments.length === 1 ? segments[0] : segments,
              },
            },
          ],
        }
      : { type: "FeatureCollection", features: [] },
  );

  const tagLink = `${baseUrl}tag/${encodeURIComponent(tagId)}`;
  const primaryProject = (meta.projectLinks || [])[0];
  const projectLink = primaryProject
    ? `${baseUrl}project/${encodeURIComponent(projectSlug(primaryProject.id))}`
    : "";
  const html = buildTagPopupHtml({
    species: meta.commonName || meta.scientificName || "Unknown species",
    commonName: meta.commonName || "",
    scientificName: meta.scientificName || "",
    iucnIcon: meta.iucnIcon || "",
    iucnLabel: meta.iucnLabel || "",
    tagId,
    tagLink,
    projectLink,
  });
  hoverPopup = createSidePopup(mapInstance, lngLat, html, hoverPopup);
};

const clearHover = ({ force = false } = {}) => {
  if (pinnedTagId && !force) {
    return;
  }
  pinnedTagId = null;
  hoverTagId = null;
  if (hoverPopup) {
    hoverPopup.remove();
    hoverPopup = null;
  }
  hoverLineSource?.setData({ type: "FeatureCollection", features: [] });
};

const applyTheme = () => {
  if (!mapInstance) {
    return;
  }
  clearHover({ force: true });
  geojsonSource = null;
  tailSource = null;
  hoverLineSource = null;
  if (geojsonData) {
    speciesColorMap = buildSpeciesColors(Array.from(tagMetaMap.values(), (meta) => meta.species));
    [geojsonData, tailGeojson].forEach((collection) => {
      collection.features.forEach((feature) => {
        const species = tagMetaMap.get(feature.properties.tagId)?.species;
        feature.properties.color = speciesColorMap.get(species) || SPECIES_ANCHORS[theme.value][0];
      });
    });
    mapInstance.once("style.load", addMapLayers);
  }
  styleReady = false;
  mapInstance.setStyle(basemapStyle(theme.value));
};

watch(theme, applyTheme);

onMounted(async () => {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  const largeScreen = window.matchMedia("(min-width: 1600px)").matches;
  mapInstance = new mapboxgl.Map({
    container: mapContainer.value,
    style: basemapStyle(theme.value),
    center: [15, 5],
    zoom: largeScreen ? 2 : 1.2,
    pitch: 15,
    bearing: 0,
    projection: "globe",
  });
  requestAnimationFrame(() => {
    mapInstance.resize();
    updateMapPadding();
  });
  updateIsMobile();

  mapInstance.on("style.load", () => {
    styleReady = true;
    mapInstance.setFog(mapFog(theme.value));
  });
  mapInstance.once("load", () => {
    updateMapPadding();
  });
  const [paths, projects] = await Promise.all([loadGlobe(), loadProjects()]);
  const tagsData = Array.isArray(paths) ? paths : paths.tags;

  speciesColorMap = buildSpeciesColors(
    tagsData.map((tag) => tag.scientific_name || tag.common_name || "Unknown"),
  );
  tagMetaMap = new Map();
  tagsData.forEach((tag) => {
    const species = tag.scientific_name || tag.common_name || "Unknown";
    const commonName = tag.common_name || "";
    const scientificName = tag.scientific_name || "";
    const iucnMeta = iucnCategoryMeta(tag.iucn_red_list_category);
    const projectId = tag.project_id;
    const projectTitle = tag.project_title || projectId;
    const projectLinks = projectId ? [{ id: projectId, title: projectTitle }] : [];
    tagMetaMap.set(tag.tag_id, {
      species,
      commonName,
      scientificName,
      iucnIcon: iucnMeta?.icon || "",
      iucnLabel: iucnMeta?.label || "",
      projectLinks,
    });
  });

  tagLineMap = new Map();
  tagsData.forEach((tag) => {
    tagLineMap.set(tag.tag_id, buildLineSegments(tag.positions));
  });

  const speciesSet = new Set();
  projects.forEach((project) => {
    project.taxonomic.forEach((taxon) => {
      const name = taxon.scientific_name || taxon.common_name;
      if (name) {
        speciesSet.add(name);
      }
    });
  });

  // Count each person once across projects: by ORCID when given, else by family name + initial.
  const nameKey = (c) =>
    `${c.familyName || c.title || ""} ${(c.givenName || "").slice(0, 1)}`
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  const people = projects
    .flatMap((project) => project.contributors || [])
    .filter((c) => !(c.roles || []).includes("hostinginstitution"));
  const orcidByName = new Map(
    people.filter((c) => c.path?.includes("orcid.org")).map((c) => [nameKey(c), c.path]),
  );
  const researcherSet = new Set(
    people.map((c) =>
      c.path?.includes("orcid.org") ? c.path : orcidByName.get(nameKey(c)) || nameKey(c),
    ),
  );

  const projectsData = projects;
  const tagsCount = projectsData.reduce(
    (total, project) => total + Number((project.counts || project.numberTags).paths || 0),
    0,
  );
  stats.value = {
    projects: projectsData.length,
    tags: tagsCount,
    species: speciesSet.size,
    researchers: researcherSet.size,
  };

  if (styleReady) {
    setupDots(paths);
  } else {
    mapInstance.once("style.load", () => {
      setupDots(paths);
    });
  }

  window.addEventListener("mouseup", endScrub);
  window.addEventListener("touchend", endScrub);
  window.addEventListener("touchcancel", endScrub);
  handleResize = () => {
    updateIsMobile();
    updateMapPadding();
  };
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  window.removeEventListener("mouseup", endScrub);
  window.removeEventListener("touchend", endScrub);
  window.removeEventListener("touchcancel", endScrub);
  if (handleResize) {
    window.removeEventListener("resize", handleResize);
  }
  clearHover({ force: true });
  if (mapInstance) {
    mapInstance.remove();
  }
});
</script>
