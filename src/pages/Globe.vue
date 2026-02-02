<template>
  <section class="map-root">
    <div ref="mapContainer" class="absolute inset-0 h-full w-full"></div>

    <div class="pointer-events-none absolute inset-0">
      <div
        ref="panelRef"
        class="absolute bottom-4 left-4 right-4 top-auto w-auto sm:bottom-auto sm:left-6 sm:right-auto sm:top-28 sm:w-[min(92vw,420px)]"
      >
        <div class="panel pointer-events-auto max-h-[58vh] overflow-y-auto sm:max-h-none">
          <div class="flex items-start justify-between gap-3">
            <p class="panel-title">Global Geolocator Data Package</p>
            <button
              type="button"
              class="pointer-events-auto inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70 sm:hidden"
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
            <p class="mt-3 text-sm text-white/70 sm:text-sm">
              Explore the migration movements of small birds tracked with multi-sensor geolocators.
            </p>

            <div class="mt-4 flex items-center gap-3 sm:mt-5">
              <button class="button-primary" @click="togglePlayback">
                {{ isPlaying ? "Pause" : "Play" }}
              </button>
              <div class="flex w-16 items-center gap-2">
                <span class="text-[10px] uppercase tracking-[0.2em] text-white/60">Speed</span>
                <select
                  v-model.number="speed"
                  class="w-16 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/80"
                >
                  <option v-for="option in speedOptions" :key="option" :value="option">
                    {{ option }}x
                  </option>
                </select>
              </div>
            </div>

            <div class="mt-4 sm:mt-5">
              <div
                class="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60"
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
              class="mt-5 grid grid-cols-3 gap-2 text-[11px] text-white/70 sm:mt-6 sm:gap-3 sm:text-xs"
            >
              <div class="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 sm:px-3 sm:py-3">
                <div
                  class="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50"
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
                <p class="mt-1 font-display text-lg text-white sm:mt-2">{{ stats.projects }}</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 sm:px-3 sm:py-3">
                <div
                  class="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50"
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
                <p class="mt-1 font-display text-lg text-white sm:mt-2">{{ stats.tags }}</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 sm:px-3 sm:py-3">
                <div
                  class="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50"
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
                <p class="mt-1 font-display text-lg text-white sm:mt-2">{{ stats.species }}</p>
              </div>
            </div>

            <p class="mt-4 text-sm text-white/70 sm:mt-5">
              This dataset is the result of a global community of researchers openly sharing their
              data to advance research, conservation, and public outreach.
            </p>
            <p class="mt-3 text-sm text-white/70">
              Learn more at
              <a
                href="https://raphaelnussbaumer.com/GeoLocator-DP/"
                target="_blank"
                rel="noreferrer"
                class="text-[color:var(--teal)] underline decoration-white/30 underline-offset-4 transition hover:text-white"
              >
                raphaelnussbaumer.com/GeoLocator-DP
              </a>
            </p>
          </div>
        </div>
      </div>
      <div
        v-if="showNavTips"
        class="pointer-events-auto absolute bottom-4 right-4 hidden w-[min(88vw,360px)] rounded-2xl border border-white/10 bg-gradient-to-br from-black/80 via-black/60 to-black/40 p-5 text-sm text-white/75 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur sm:block sm:bottom-6 sm:right-6"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[color:var(--teal)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                class="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5" />
                <circle cx="12" cy="16" r="1" />
              </svg>
            </span>
            <p class="text-[11px] uppercase tracking-[0.22em] text-white/70">Navigation tips</p>
          </div>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-white/30 hover:text-white"
            @click="showNavTips = false"
            aria-label="Dismiss navigation tips"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none">
              <path
                d="M6 6l12 12M18 6l-12 12"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        <ul class="mt-3 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-white/80">
          <li>Each dot represents an individual bird, colored by project.</li>
          <li>Click a dot to learn more about the bird or its project.</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import mapboxgl from "mapbox-gl";
import { loadGlobe, loadProjects } from "../lib/data";
import { projectSlug } from "../lib/format";
import { MAPBOX_TOKEN } from "../lib/config";
import { buildTagPopupHtml } from "../lib/popup";
import { createSidePopup } from "../lib/mapbox";
import chroma from "chroma-js";

const mapContainer = ref(null);
const panelRef = ref(null);
const isMobile = ref(false);
const isPanelCollapsed = ref(false);
const isPlaying = ref(true);
const isScrubbing = ref(false);
const wasPlayingBeforeScrub = ref(false);
const speed = ref(1);
const showNavTips = ref(true);
const speedOptions = [0.5, 1, 2, 4];
const currentDay = ref(1);
const totalDays = ref(100);
const stats = ref({ projects: 0, tags: 0, species: 0 });

let mapInstance;
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

const buildSpeciesColors = (species) => {
  const unique = Array.from(new Set(species.filter(Boolean)));
  const anchors = ["#56f0c4", "#7dd3fc", "#f5b470", "#f97316", "#34d399", "#facc15"];
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
    const color = speciesColorMap.get(species) || "#56f0c4";
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
        color: speciesColorMap.get(tagMetaMap.get(tag.tag_id).species) || "#56f0c4",
      },
      geometry: {
        type: "LineString",
        coordinates: [],
      },
    })),
  };

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
  const color = props.color || "#56f0c4";
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
  const projectTitle = primaryProject ? primaryProject.title : "—";
  const projectLink = primaryProject
    ? `${baseUrl}project/${encodeURIComponent(projectSlug(primaryProject.id))}`
    : "";
  const html = buildTagPopupHtml({
    species: meta.commonName || meta.species || "Unknown species",
    tagId,
    tagLink,
    projectTitle,
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
  hoverLineSource.setData({ type: "FeatureCollection", features: [] });
};

onMounted(async () => {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  const largeScreen = window.matchMedia("(min-width: 1600px)").matches;
  mapInstance = new mapboxgl.Map({
    container: mapContainer.value,
    style: "mapbox://styles/mapbox/dark-v11",
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
    mapInstance.setFog({
      "color": "rgba(10, 16, 30, 0.55)",
      "high-color": "rgba(60, 80, 120, 0.2)",
      "space-color": "rgba(3, 6, 12, 0.8)",
      "horizon-blend": 0.1,
    });
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
    const projectId = tag.project_id;
    const projectTitle = tag.project_title || projectId;
    const projectLinks = projectId ? [{ id: projectId, title: projectTitle }] : [];
    tagMetaMap.set(tag.tag_id, {
      species,
      commonName,
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

  const projectsData = projects;
  const tagsCount = projectsData.reduce(
    (total, project) => total + Number((project.counts || project.numberTags).paths || 0),
    0,
  );
  stats.value = {
    projects: projectsData.length,
    tags: tagsCount,
    species: speciesSet.size,
  };

  if (mapInstance.loaded()) {
    setupDots(paths);
  } else {
    mapInstance.once("load", () => {
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
