<template>
  <section class="min-h-screen w-full bg-[color:var(--ink)] px-6 pb-6 pt-24">
    <div
      class="grid w-full grid-cols-1 gap-6 lg:h-[calc(100vh-7.5rem)] lg:grid-cols-[minmax(360px,520px)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] xl:grid-rows-[minmax(50vh,1fr)_minmax(0,1fr)]"
    >
      <div class="panel h-full relative z-20 overflow-y-auto">
        <div class="grid gap-4">
          <div ref="tagSearchContainer">
            <Combobox v-model="selectedTag" as="div" class="relative">
              <div class="relative">
                <div class="relative">
                  <ComboboxInput
                    class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-10 text-sm text-white placeholder:text-white/40"
                    :displayValue="comboboxDisplayValue"
                    @change="searchQuery = $event.target.value"
                    @input="searchQuery = $event.target.value"
                    @focus="openTagOptions"
                    @click="openTagOptions"
                    @keydown.escape="isSearching = false"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="Search tag, species, project"
                  />
                  <ComboboxButton
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50"
                    ref="tagMenuButton"
                    @click="openTagOptions"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                      <path
                        fill-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </ComboboxButton>
                </div>
              </div>
              <ComboboxOptions
                static
                v-show="isSearching"
                class="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-white/10 bg-[color:var(--slate)] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
              >
                <div v-if="!filteredTags.length" class="px-3 py-2 text-xs text-white/50">
                  No tags found
                </div>
                <ComboboxOption
                  v-for="tag in filteredTags"
                  :key="tag.tag_id"
                  :value="tag.tag_id"
                  v-slot="{ active, selected }"
                >
                  <div
                    :class="[
                      'rounded-lg px-3 py-2 text-left transition',
                      active ? 'bg-white/10' : '',
                      selected ? 'border border-white/20' : 'border border-transparent',
                    ]"
                  >
                    <p class="text-sm font-medium text-white">
                      {{ tag.tag_id }} · {{ tag.common_name || tag.scientific_name || "Unknown" }}
                    </p>
                    <p
                      v-if="tag.project_title"
                      class="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50"
                    >
                      {{ displayProjectTitle(tag.project_title) }}
                    </p>
                  </div>
                </ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          </div>

          <div class="flex items-center justify-between gap-3 sm:hidden">
            <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Details</p>
            <button
              type="button"
              class="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60 transition hover:border-white/30 hover:text-white"
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

          <div v-show="!isPanelCollapsed || !isMobile" class="min-w-0 space-y-4">
            <div v-if="tagDetails" class="space-y-3 text-sm text-white/70 break-words">
              <div>
                <p class="text-white/90 break-words">
                  <span class="font-medium">{{ speciesInfo.commonName || "Unknown species" }}</span>
                  <span v-if="speciesInfo.scientificName" class="ml-2 italic text-white/60">
                    {{ speciesInfo.scientificName }}
                  </span>
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <a
                    v-if="speciesInfo.ebirdLink"
                    :href="speciesInfo.ebirdLink"
                    target="_blank"
                    rel="noreferrer"
                    class="underline decoration-white/30 underline-offset-4 transition hover:text-white"
                  >
                    eBird species
                  </a>
                  <a
                    v-if="speciesInfo.statusTrendsLink"
                    :href="speciesInfo.statusTrendsLink"
                    target="_blank"
                    rel="noreferrer"
                    class="underline decoration-white/30 underline-offset-4 transition hover:text-white"
                  >
                    Status &amp; Trends
                  </a>
                  <span
                    v-if="speciesInfo.status"
                    class="rounded-full border border-white/15 px-2 py-0.5"
                  >
                    Status: {{ speciesInfo.status }}
                  </span>
                  <span
                    v-if="speciesInfo.trend"
                    class="rounded-full border border-white/15 px-2 py-0.5"
                  >
                    Trend: {{ speciesInfo.trend }}
                  </span>
                </div>
              </div>
              <p class="text-sm text-white/70 break-words">
                <span class="text-white/50">Project:</span>
                <RouterLink
                  v-if="tagDetails?.project_id"
                  :to="`/project/${projectSlug(tagDetails.project_id)}`"
                  class="ml-2 text-[color:var(--teal)] hover:text-white break-words"
                >
                  {{ displayProjectTitle(tagDetails.project_title) || "—" }}
                </RouterLink>
                <span v-else class="ml-2">—</span>
              </p>
              <div class="grid gap-x-6 gap-y-1 text-sm text-white/70 sm:grid-cols-2">
                <p><span class="text-white/50">Ring:</span> {{ tagDetails.ring_number || "—" }}</p>
                <p><span class="text-white/50">Sex:</span> {{ sexSymbol || "—" }}</p>
                <p>
                  <span class="text-white/50">Age class:</span> {{ tagDetails.age_class || "—" }}
                </p>
                <p>
                  <span class="text-white/50">Wing length:</span>
                  {{ tagDetails.wing_length ? `${tagDetails.wing_length} mm` : "—" }}
                </p>
                <p class="sm:col-span-2">
                  <span class="text-white/50">Model:</span>
                  {{
                    tagDetails.model
                      ? tagDetails.firmware
                        ? `${tagDetails.model} (${tagDetails.firmware})`
                        : tagDetails.model
                      : "—"
                  }}
                </p>
              </div>
            </div>
            <div v-if="observations.length" class="space-y-2">
              <p class="text-xs uppercase tracking-[0.2em] text-white/60">Observations</p>
              <div
                class="w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-black/30"
              >
                <table class="w-full max-w-full table-auto text-left text-xs text-white/70">
                  <thead
                    class="sticky top-0 bg-[color:var(--slate)] text-[11px] uppercase tracking-[0.2em] text-white/60"
                  >
                    <tr>
                      <th class="px-3 py-2 font-medium">Date</th>
                      <th class="px-3 py-2 font-medium">Type</th>
                      <th class="px-3 py-2 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(obs, index) in observations"
                      :key="`${obs.datetime}-${index}`"
                      class="border-t border-white/5 transition hover:bg-white/5"
                      @mouseenter="setObservationHighlight(index)"
                      @mouseleave="clearObservationHighlight"
                    >
                      <td class="px-3 py-2">{{ obs.dateLabel }}</td>
                      <td class="px-3 py-2">{{ obs.typeLabel }}</td>
                      <td class="px-3 py-2">{{ obs.locationLabel }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref="mapWrapper"
        class="relative h-full min-h-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--slate)] lg:min-h-0"
      >
        <div ref="mapContainer" class="h-full w-full"></div>
        <div
          class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
        ></div>
        <div
          class="absolute bottom-4 left-1/2 z-10 w-[92%] max-w-2xl -translate-x-1/2 rounded-2xl border border-white/10 bg-black/60 px-3 py-2 backdrop-blur"
        >
          <div class="grid gap-2">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:text-white"
                  :disabled="!canPlayPressure"
                  @click="togglePressurePlayback"
                  aria-label="Play or pause"
                >
                  <svg
                    v-if="!isPressurePlaying"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    class="h-4 w-4 fill-current"
                  >
                    <path d="M8 5.5v13l11-6.5-11-6.5Z"></path>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4 fill-current">
                    <path d="M7 5h4v14H7zm6 0h4v14h-4z"></path>
                  </svg>
                </button>
                <select
                  v-model="selectedSpeed"
                  class="h-9 w-20 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/80"
                >
                  <option v-for="speed in SPEED_PRESETS" :key="speed.id" :value="speed.id">
                    {{ speed.label }}
                  </option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <div
                  class="flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-1 text-[10px] uppercase tracking-[0.18em] text-white/60"
                >
                  <button
                    type="button"
                    class="px-3 py-1.5 transition rounded-full"
                    :class="sliderMode === 'time' ? 'bg-white/10 text-white' : ''"
                    @click="sliderMode = 'time'"
                  >
                    Time
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 transition rounded-full"
                    :class="sliderMode === 'distance' ? 'bg-white/10 text-white' : ''"
                    @click="sliderMode = 'distance'"
                  >
                    Distance
                  </button>
                </div>
                <div
                  class="min-w-[88px] text-xs uppercase tracking-[0.2em] text-white/70 tabular-nums text-right"
                >
                  {{ currentPressureLabel }}
                </div>
              </div>
            </div>
            <input
              class="pressure-slider w-full cursor-pointer appearance-none"
              type="range"
              :min="pressureSliderMin"
              :max="pressureSliderMax"
              :step="pressureSliderStep"
              :value="pressureSliderValue"
              @input="onPressureSliderInput"
              :disabled="!activeTimeline.length"
            />
          </div>
        </div>
        <label
          class="absolute left-4 top-4 z-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/70 backdrop-blur cursor-pointer"
        >
          <span>Bird view</span>
          <span
            class="relative inline-flex h-5 w-9 items-center rounded-full border border-white/20 bg-white/10 transition"
          >
            <input v-model="isCameraFollowEnabled" type="checkbox" class="peer sr-only" />
            <span
              class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white/70 transition duration-200 peer-checked:translate-x-4 peer-checked:bg-[color:var(--teal)]"
            ></span>
          </span>
        </label>
      </div>

      <div class="panel h-full min-h-0 lg:col-span-2 flex flex-col p-0 sm:p-6">
        <div
          class="plotly-container flex-1 min-h-[300px] overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2"
        >
          <div ref="plotContainer" class="h-full w-full min-h-0 overflow-hidden"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import mapboxgl from "mapbox-gl";
import Plotly from "plotly.js-dist-min";
import { Threebox, THREE } from "threebox-plugin";
import { loadTagData, loadTags } from "../lib/data";
import {
  colorForIndex,
  formatLongDate,
  projectSlug,
  sexSymbol as formatSexSymbol,
} from "../lib/format";
import { MAPBOX_TOKEN } from "../lib/config";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/vue";

const route = useRoute();
const router = useRouter();
const mapWrapper = ref(null);
const mapContainer = ref(null);
const plotContainer = ref(null);
const tags = ref([]);
const selectedTag = ref("");
const metrics = ref([]);
const selectedMetric = ref("");
const tagData = ref(null);
const searchQuery = ref("");
const isSearching = ref(false);
const isMobile = ref(false);
const isPanelCollapsed = ref(false);
const tagMenuButton = ref(null);
const tagSearchContainer = ref(null);
const timeTimeline = ref([]);
const distanceTimeline = ref([]);
const currentPressureIndex = ref(0);
const isPressurePlaying = ref(false);
const isCameraFollowEnabled = ref(false);
const sliderMode = ref("distance");
const pressureLerp = ref(0);

const updateIsMobile = () => {
  const mobile = window.matchMedia("(max-width: 639px)").matches;
  if (mobile !== isMobile.value) {
    isMobile.value = mobile;
    isPanelCollapsed.value = mobile ? true : false;
  }
};

const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value;
};

let mapInstance;
let threebox;
let pressureLines = [];
const terrainExaggeration = 5;
let pressureData;
let resizeHandler;
let mapReady = false;
let resizeObserver;
let playRafId;
let lastPlayTimestamp = null;
let playAccumulator = 0;
let outsideClickHandler;
let pressureMarkerReady = false;
const PLAYBACK_DAYS_PER_SEC = 5;
const PLAYBACK_KM_PER_SEC = 200;
const BIRDVIEW_SPEED_FACTOR = 0.2;
const SPEED_PRESETS = [
  { id: "0.5x", label: "0.5×", factor: 0.5 },
  { id: "1x", label: "1×", factor: 1 },
  { id: "2x", label: "2×", factor: 2 },
  { id: "4x", label: "4×", factor: 4 },
];
const BIRDVIEW_MIN_ALTITUDE = 85000;
const BIRDVIEW_ALTITUDE_OFFSET = 35000;
const BIRDVIEW_BEHIND_KM = 170;
const CAMERA_BEARING_SMOOTH_MS = 900;
const BIRDVIEW_MODEL_URL = new URL(
  "models/flying_bird.glb",
  `${window.location.origin}${import.meta.env.BASE_URL || "/"}`,
).toString();
const BIRDVIEW_MODEL_SCALE = 50000;
const BIRDVIEW_MODEL_ROTATION = { pitch: 100, yaw: 178, roll: 0 };
const BIRDVIEW_MODEL_PIVOT_FRACTION = { x: 0.5, y: 0.5, z: 0.1 };
const PRESSURE_CURSOR_COLOR = "#ef4444";
const PRESSURE_PATH_COLOR = "#f8fafc";
let savedCameraState = null;
let pressureMarker3d = null;
let pressureMarkerLoading = false;
let pressureMarkerMixer = null;
let pressureMarkerMixerRafId = null;
let pressureMarkerMixerLastMs = null;
let cameraOffsetDistanceMeters = null;
let cameraOffsetAzimuthDeg = null;
let cameraOffsetElevationDeg = null;
let smoothedBirdBearing = null;
let lastBearingUpdateMs = null;
let cameraHandlersBound = false;
let userCameraInteracting = false;
let wasPlayingBeforeDrag = false;
let cameraMovedDuringInteraction = false;
let cameraPointerDownHandler;
let cameraPointerUpHandler;
let cameraPointerUpWindowHandler;
let cameraMoveHandler;
let cameraZoomStartHandler;
let cameraZoomEndHandler;
const selectedSpeed = ref("1x");
let plotHandlersBound = false;
let suppressPlotRelayout = false;
let locationPopup;
let locationHandlersBound = false;
let stapPopup;
let stapHandlersBound = false;
let stapColorMap = new Map();
let stapList = [];
let highlightedObservationIndex = null;

const formatMetricLabel = (metric) => {
  const key = String(metric || "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
  const label = key.replace(/\b\w/g, (char) => char.toUpperCase());
  const unit = metric === "altitude" ? "m" : metric === "surface_pressure" ? "hPa" : "";
  return unit ? `${label} (${unit})` : label;
};

const median = (values) => {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const findClosestIndex = (list, target, key) => {
  if (!list.length || !Number.isFinite(target)) {
    return 0;
  }
  let low = 0;
  let high = list.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (list[mid][key] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  if (low > 0) {
    const prev = list[low - 1][key];
    const curr = list[low][key];
    return Math.abs(target - prev) <= Math.abs(curr - target) ? low - 1 : low;
  }
  return low;
};

const lerp = (from, to, t) => from + (to - from) * t;

const normalizeAngle = (value) => ((value + 540) % 360) - 180;

const smoothAngle = (current, target, alpha) => {
  if (current == null) {
    return target;
  }
  const delta = normalizeAngle(target - current);
  return normalizeAngle(current + delta * alpha);
};

const smoothingAlpha = (deltaMs, timeConstantMs) => {
  if (!Number.isFinite(timeConstantMs) || timeConstantMs <= 0) {
    return 1;
  }
  const dt = Math.max(0, Number(deltaMs) || 0);
  return 1 - Math.exp(-dt / timeConstantMs);
};

const stopPressureMarkerAnimation = () => {
  if (pressureMarkerMixerRafId) {
    cancelAnimationFrame(pressureMarkerMixerRafId);
    pressureMarkerMixerRafId = null;
  }
  pressureMarkerMixer = null;
  pressureMarkerMixerLastMs = null;
};

const startPressureMarkerAnimation = () => {
  if (!pressureMarker3d) {
    return;
  }
  const model = pressureMarker3d.model || pressureMarker3d;
  const clips = model.animations || pressureMarker3d.animations;
  if (!clips || !clips.length) {
    return;
  }
  stopPressureMarkerAnimation();
  pressureMarkerMixer = new THREE.AnimationMixer(model);
  const action = pressureMarkerMixer.clipAction(clips[0]);
  action.play();
  pressureMarkerMixerLastMs = performance.now();
  const tick = () => {
    if (!pressureMarkerMixer) {
      return;
    }
    const now = performance.now();
    const delta = pressureMarkerMixerLastMs == null ? 0 : (now - pressureMarkerMixerLastMs) / 1000;
    pressureMarkerMixerLastMs = now;
    if (delta > 0) {
      pressureMarkerMixer.update(delta);
      if (mapInstance) {
        mapInstance.triggerRepaint();
      }
    }
    pressureMarkerMixerRafId = requestAnimationFrame(tick);
  };
  pressureMarkerMixerRafId = requestAnimationFrame(tick);
};

const bearingDegrees = (from, to) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const toDeg = (value) => (value * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const destinationPoint = (from, bearing, distanceKm) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const toDeg = (value) => (value * 180) / Math.PI;
  const radius = 6371;
  const angular = distanceKm / radius;
  const bearingRad = toRad(bearing);
  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lon);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearingRad),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return {
    lat: toDeg(lat2),
    lon: ((toDeg(lon2) + 540) % 360) - 180,
  };
};

const getPressureBearing = () => {
  const list = activeTimeline.value;
  const index = currentPressureIndex.value;
  if (!list.length) {
    return 0;
  }
  const current = list[index];
  if (!current) {
    return 0;
  }
  const next = list[index + 1];
  if (next) {
    return bearingDegrees(current, next);
  }
  const prev = list[index - 1];
  return prev ? bearingDegrees(prev, current) : 0;
};

const tagMeta = computed(() => tags.value.find((tag) => tag.tag_id === selectedTag.value));
const tagDetails = computed(() => ({
  ...(tagMeta.value || {}),
  ...(tagData.value || {}),
}));

const sexSymbol = computed(() => formatSexSymbol(tagDetails.value?.sex));
const speciesInfo = computed(() => {
  const commonName = tagDetails.value?.common_name || "";
  const scientificName = tagDetails.value?.scientific_name || "";
  const speciesCode = tagDetails.value?.species_code || "";
  const inStatusTrends = tagDetails.value?.in_ebirdst ?? null;
  const status = tagDetails.value?.ebird_status || "";
  const trend = tagDetails.value?.ebird_trend || "";
  const week = 21;
  return {
    commonName,
    scientificName,
    ebirdLink: speciesCode ? `https://ebird.org/species/${speciesCode}` : "",
    statusTrendsLink: speciesCode
      ? `https://science.ebird.org/en/status-and-trends/species/${speciesCode}/abundance-map-weekly?week=${week}`
      : "",
    inStatusTrends: typeof inStatusTrends === "boolean" ? inStatusTrends : null,
    status,
    trend,
  };
});
const activeTimeline = computed(() =>
  sliderMode.value === "distance" ? distanceTimeline.value : timeTimeline.value,
);

const currentPressurePoint = computed(() => {
  const list = activeTimeline.value;
  if (!list.length) {
    return null;
  }
  const index = Math.min(Math.max(currentPressureIndex.value, 0), list.length - 1);
  return list[index] || null;
});

const getInterpolatedPressurePoint = () => {
  const list = activeTimeline.value;
  if (!list.length) {
    return null;
  }
  const index = Math.min(Math.max(currentPressureIndex.value, 0), list.length - 1);
  const current = list[index] || null;
  if (!current || sliderMode.value !== "distance") {
    return current;
  }
  const t = Math.min(Math.max(pressureLerp.value, 0), 1);
  if (t <= 0) {
    return current;
  }
  const next = list[(index + 1) % list.length];
  if (!next) {
    return current;
  }
  return {
    ...current,
    lon: lerp(current.lon, next.lon, t),
    lat: lerp(current.lat, next.lat, t),
    altitude: lerp(current.altitude, next.altitude, t),
    distanceKm: lerp(current.distanceKm, next.distanceKm, t),
    ms:
      Number.isFinite(current.ms) && Number.isFinite(next.ms)
        ? lerp(current.ms, next.ms, t)
        : current.ms,
  };
};

const currentPressureLabel = computed(() => {
  if (!currentPressurePoint.value) {
    return "—";
  }
  if (sliderMode.value === "distance") {
    return `${currentPressurePoint.value.distanceKm.toFixed(0)} km`;
  }
  return formatLongDate(currentPressurePoint.value.datetime);
});

const maxPressureIndex = computed(() =>
  activeTimeline.value.length ? activeTimeline.value.length - 1 : 0,
);
const canPlayPressure = computed(() => activeTimeline.value.length > 1);
const pressureSliderMin = computed(() => 0);
const pressureSliderMax = computed(() => maxPressureIndex.value);
const pressureSliderStep = computed(() => 1);
const pressureSliderValue = computed(() => currentPressureIndex.value);

const stopPressurePlayback = () => {
  isPressurePlaying.value = false;
  if (playRafId) {
    cancelAnimationFrame(playRafId);
    playRafId = null;
  }
  lastPlayTimestamp = null;
  playAccumulator = 0;
  pressureLerp.value = 0;
};

const startPressurePlayback = () => {
  if (!canPlayPressure.value) {
    return;
  }
  if (playRafId) {
    return;
  }
  isPressurePlaying.value = true;
  const tick = (timestamp) => {
    if (!isPressurePlaying.value) {
      return;
    }
    if (lastPlayTimestamp == null) {
      lastPlayTimestamp = timestamp;
    }
    const delta = timestamp - lastPlayTimestamp;
    lastPlayTimestamp = timestamp;
    const list = activeTimeline.value;
    if (!list.length) {
      stopPressurePlayback();
      return;
    }
    const rowsPerSecond = (() => {
      if (sliderMode.value === "distance") {
        const deltas = [];
        for (let i = 1; i < list.length; i += 1) {
          const delta = Number(list[i].distanceKm) - Number(list[i - 1].distanceKm);
          if (Number.isFinite(delta) && delta > 0) {
            deltas.push(delta);
          }
        }
        const medianKmPerRow = median(deltas);
        return medianKmPerRow ? PLAYBACK_KM_PER_SEC / medianKmPerRow : 1;
      }
      const deltas = [];
      for (let i = 1; i < list.length; i += 1) {
        const dtMs = Number(list[i].ms) - Number(list[i - 1].ms);
        if (Number.isFinite(dtMs) && dtMs > 0) {
          deltas.push(dtMs / (1000 * 60 * 60 * 24));
        }
      }
      const medianDays = median(deltas);
      return medianDays ? PLAYBACK_DAYS_PER_SEC / medianDays : 1;
    })();
    const speedPreset =
      SPEED_PRESETS.find((preset) => preset.id === selectedSpeed.value)?.factor ?? 1;
    const birdFactor = isCameraFollowEnabled.value ? BIRDVIEW_SPEED_FACTOR : 1;
    playAccumulator += (delta / 1000) * rowsPerSecond * speedPreset * birdFactor;
    const step = Math.floor(playAccumulator);
    if (step > 0) {
      playAccumulator -= step;
      currentPressureIndex.value = (currentPressureIndex.value + step) % list.length;
    }
    pressureLerp.value =
      sliderMode.value === "distance" ? Math.min(Math.max(playAccumulator, 0), 1) : 0;
    updatePressureMarker();
    updatePlotCursor();
    updateCameraForPressurePoint();
    playRafId = requestAnimationFrame(tick);
  };
  playRafId = requestAnimationFrame(tick);
};

const togglePressurePlayback = () => {
  if (isPressurePlaying.value) {
    stopPressurePlayback();
  } else {
    startPressurePlayback();
  }
};

const onPressureSliderInput = (event) => {
  stopPressurePlayback();
  const value = Number(event?.target?.value);
  if (!activeTimeline.value.length || !Number.isFinite(value)) {
    return;
  }
  currentPressureIndex.value = Math.min(Math.max(Math.round(value), 0), maxPressureIndex.value);
  pressureLerp.value = 0;
  updatePressureMarker();
  updatePlotCursor();
  updateCameraForPressurePoint();
};

watch(isCameraFollowEnabled, (enabled) => {
  if (!mapInstance || !mapReady) {
    return;
  }
  if (!enabled) {
    cameraOffsetDistanceMeters = null;
    cameraOffsetAzimuthDeg = null;
    cameraOffsetElevationDeg = null;
    smoothedBirdBearing = null;
    lastBearingUpdateMs = null;
    stopPressureMarkerAnimation();
  }
  applyBirdViewState(enabled);
  if (typeof mapInstance.getFreeCameraOptions !== "function") {
    return;
  }
  if (enabled) {
    mapInstance.easeTo({ pitch: 55, bearing: -20, duration: 600 });
    savedCameraState = {
      center: mapInstance.getCenter(),
      zoom: mapInstance.getZoom(),
      pitch: mapInstance.getPitch(),
      bearing: mapInstance.getBearing(),
    };
    updateCameraForPressurePoint();
  } else if (savedCameraState) {
    mapInstance.easeTo({
      center: savedCameraState.center,
      zoom: savedCameraState.zoom,
      pitch: savedCameraState.pitch,
      bearing: savedCameraState.bearing,
      duration: 800,
    });
    savedCameraState = null;
  }
  updatePressureMarker();
});
const observations = computed(() => {
  const list = Array.isArray(tagData.value?.observations) ? tagData.value.observations : [];
  return list
    .map((obs, index) => {
      const lat = Number(obs?.latitude);
      const lon = Number(obs?.longitude);
      return {
        index,
        datetime: obs?.datetime || "",
        dateLabel: formatLongDate(obs?.datetime),
        typeLabel: obs?.observation_type || "—",
        locationLabel: obs?.location_name || "—",
      };
    })
    .sort((a, b) => (a.datetime || "").localeCompare(b.datetime || ""));
});

const tagDisplayValue = (value) => {
  if (!value) {
    return "";
  }
  const tag = tags.value.find((item) => item.tag_id === value);
  if (!tag) {
    return value;
  }
  const label = tag.common_name || tag.scientific_name || "Unknown";
  return `${tag.tag_id} · ${label}`;
};

const displayProjectTitle = (title) =>
  String(title || "")
    .replace(/^GeoLocator Data package:\s*/i, "")
    .trim();

const comboboxDisplayValue = () =>
  isSearching.value ? searchQuery.value : tagDisplayValue(selectedTag.value);

const tagSearchText = (tag) => {
  const fields = [
    tag.tag_id,
    tag.common_name,
    tag.scientific_name,
    tag.project_title,
    tag.project_id,
    tag.species_code,
  ];
  return fields.filter(Boolean).join(" ").toLowerCase();
};

const openTagOptions = () => {
  isSearching.value = true;
  searchQuery.value = "";
  if (tagMenuButton.value && typeof tagMenuButton.value.click === "function") {
    tagMenuButton.value.click();
  }
};

const filteredTags = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return tags.value;
  }
  return tags.value.filter((tag) => tagSearchText(tag).includes(query));
});

const buildMetrics = (values) => {
  const allow = new Set(["altitude", "surface_pressure"]);
  if (!values || typeof values !== "object") {
    return [];
  }
  return Object.keys(values).filter((name) => {
    if (!allow.has(name)) {
      return false;
    }
    const series = values[name];
    if (!Array.isArray(series) || !series.length) {
      return false;
    }
    return series.some((value) => Number.isFinite(Number(value)));
  });
};

const normalizePressureData = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  let vectors = {};
  if (Array.isArray(raw.columns) && (Array.isArray(raw.points) || Array.isArray(raw.rows))) {
    const rows = Array.isArray(raw.points) ? raw.points : raw.rows;
    raw.columns.forEach((name, idx) => {
      vectors[name] = rows.map((row) => row?.[idx]);
    });
  } else {
    Object.keys(raw).forEach((key) => {
      if (Array.isArray(raw[key])) {
        vectors[key] = raw[key];
      }
    });
  }

  const datetimeKey = vectors.datetime ? "datetime" : vectors.t ? "t" : null;
  if (!datetimeKey || !vectors.lon || !vectors.lat) {
    return null;
  }

  const requiredKeys = [datetimeKey, "lon", "lat", "altitude", "surface_pressure", "type"].filter(
    Boolean,
  );
  const lengths = requiredKeys
    .map((key) => (Array.isArray(vectors[key]) ? vectors[key].length : null))
    .filter((value) => Number.isFinite(value));
  const minLength = lengths.length ? Math.min(...lengths) : 0;
  if (!minLength) {
    return null;
  }

  const keepMostLikely = Array.isArray(vectors.type)
    ? vectors.type.slice(0, minLength).includes("most_likely")
    : false;
  const indices = [];
  for (let i = 0; i < minLength; i += 1) {
    if (!keepMostLikely || vectors.type[i] === "most_likely") {
      indices.push(i);
    }
  }

  const pick = (key) => (vectors[key] ? indices.map((idx) => vectors[key][idx]) : []);

  const datetime = pick(datetimeKey);
  const lon = pick("lon");
  const lat = pick("lat");
  const altitude = pick("altitude");
  const surfacePressure = pick("surface_pressure");
  const stapId = pick("stap_id");

  const length = Math.min(datetime.length, lon.length, lat.length);
  const trimmed = (arr) => (Array.isArray(arr) ? arr.slice(0, length) : []);

  const values = {};
  if (altitude.length) {
    values.altitude = trimmed(altitude);
  }
  if (surfacePressure.length) {
    values.surface_pressure = trimmed(surfacePressure);
  }

  return {
    length,
    datetimeKey,
    datetime: trimmed(datetime),
    lon: trimmed(lon),
    lat: trimmed(lat),
    altitude: trimmed(altitude),
    values,
    stap_id: trimmed(stapId),
  };
};

const normalizeTable = (raw) => {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw !== "object") {
    return [];
  }
  const columns = Object.keys(raw).filter((key) => Array.isArray(raw[key]));
  if (!columns.length) {
    return [];
  }
  const length = Math.max(...columns.map((key) => raw[key].length));
  return Array.from({ length }, (_, index) => {
    const row = {};
    columns.forEach((key) => {
      row[key] = raw[key][index];
    });
    return row;
  });
};

const haversineKm = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
};

const buildTimeTimeline = (data) => {
  if (
    !data ||
    !Array.isArray(data.datetime) ||
    !Array.isArray(data.lon) ||
    !Array.isArray(data.lat)
  ) {
    return [];
  }
  const length = Math.min(data.datetime.length, data.lon.length, data.lat.length);
  const timeline = [];
  for (let i = 0; i < length; i += 1) {
    const lon = Number(data.lon[i]);
    const lat = Number(data.lat[i]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      continue;
    }
    const datetime = data.datetime[i];
    const ms = Date.parse(datetime);
    if (!datetime || Number.isNaN(ms)) {
      continue;
    }
    const rawAlt = data.altitude?.[i];
    const rawSurface = data.values?.surface_pressure?.[i];
    const stapId = data.stap_id?.[i];
    const altitude = Number.isFinite(Number(rawAlt)) ? Math.max(0, Number(rawAlt)) : 0;
    const surfacePressure = Number.isFinite(Number(rawSurface)) ? Number(rawSurface) : null;
    timeline.push({
      index: i,
      datetime,
      ms,
      lon,
      lat,
      stapId,
      altitude,
      metrics: {
        altitude: Number.isFinite(altitude) ? altitude : null,
        surface_pressure: surfacePressure,
      },
    });
  }
  return timeline;
};

const buildDistanceTimeline = (timeline) => {
  if (!timeline.length) return [];

  const out = [];
  let prevOut = null;
  let distanceKm = 0;

  let lat = null;
  let lon = null;
  let count = 0;
  let altSum = 0;
  let surfSum = 0;
  let lastEntry = null;

  const flush = () => {
    if (!count) return;

    if (prevOut) {
      distanceKm += haversineKm(prevOut, lastEntry);
    }

    const avgAlt = altSum / count;
    const avgSurf = surfSum / count;

    const next = {
      ...lastEntry,
      altitude: Number.isFinite(avgAlt) ? avgAlt : lastEntry.altitude,
      distanceKm: Math.round(distanceKm),
      metrics: {
        altitude: Number.isFinite(avgAlt) ? avgAlt : null,
        surface_pressure: Number.isFinite(avgSurf) ? avgSurf : null,
      },
    };

    out.push(next);
    prevOut = next;
    count = altSum = surfSum = 0;
  };

  for (const e of timeline) {
    const sameLocation = lat !== null && Number(e.lat) === lat && Number(e.lon) === lon;

    if (!sameLocation) {
      flush();
      lat = Number(e.lat);
      lon = Number(e.lon);
    }

    const alt = Number(e.metrics?.altitude);
    const surf = Number(e.metrics?.surface_pressure);

    if (Number.isFinite(alt)) altSum += alt;
    if (Number.isFinite(surf)) surfSum += surf;

    count += 1;
    lastEntry = e;
  }

  flush();
  return out;
};

const ensurePressureCircleLayer = () => {
  if (!mapInstance) {
    return;
  }
  const emptyCollection = { type: "FeatureCollection", features: [] };
  if (!mapInstance.getSource("tag-pressure-position")) {
    mapInstance.addSource("tag-pressure-position", {
      type: "geojson",
      data: emptyCollection,
    });
  }
  if (!mapInstance.hasImage("pressure-pulse-dot")) {
    const size = 160;
    const baseRadius = size * 0.2;
    const pulseExtent = size * 0.55;
    const pulseAlpha = 0.55;
    const pulse = {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
      onAdd() {
        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        this.context = canvas.getContext("2d", { willReadFrequently: true });
      },
      render() {
        const context = this.context;
        if (!context) {
          return false;
        }
        const duration = 1200;
        const t = (performance.now() % duration) / duration;
        const radius = baseRadius;
        const outerRadius = baseRadius + pulseExtent * t;

        context.clearRect(0, 0, this.width, this.height);
        context.beginPath();
        context.arc(size / 2, size / 2, outerRadius, 0, Math.PI * 2);
        context.fillStyle = `rgba(239, 68, 68, ${pulseAlpha * (1 - t)})`;
        context.fill();

        context.beginPath();
        context.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
        context.fillStyle = PRESSURE_CURSOR_COLOR;
        context.strokeStyle = "rgba(0,0,0,0.65)";
        context.lineWidth = 6;
        context.fill();
        context.stroke();

        const imageData = context.getImageData(0, 0, this.width, this.height);
        this.data.set(imageData.data);
        mapInstance.triggerRepaint();
        return true;
      },
    };
    mapInstance.addImage("pressure-pulse-dot", pulse, { pixelRatio: 2 });
  }
  if (!mapInstance.getLayer("tag-pressure-position-circle")) {
    mapInstance.addLayer({
      id: "tag-pressure-position-circle",
      type: "symbol",
      source: "tag-pressure-position",
      layout: {
        "icon-image": "pressure-pulse-dot",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.55, 6, 0.75, 10, 1, 14, 1.3],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  }
};

const updatePressureCircle = (point) => {
  if (!mapInstance || !mapReady) {
    return;
  }
  ensurePressureCircleLayer();
  const source = mapInstance.getSource("tag-pressure-position");
  if (!source) {
    return;
  }
  if (!point) {
    source.setData({ type: "FeatureCollection", features: [] });
    return;
  }
  source.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [point.lon, point.lat] },
        properties: {},
      },
    ],
  });
};

const setPressureCircleVisibility = (visible) => {
  if (!mapInstance || !mapInstance.getLayer("tag-pressure-position-circle")) {
    return;
  }
  mapInstance.setLayoutProperty(
    "tag-pressure-position-circle",
    "visibility",
    visible ? "visible" : "none",
  );
};

const setThreeboxVisibility = (visible) => {
  if (pressureMarker3d) {
    pressureMarker3d.visible = visible;
  }
  if (pressureLines.length) {
    pressureLines.forEach((line) => {
      line.visible = visible;
    });
  }
};

const ensureThreeboxInitialized = () => {
  if (!mapInstance || !mapReady) {
    return null;
  }
  if (threebox) {
    return threebox;
  }
  threebox = new Threebox(mapInstance, mapInstance.getCanvas().getContext("webgl"), {
    defaultLights: true,
  });
  globalThis.tb = threebox;
  mapInstance.addLayer({
    id: "pressurepaths-layer",
    type: "custom",
    renderingMode: "3d",
    render: () => {
      threebox.update();
    },
  });
  return threebox;
};

const ensureThreeboxPressureLine = () => {
  const timeline = timeTimeline.value;
  if (!timeline.length) {
    return;
  }
  if (!ensureThreeboxInitialized()) {
    return;
  }
  if (pressureLines.length) {
    return;
  }
  const lineCoords = timeline.map((entry) => {
    const altitude = Math.max(0, Number(entry.altitude) || 0);
    const scaledAlt = altitude;
    return [entry.lon, entry.lat, scaledAlt];
  });
  if (!lineCoords.length) {
    return;
  }
  const line = threebox.line({
    geometry: lineCoords,
    color: PRESSURE_PATH_COLOR,
    width: 4,
    opacity: 0.9,
  });
  pressureLines.push(line);
  threebox.add(line);
};

const applyBirdViewState = (enabled) => {
  if (!mapInstance || !mapReady) {
    return;
  }
  if (enabled) {
    mapInstance.setTerrain({ source: "mapbox-dem", exaggeration: terrainExaggeration });
    ensureThreeboxPressureLine();
  } else {
    mapInstance.setTerrain(null);
  }
  setPressureCircleVisibility(!enabled);
  setThreeboxVisibility(enabled);
};

const captureCameraOffset = () => {
  if (!mapInstance || !mapReady || !isCameraFollowEnabled.value) {
    return;
  }
  const point = getInterpolatedPressurePoint();
  if (!point || !Number.isFinite(point.lon) || !Number.isFinite(point.lat)) {
    return;
  }
  const camera = mapInstance.getFreeCameraOptions();
  if (!camera?.position) {
    return;
  }
  const cameraLngLat = camera.position.toLngLat();
  const distanceKm = haversineKm(point, { lon: cameraLngLat.lng, lat: cameraLngLat.lat });
  const bearing = getPressureBearing();
  const baseAlt = Math.max(BIRDVIEW_MIN_ALTITUDE, point.altitude + BIRDVIEW_ALTITUDE_OFFSET);
  const meterScale = mapboxgl.MercatorCoordinate.fromLngLat(
    [cameraLngLat.lng, cameraLngLat.lat],
    0,
  ).meterInMercatorCoordinateUnits();
  const cameraAltMeters = meterScale ? camera.position.z / meterScale : baseAlt;
  const horizontalMeters = Math.max(0, distanceKm) * 1000;
  const verticalMeters = cameraAltMeters - point.altitude;
  const distanceMeters = Math.sqrt(
    horizontalMeters * horizontalMeters + verticalMeters * verticalMeters,
  );
  const elevationDeg = distanceMeters
    ? (Math.atan2(verticalMeters, horizontalMeters) * 180) / Math.PI
    : 0;
  const absAzimuth = bearingDegrees(point, { lon: cameraLngLat.lng, lat: cameraLngLat.lat });
  cameraOffsetDistanceMeters = Number.isFinite(distanceMeters) ? distanceMeters : null;
  cameraOffsetAzimuthDeg = Number.isFinite(absAzimuth)
    ? normalizeAngle(absAzimuth - bearing)
    : null;
  cameraOffsetElevationDeg = Number.isFinite(elevationDeg) ? elevationDeg : null;
  smoothedBirdBearing = bearing;
  lastBearingUpdateMs = performance.now();
};

const applyMarkerRotation = (heading) => {
  if (!pressureMarker3d) {
    return;
  }
  if (pressureMarker3d.model) {
    pressureMarker3d.model.rotation.set(
      THREE.MathUtils.degToRad(BIRDVIEW_MODEL_ROTATION.pitch),
      THREE.MathUtils.degToRad(BIRDVIEW_MODEL_ROTATION.yaw - heading),
      THREE.MathUtils.degToRad(BIRDVIEW_MODEL_ROTATION.roll),
    );
  }
};

const recenterModelPivot = (obj) => {
  if (!obj) {
    return;
  }
  const model = obj.model || obj;
  if (!model || typeof model.traverse !== "function") {
    return;
  }
  const box = new THREE.Box3().setFromObject(model);
  if (!box.isEmpty()) {
    const size = new THREE.Vector3();
    const offset = new THREE.Vector3();
    box.getSize(size);
    offset.set(
      box.min.x + size.x * BIRDVIEW_MODEL_PIVOT_FRACTION.x,
      box.min.y + size.y * BIRDVIEW_MODEL_PIVOT_FRACTION.y,
      box.min.z + size.z * BIRDVIEW_MODEL_PIVOT_FRACTION.z,
    );
    model.position.sub(offset);
  }
};

const updatePressureMarker = () => {
  if (!mapInstance || !mapReady || !pressureMarkerReady) {
    return;
  }
  const point = getInterpolatedPressurePoint();
  updatePressureCircle(point);
  setPressureCircleVisibility(!isCameraFollowEnabled.value);

  if (!isCameraFollowEnabled.value) {
    setThreeboxVisibility(false);
    return;
  }

  if (!threebox) {
    return;
  }
  if (!point) {
    if (pressureMarker3d) {
      threebox.remove(pressureMarker3d);
      pressureMarker3d = null;
    }
    stopPressureMarkerAnimation();
    return;
  }
  if (!pressureMarker3d) {
    if (!pressureMarkerLoading) {
      pressureMarkerLoading = true;
      threebox.loadObj(
        {
          type: "gltf",
          obj: BIRDVIEW_MODEL_URL,
          units: "meters",
          scale: BIRDVIEW_MODEL_SCALE,
          rotation: {
            x: BIRDVIEW_MODEL_ROTATION.pitch,
            y: BIRDVIEW_MODEL_ROTATION.yaw,
            z: BIRDVIEW_MODEL_ROTATION.roll,
          },
          anchor: "center",
        },
        (model) => {
          pressureMarker3d = model;
          pressureMarkerLoading = false;
          threebox.add(pressureMarker3d);
          recenterModelPivot(pressureMarker3d);
          startPressureMarkerAnimation();
          const altitude = Math.max(0, point.altitude) * terrainExaggeration;
          pressureMarker3d.setCoords([point.lon, point.lat, altitude]);
          applyMarkerRotation(getPressureBearing());
        },
      );
    }
  }
  if (pressureMarker3d) {
    setThreeboxVisibility(true);
    if (!pressureMarkerMixer) {
      startPressureMarkerAnimation();
    }
    const altitude = Math.max(0, point.altitude) * terrainExaggeration;
    pressureMarker3d.setCoords([point.lon, point.lat, altitude]);
    applyMarkerRotation(getPressureBearing());
  }
};

const updateCameraForPressurePoint = () => {
  if (!mapInstance || !mapReady || !isCameraFollowEnabled.value) {
    return;
  }
  if (userCameraInteracting) {
    return;
  }
  if (typeof mapInstance.getFreeCameraOptions !== "function") {
    return;
  }
  const point = getInterpolatedPressurePoint();
  if (!point) {
    return;
  }
  if (!Number.isFinite(point.lon) || !Number.isFinite(point.lat)) {
    return;
  }
  const bearing = getPressureBearing();

  if (
    cameraOffsetDistanceMeters == null ||
    cameraOffsetAzimuthDeg == null ||
    cameraOffsetElevationDeg == null
  ) {
    const targetAlt = Math.max(BIRDVIEW_MIN_ALTITUDE, point.altitude + BIRDVIEW_ALTITUDE_OFFSET);
    const verticalMeters = targetAlt - point.altitude;
    const horizontalMeters = BIRDVIEW_BEHIND_KM * 1000;
    const distanceMeters = Math.sqrt(
      horizontalMeters * horizontalMeters + verticalMeters * verticalMeters,
    );
    const elevationDeg = (Math.atan2(verticalMeters, horizontalMeters) * 180) / Math.PI;
    cameraOffsetDistanceMeters = distanceMeters;
    cameraOffsetAzimuthDeg = 180;
    cameraOffsetElevationDeg = elevationDeg;
  }
  const now = performance.now();
  const dt = lastBearingUpdateMs == null ? 0 : now - lastBearingUpdateMs;
  lastBearingUpdateMs = now;
  const alphaBearing = smoothingAlpha(dt, CAMERA_BEARING_SMOOTH_MS);
  smoothedBirdBearing = smoothAngle(smoothedBirdBearing, bearing, alphaBearing);

  const effectiveDistance = cameraOffsetDistanceMeters;
  const effectiveElevationDeg = cameraOffsetElevationDeg;
  const effectiveAzimuthDeg = cameraOffsetAzimuthDeg;
  const effectiveBearing = smoothedBirdBearing ?? bearing;
  const absoluteAzimuth = normalizeAngle(effectiveBearing + effectiveAzimuthDeg);

  const elevationRad = (effectiveElevationDeg * Math.PI) / 180;
  const horizontalMeters = Math.max(0, effectiveDistance * Math.cos(elevationRad));
  const verticalMeters = effectiveDistance * Math.sin(elevationRad);

  const cameraTarget = destinationPoint(point, absoluteAzimuth, horizontalMeters / 1000);
  const rawLookAtAlt = Math.max(0, point.altitude || 0);

  const cameraAlt = Math.max(0, point.altitude + verticalMeters);
  const cameraPos = mapboxgl.MercatorCoordinate.fromLngLat(
    [cameraTarget.lon, cameraTarget.lat],
    cameraAlt,
  );
  const camera = mapInstance.getFreeCameraOptions();
  camera.position = cameraPos;
  camera.lookAtPoint([point.lon, point.lat, rawLookAtAlt]);
  mapInstance.setFreeCameraOptions(camera);
};

const updatePlotCursor = () => {
  if (!plotContainer.value) {
    return;
  }
  if (!currentPressurePoint.value) {
    Plotly.relayout(plotContainer.value, { shapes: [] });
    return;
  }
  Plotly.relayout(plotContainer.value, {
    shapes: [
      {
        type: "line",
        xref: "x",
        yref: "paper",
        x0:
          sliderMode.value === "distance"
            ? currentPressurePoint.value.distanceKm
            : currentPressurePoint.value.datetime,
        x1:
          sliderMode.value === "distance"
            ? currentPressurePoint.value.distanceKm
            : currentPressurePoint.value.datetime,
        y0: 0,
        y1: 1,
        line: { color: PRESSURE_CURSOR_COLOR, width: 3 },
      },
    ],
  });
};

const updatePlot = () => {
  if (!plotContainer.value || !pressureData) {
    return;
  }
  const values = {};
  const availableMetrics = metrics.value;
  if (!availableMetrics.length) {
    Plotly.react(
      plotContainer.value,
      [],
      { autosize: true },
      { displayModeBar: false, responsive: true },
    );
    return;
  }
  if (!availableMetrics.includes(selectedMetric.value)) {
    selectedMetric.value = availableMetrics[0];
  }

  const maxPoints = isMobile.value ? 6000 : 50000;
  const step = Math.max(1, Math.ceil(activeTimeline.value.length / maxPoints));
  const timeline = activeTimeline.value;
  if (!timeline.length) {
    return;
  }
  const xMin = sliderMode.value === "distance" ? timeline[0].distanceKm : timeline[0].datetime;
  const xMax =
    sliderMode.value === "distance"
      ? timeline[timeline.length - 1].distanceKm
      : timeline[timeline.length - 1].datetime;
  const hasRange =
    sliderMode.value === "distance"
      ? Number.isFinite(Number(xMin)) && Number.isFinite(Number(xMax)) && xMin !== xMax
      : Boolean(xMin) && Boolean(xMax) && xMin !== xMax;
  const containerHeight = plotContainer.value.clientHeight || 0;
  const traces = [];
  const traceGroups = new Map();

  const showStapLines = sliderMode.value !== "distance";
  availableMetrics.forEach((metric) => {
    const baseX = [];
    const baseY = [];
    const perStap = new Map();
    for (let i = 0; i < timeline.length; i += step) {
      const entry = timeline[i];
      const v = entry.metrics?.[metric];
      if (v == null) {
        continue;
      }
      const numeric = Number(v);
      if (!Number.isFinite(numeric)) {
        continue;
      }
      const xVal = sliderMode.value === "distance" ? entry.distanceKm : entry.datetime;
      baseX.push(xVal);
      baseY.push(numeric);

      if (showStapLines) {
        const stapNumeric = Number(entry.stapId);
        if (!Number.isFinite(stapNumeric) || !Number.isInteger(stapNumeric)) {
          continue;
        }
        const stapKey = String(entry.stapId);
        const color = stapColorMap.get(stapKey);
        if (!color) {
          continue;
        }
        const series = perStap.get(stapKey) || { x: [], y: [] };
        series.x.push(xVal);
        series.y.push(numeric);
        perStap.set(stapKey, series);
      }
    }

    const start = traces.length;
    traces.push({
      x: baseX,
      y: baseY,
      type: "scatter",
      mode: "lines",
      visible: metric === selectedMetric.value,
      line: { color: "rgba(245, 242, 232, 0.35)", width: 1 },
      name: `${formatMetricLabel(metric)} (all)`,
    });

    if (showStapLines) {
      Array.from(perStap.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .forEach(([stapId, series]) => {
          traces.push({
            x: series.x,
            y: series.y,
            type: "scatter",
            mode: "lines",
            visible: metric === selectedMetric.value,
            line: { color: stapColorMap.get(stapId), width: 2 },
            name: `Stap ${stapId}`,
          });
        });
    }

    if (sliderMode.value === "distance") {
      const markerX = [];
      const markerY = [];
      const markerColor = [];
      const markerSize = [];
      const targetList = activeTimeline.value;
      stapList.forEach((stap) => {
        const idx = findClosestIndex(targetList, stap.startTime, "ms");
        const entry = targetList[idx];
        const v = entry?.metrics?.[metric];
        const numeric = Number(v);
        if (!Number.isFinite(numeric)) {
          return;
        }
        const xVal = entry.distanceKm;
        markerX.push(xVal);
        markerY.push(numeric);
        markerColor.push(stapColorMap.get(stap.stapId) || "#f8fafc");
        const size = Math.min(14, 4 + Math.sqrt(Math.max(stap.duration, 0)) * 1.2);
        markerSize.push(size);
      });
      if (markerX.length) {
        traces.push({
          x: markerX,
          y: markerY,
          type: "scatter",
          mode: "markers",
          visible: metric === selectedMetric.value,
          marker: {
            color: markerColor,
            size: markerSize,
            line: { color: "rgba(0,0,0,0.4)", width: 1 },
            opacity: 0.9,
          },
          name: `${formatMetricLabel(metric)} staps`,
        });
      }
    }

    traceGroups.set(metric, { start, end: traces.length });
  });

  const bottomMargin = sliderMode.value === "distance" ? 22 : 28;
  const layout = {
    height: containerHeight || undefined,
    autosize: true,
    margin: { l: 32, r: 16, t: 8, b: bottomMargin },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#f5f2e8", family: "Sora" },
    showlegend: false,
    annotations:
      sliderMode.value === "distance"
        ? [
            {
              xref: "paper",
              yref: "paper",
              x: 1,
              y: 0,
              xanchor: "right",
              yanchor: "top",
              text: "Distance (km)",
              showarrow: false,
              font: { size: 12, color: "#f5f2e8" },
            },
          ]
        : [],
    shapes: currentPressurePoint.value
      ? [
          {
            type: "line",
            xref: "x",
            yref: "paper",
            x0:
              sliderMode.value === "distance"
                ? currentPressurePoint.value.distanceKm
                : currentPressurePoint.value.datetime,
            x1:
              sliderMode.value === "distance"
                ? currentPressurePoint.value.distanceKm
                : currentPressurePoint.value.datetime,
            y0: 0,
            y1: 1,
            line: { color: PRESSURE_CURSOR_COLOR, width: 3 },
          },
        ]
      : [],
    xaxis: {
      type: sliderMode.value === "distance" ? "linear" : "date",
      title: "",
      gridcolor: "rgba(255,255,255,0.08)",
      tickfont: { size: 9 },
      autorange: !hasRange,
      range: hasRange ? [xMin, xMax] : undefined,
    },
    yaxis: {
      gridcolor: "rgba(255,255,255,0.08)",
      tickfont: { size: 10 },
      title: { text: "" },
    },
    dragmode: "zoom",
    editable: false,
    updatemenus: [
      {
        type: "dropdown",
        x: 0.02,
        y: 0.98,
        xanchor: "left",
        yanchor: "top",
        bgcolor: "rgba(10, 16, 30, 0.9)",
        activebgcolor: "rgba(255,255,255,0.12)",
        activebordercolor: "rgba(255,255,255,0.25)",
        bordercolor: "rgba(255,255,255,0.15)",
        font: { size: 11, color: "#f5f2e8" },
        pad: { t: 0, r: 0, b: 0, l: 0 },
        active: Math.max(0, availableMetrics.indexOf(selectedMetric.value)),
        showactive: true,
        buttons: availableMetrics.map((metric, index) => {
          const visibility = Array(traces.length).fill(false);
          const group = traceGroups.get(metric);
          if (group) {
            for (let i = group.start; i < group.end; i += 1) {
              visibility[i] = true;
            }
          }
          return {
            label: formatMetricLabel(metric),
            method: "update",
            args: [{ visible: visibility }],
          };
        }),
      },
    ],
  };

  Plotly.react(plotContainer.value, traces, layout, {
    displayModeBar: true,
    responsive: true,
    editable: true,
    edits: {
      shapePosition: true,
      axisTitleText: false,
      titleText: false,
      legendPosition: false,
      annotationText: false,
      annotationPosition: false,
      colorbarPosition: false,
    },
    modeBarButtons: [["zoom2d", "pan2d", "autoScale2d"]],
    displaylogo: false,
  });

  if (!plotHandlersBound && plotContainer.value?.on) {
    plotHandlersBound = true;
    plotContainer.value.on("plotly_relayout", (event) => {
      if (suppressPlotRelayout) {
        suppressPlotRelayout = false;
        return;
      }
      const x0 = event?.["shapes[0].x0"] ?? event?.["shapes[0].x1"];
      if (x0 == null) {
        return;
      }
      const timeline = activeTimeline.value;
      if (!timeline.length) {
        return;
      }
      const target =
        sliderMode.value === "distance"
          ? Number(x0)
          : Number.isFinite(Number(x0))
            ? Number(x0)
            : Date.parse(x0);
      if (!Number.isFinite(target)) {
        return;
      }
      const key = sliderMode.value === "distance" ? "distanceKm" : "ms";
      const index = findClosestIndex(timeline, target, key);
      if (index === currentPressureIndex.value) {
        return;
      }
      suppressPlotRelayout = true;
      currentPressureIndex.value = index;
    });
  }
};

const updateMap = () => {
  if (!mapInstance || !mapReady) {
    return;
  }
  const emptyCollection = { type: "FeatureCollection", features: [] };
  let minLon = 180;
  let minLat = 90;
  let maxLon = -180;
  let maxLat = -90;
  let hasBounds = false;

  const timeline = timeTimeline.value;
  if (timeline.length) {
    timeline.forEach((entry) => {
      const lon = Number(entry.lon);
      const lat = Number(entry.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        return;
      }
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      hasBounds = true;
    });

    if (!ensureThreeboxInitialized()) {
      return;
    }

    if (pressureLines.length) {
      pressureLines.forEach((line) => threebox.remove(line));
      pressureLines = [];
    }

    const lineCoords = timeline.map((entry) => {
      const altitude = Math.max(0, Number(entry.altitude) || 0);
      const scaledAlt = altitude * terrainExaggeration;
      return [entry.lon, entry.lat, scaledAlt];
    });

    if (lineCoords.length) {
      const line = threebox.line({
        geometry: lineCoords,
        color: PRESSURE_PATH_COLOR,
        width: 4,
        opacity: 0.9,
      });
      pressureLines.push(line);
      threebox.add(line);
    }
    setThreeboxVisibility(isCameraFollowEnabled.value);
  } else if (pressureLines.length && threebox) {
    pressureLines.forEach((line) => threebox.remove(line));
    pressureLines = [];
  }

  const pathRows = normalizeTable(tagData.value?.paths);
  const simulationRows = pathRows.filter((row) => row?.type === "simulation");
  const mostLikelyRows = pathRows.filter((row) => row?.type === "most_likely");
  const stapRows = normalizeTable(tagData.value?.staps);
  const stapLocations = new Map();
  const stapSourceRows = mostLikelyRows.length ? mostLikelyRows : simulationRows;
  stapSourceRows.forEach((row) => {
    const stapId = row?.stap_id;
    const lon = Number(row?.lon);
    const lat = Number(row?.lat);
    if (stapId == null || !Number.isFinite(lon) || !Number.isFinite(lat)) {
      return;
    }
    const key = String(stapId);
    const entry = stapLocations.get(key) || { lon: 0, lat: 0, count: 0 };
    entry.lon += lon;
    entry.lat += lat;
    entry.count += 1;
    stapLocations.set(key, entry);
  });

  const staps = stapRows
    .filter((stap) => stap?.include !== false)
    .map((stap) => {
      const key = stap?.stap_id != null ? String(stap.stap_id) : "";
      const entry = stapLocations.get(key);
      if (!entry || !entry.count) {
        return null;
      }
      const startTime = stap?.start ? new Date(stap.start).getTime() : 0;
      const endTime = stap?.end ? new Date(stap.end).getTime() : 0;
      const duration =
        Number.isFinite(startTime) && Number.isFinite(endTime) && endTime >= startTime
          ? (endTime - startTime) / (1000 * 60 * 60 * 24)
          : 0;
      return {
        stapId: key,
        startTime,
        startLabel: formatLongDate(stap?.start),
        endLabel: formatLongDate(stap?.end),
        duration,
        lon: entry.lon / entry.count,
        lat: entry.lat / entry.count,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startTime - b.startTime);

  stapList = staps;
  stapColorMap = new Map();
  staps.forEach((stap, index) => {
    stapColorMap.set(stap.stapId, colorForIndex(index, staps.length));
  });

  const tagColor = "#A1A1AA";
  const mostLikelyCoords = mostLikelyRows
    .filter((row) => row?.lon != null && row?.lat != null)
    .map((row) => [Number(row.lon), Number(row.lat)])
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  const simulationByStap = new Map();
  simulationRows.forEach((row) => {
    const stapId = row?.stap_id;
    const lon = Number(row?.lon);
    const lat = Number(row?.lat);
    if (stapId == null || !Number.isFinite(lon) || !Number.isFinite(lat)) {
      return;
    }
    const key = String(stapId);
    const entries = simulationByStap.get(key) || [];
    entries.push([lon, lat]);
    simulationByStap.set(key, entries);
  });

  const stapOrder = staps.length
    ? staps.map((stap) => stap.stapId)
    : Array.from(simulationByStap.keys()).sort((a, b) => Number(a) - Number(b));

  let trajectoryCount = 0;
  simulationByStap.forEach((entries) => {
    trajectoryCount = Math.max(trajectoryCount, entries.length);
  });

  const pathFeatures = [];
  for (let j = 0; j < trajectoryCount; j += 1) {
    const coords = [];
    stapOrder.forEach((stapId) => {
      const entries = simulationByStap.get(stapId);
      if (!entries || !entries[j]) {
        return;
      }
      coords.push(entries[j]);
    });
    if (coords.length >= 2) {
      pathFeatures.push({
        type: "Feature",
        properties: { color: tagColor, trajectory: j + 1 },
        geometry: { type: "LineString", coordinates: coords },
      });
    }
  }

  const pathCoordinates = pathFeatures.flatMap((feature) => feature.geometry.coordinates);
  const pathCollection = {
    type: "FeatureCollection",
    features: pathFeatures,
  };
  const pathSource = mapInstance.getSource("tag-paths");
  if (pathSource) {
    pathSource.setData(pathCollection);
  } else {
    mapInstance.addSource("tag-paths", { type: "geojson", data: pathCollection });
  }
  if (!mapInstance.getLayer("tag-paths-line")) {
    mapInstance.addLayer({
      id: "tag-paths-line",
      type: "line",
      source: "tag-paths",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2,
        "line-opacity": 0.6,
      },
    });
  } else {
    mapInstance.setPaintProperty("tag-paths-line", "line-color", ["get", "color"]);
  }

  const mostLikelyCollection = {
    type: "FeatureCollection",
    features:
      mostLikelyCoords.length >= 2
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: mostLikelyCoords },
            },
          ]
        : [],
  };
  const mostLikelySource = mapInstance.getSource("tag-most-likely");
  if (mostLikelySource) {
    mostLikelySource.setData(mostLikelyCollection);
  } else {
    mapInstance.addSource("tag-most-likely", { type: "geojson", data: mostLikelyCollection });
  }
  if (!mapInstance.getLayer("tag-most-likely-line")) {
    mapInstance.addLayer({
      id: "tag-most-likely-line",
      type: "line",
      source: "tag-most-likely",
      paint: {
        "line-color": PRESSURE_PATH_COLOR,
        "line-width": 2.5,
        "line-opacity": 0.9,
      },
    });
  } else {
    mapInstance.setPaintProperty("tag-most-likely-line", "line-color", PRESSURE_PATH_COLOR);
  }

  const stapCollection = {
    type: "FeatureCollection",
    features: staps.map((stap) => ({
      type: "Feature",
      properties: {
        stapId: stap.stapId,
        start: stap.startLabel,
        end: stap.endLabel,
        duration: stap.duration,
        color: stapColorMap.get(stap.stapId) || PRESSURE_PATH_COLOR,
      },
      geometry: { type: "Point", coordinates: [stap.lon, stap.lat] },
    })),
  };
  const stapSource = mapInstance.getSource("tag-staps");
  if (stapSource) {
    stapSource.setData(stapCollection);
  } else {
    mapInstance.addSource("tag-staps", { type: "geojson", data: stapCollection });
  }
  if (!mapInstance.getLayer("tag-staps-circles")) {
    mapInstance.addLayer({
      id: "tag-staps-circles",
      type: "circle",
      source: "tag-staps",
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["interpolate", ["linear"], ["get", "duration"], 0, 3, 5, 6, 20, 12],
        "circle-opacity": 0.9,
        "circle-stroke-width": 1,
        "circle-stroke-color": "rgba(0,0,0,0.35)",
      },
    });
  } else {
    mapInstance.setPaintProperty("tag-staps-circles", "circle-color", ["get", "color"]);
  }

  if (!stapHandlersBound && mapInstance.getLayer("tag-staps-circles")) {
    stapHandlersBound = true;
    mapInstance.on("mousemove", "tag-staps-circles", (event) => {
      if (!event.features || !event.features.length) {
        return;
      }
      mapInstance.getCanvas().style.cursor = "pointer";
      const props = event.features[0].properties || {};
      const durationDays = Number(props.duration);
      const durationLabel = Number.isFinite(durationDays)
        ? durationDays >= 1
          ? `${Math.round(durationDays)} d.`
          : `${durationDays.toFixed(1)} d.`
        : "—";
      const rangeLabel =
        props.start || props.end
          ? `${props.start || "—"} - ${props.end || "—"} (${durationLabel})`
          : `— (${durationLabel})`;
      const html = `
        <div class="map-tooltip">
          <p class="map-tooltip__title">Stopover #${props.stapId || "—"}</p>
          <p class="map-tooltip__meta">${rangeLabel}</p>
        </div>
      `;
      if (!stapPopup) {
        stapPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
      }
      stapPopup.setLngLat(event.lngLat).setHTML(html).addTo(mapInstance);
    });

    mapInstance.on("mouseleave", "tag-staps-circles", () => {
      mapInstance.getCanvas().style.cursor = "";
      if (stapPopup) {
        stapPopup.remove();
        stapPopup = null;
      }
    });
  }

  const observationRows = Array.isArray(tagData.value?.observations)
    ? tagData.value.observations
    : [];
  const observationFeatures = observationRows
    .map((obs, index) => {
      const lon = Number(obs?.longitude);
      const lat = Number(obs?.latitude);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        return null;
      }
      return {
        type: "Feature",
        properties: {
          obsIndex: index,
          kind: obs?.observation_type || "known",
          name: obs?.location_name || "Location",
        },
        geometry: { type: "Point", coordinates: [lon, lat] },
      };
    })
    .filter(Boolean);
  const observationCollection = { type: "FeatureCollection", features: observationFeatures };
  const observationSource = mapInstance.getSource("tag-observations");
  if (observationSource) {
    observationSource.setData(observationCollection);
  } else {
    mapInstance.addSource("tag-observations", { type: "geojson", data: observationCollection });
  }
  if (!mapInstance.getLayer("tag-observations-circles")) {
    mapInstance.addLayer({
      id: "tag-observations-circles",
      type: "circle",
      source: "tag-observations",
      paint: {
        "circle-color": "#f8fafc",
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(0,0,0,0.7)",
        "circle-opacity": 0.95,
      },
    });
  }
  if (!mapInstance.getLayer("tag-observations-highlight")) {
    mapInstance.addLayer({
      id: "tag-observations-highlight",
      type: "circle",
      source: "tag-observations",
      paint: {
        "circle-color": "#f8fafc",
        "circle-radius": 10,
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(0,0,0,0.7)",
        "circle-opacity": 1,
      },
      filter: ["==", ["get", "obsIndex"], -1],
    });
  }
  if (mapInstance.getLayer("tag-pressure-position-circle")) {
    mapInstance.moveLayer("tag-pressure-position-circle");
  }

  if (!locationHandlersBound && mapInstance.getLayer("tag-observations-circles")) {
    locationHandlersBound = true;
    mapInstance.on("mousemove", "tag-observations-circles", (event) => {
      if (!event.features || !event.features.length) {
        return;
      }
      mapInstance.getCanvas().style.cursor = "pointer";
      const name = event.features[0].properties?.name || "Location";
      if (!locationPopup) {
        locationPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
      }
      locationPopup
        .setLngLat(event.lngLat)
        .setHTML(`<div class="map-tooltip"><p class="map-tooltip__meta">${name}</p></div>`)
        .addTo(mapInstance);
    });

    mapInstance.on("mouseleave", "tag-observations-circles", () => {
      mapInstance.getCanvas().style.cursor = "";
      if (locationPopup) {
        locationPopup.remove();
        locationPopup = null;
      }
    });
  }

  const boundsPoints = [
    ...pathCoordinates,
    ...observationFeatures.map((feature) => feature.geometry.coordinates),
  ];
  boundsPoints.forEach(([lon, lat]) => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return;
    }
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    hasBounds = true;
  });

  if (hasBounds && Number.isFinite(minLon)) {
    mapInstance.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 80, duration: 800, pitch: 0, bearing: 0 },
    );
  }
  updatePressureMarker();
  if (highlightedObservationIndex != null) {
    setObservationHighlight(highlightedObservationIndex);
  }
};

const setObservationHighlight = (index) => {
  highlightedObservationIndex = index;
  if (!mapInstance?.getLayer("tag-observations-highlight")) {
    return;
  }
  mapInstance.setFilter("tag-observations-highlight", ["==", ["get", "obsIndex"], index]);
  mapInstance.moveLayer("tag-observations-highlight");
};

const clearObservationHighlight = () => {
  highlightedObservationIndex = null;
  if (!mapInstance?.getLayer("tag-observations-highlight")) {
    return;
  }
  mapInstance.setFilter("tag-observations-highlight", ["==", ["get", "obsIndex"], -1]);
};

const fetchTagData = async (tagId) => {
  if (!tagId) {
    return;
  }
  stopPressurePlayback();
  try {
    tagData.value = await loadTagData(tagId);
    const rawPressure = tagData.value?.pressurepath;
    pressureData = normalizePressureData(rawPressure);
    timeTimeline.value = buildTimeTimeline(pressureData);
    distanceTimeline.value = buildDistanceTimeline(timeTimeline.value);
    const availableMetrics = buildMetrics(pressureData?.values || {});
    metrics.value = availableMetrics;
    selectedMetric.value = availableMetrics.includes("altitude")
      ? "altitude"
      : availableMetrics[0] || "";
    currentPressureIndex.value = 0;
    updateMap();
    updatePlot();
    if (canPlayPressure.value) {
      startPressurePlayback();
    } else {
      isPressurePlaying.value = false;
    }
  } catch (error) {
    console.error("Failed to load tag data:", error);
    tagData.value = null;
    pressureData = null;
    timeTimeline.value = [];
    distanceTimeline.value = [];
    metrics.value = [];
    selectedMetric.value = "";
    updateMap();
  }
};

watch(
  () => route.params.tagId,
  (value) => {
    if (value) {
      selectedTag.value = String(value);
    }
  },
);

watch(selectedTag, (value) => {
  if (value) {
    router.replace({ name: "tag", params: { tagId: value } });
    fetchTagData(value);
    searchQuery.value = "";
    isSearching.value = false;
  }
});

watch(selectedMetric, () => {
  updatePlot();
});

watch(currentPressureIndex, () => {
  updatePressureMarker();
  updatePlotCursor();
  updateCameraForPressurePoint();
});

watch(sliderMode, () => {
  stopPressurePlayback();
  currentPressureIndex.value = 0;
  pressureLerp.value = 0;
  updatePlot();
  updatePlotCursor();
  updatePressureMarker();
});

watch([timeTimeline, distanceTimeline], () => {
  currentPressureIndex.value = 0;
  pressureLerp.value = 0;
  updatePlot();
  updatePlotCursor();
  updatePressureMarker();
  updateCameraForPressurePoint();
});

onMounted(async () => {
  tags.value = await loadTags();
  const initialTag = route.params.tagId ? String(route.params.tagId) : tags.value[0]?.tag_id;
  selectedTag.value = initialTag;

  updateIsMobile();
  mapboxgl.accessToken = MAPBOX_TOKEN;
  mapInstance = new mapboxgl.Map({
    container: mapContainer.value,
    style: "mapbox://styles/mapbox/satellite-v9",
    center: [10, 15],
    zoom: 2.4,
    pitch: 0,
    bearing: 0,
    projection: "mercator",
  });

  mapInstance.on("load", () => {
    mapReady = true;
    mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    mapInstance.addControl(
      new mapboxgl.FullscreenControl({ container: mapWrapper.value || mapContainer.value }),
      "top-right",
    );
    if (!isMobile.value) {
      mapInstance.addControl(
        new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }),
        "bottom-left",
      );
    }
    mapInstance.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.terrain-rgb",
      tileSize: 512,
      maxzoom: 14,
    });
    pressureMarkerReady = true;
    applyBirdViewState(isCameraFollowEnabled.value);
    if (selectedTag.value) {
      fetchTagData(selectedTag.value);
    }
    requestAnimationFrame(() => {
      mapInstance.resize();
    });
  });

  if (!cameraHandlersBound) {
    cameraPointerDownHandler = () => {
      if (!isCameraFollowEnabled.value) {
        return;
      }
      userCameraInteracting = true;
      cameraMovedDuringInteraction = false;
      wasPlayingBeforeDrag = isPressurePlaying.value;
      stopPressurePlayback();
    };
    cameraPointerUpHandler = () => {
      if (!userCameraInteracting) {
        return;
      }
      userCameraInteracting = false;
      if (cameraMovedDuringInteraction) {
        captureCameraOffset();
      }
      if (wasPlayingBeforeDrag) {
        startPressurePlayback();
      }
      wasPlayingBeforeDrag = false;
      cameraMovedDuringInteraction = false;
    };
    cameraPointerUpWindowHandler = () => {
      if (userCameraInteracting) {
        cameraPointerUpHandler();
      }
    };
    cameraMoveHandler = () => {
      if (!userCameraInteracting) {
        return;
      }
      cameraMovedDuringInteraction = true;
    };
    cameraZoomStartHandler = (event) => {
      if (!isCameraFollowEnabled.value) {
        return;
      }
      if (!event?.originalEvent) {
        return;
      }
      userCameraInteracting = true;
      cameraMovedDuringInteraction = false;
    };
    cameraZoomEndHandler = () => {
      if (!userCameraInteracting) {
        return;
      }
      userCameraInteracting = false;
      if (cameraMovedDuringInteraction) {
        captureCameraOffset();
      }
      cameraMovedDuringInteraction = false;
    };
    mapInstance.on("mousedown", cameraPointerDownHandler);
    mapInstance.on("mouseup", cameraPointerUpHandler);
    mapInstance.on("touchstart", cameraPointerDownHandler);
    mapInstance.on("touchend", cameraPointerUpHandler);
    mapInstance.on("move", cameraMoveHandler);
    mapInstance.on("rotate", cameraMoveHandler);
    mapInstance.on("pitch", cameraMoveHandler);
    mapInstance.on("zoom", cameraMoveHandler);
    mapInstance.on("zoomstart", cameraZoomStartHandler);
    mapInstance.on("zoomend", cameraZoomEndHandler);
    window.addEventListener("mouseup", cameraPointerUpWindowHandler);
    window.addEventListener("touchend", cameraPointerUpWindowHandler, { passive: true });
    cameraHandlersBound = true;
  }

  resizeHandler = () => {
    updateIsMobile();
    if (plotContainer.value) {
      Plotly.Plots.resize(plotContainer.value);
    }
    if (mapInstance) {
      mapInstance.resize();
    }
  };
  window.addEventListener("resize", resizeHandler);

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      if (mapInstance) {
        mapInstance.resize();
      }
      if (plotContainer.value) {
        Plotly.Plots.resize(plotContainer.value);
      }
    });
    if (mapContainer.value) {
      resizeObserver.observe(mapContainer.value);
    }
    if (plotContainer.value) {
      resizeObserver.observe(plotContainer.value);
    }
  }

  outsideClickHandler = (event) => {
    if (!isSearching.value) {
      return;
    }
    const container = tagSearchContainer.value;
    if (!container || container.contains(event.target)) {
      return;
    }
    isSearching.value = false;
  };
  document.addEventListener("mousedown", outsideClickHandler);
  document.addEventListener("touchstart", outsideClickHandler, { passive: true });
});

onBeforeUnmount(() => {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (outsideClickHandler) {
    document.removeEventListener("mousedown", outsideClickHandler);
    document.removeEventListener("touchstart", outsideClickHandler);
    outsideClickHandler = null;
  }
  stopPressurePlayback();
  if (stapPopup) {
    stapPopup.remove();
    stapPopup = null;
  }
  stopPressureMarkerAnimation();
  if (threebox && pressureMarker3d) {
    threebox.remove(pressureMarker3d);
    pressureMarker3d = null;
  }
  if (pressureLines.length && threebox) {
    pressureLines.forEach((line) => threebox.remove(line));
    pressureLines = [];
  }
  if (mapInstance) {
    if (cameraHandlersBound) {
      if (cameraPointerDownHandler && cameraPointerUpHandler) {
        mapInstance.off("mousedown", cameraPointerDownHandler);
        mapInstance.off("mouseup", cameraPointerUpHandler);
        mapInstance.off("touchstart", cameraPointerDownHandler);
        mapInstance.off("touchend", cameraPointerUpHandler);
      }
      if (cameraMoveHandler) {
        mapInstance.off("move", cameraMoveHandler);
        mapInstance.off("rotate", cameraMoveHandler);
        mapInstance.off("pitch", cameraMoveHandler);
        mapInstance.off("zoom", cameraMoveHandler);
      }
      if (cameraZoomStartHandler && cameraZoomEndHandler) {
        mapInstance.off("zoomstart", cameraZoomStartHandler);
        mapInstance.off("zoomend", cameraZoomEndHandler);
      }
      if (cameraPointerUpWindowHandler) {
        window.removeEventListener("mouseup", cameraPointerUpWindowHandler);
        window.removeEventListener("touchend", cameraPointerUpWindowHandler);
      }
      cameraHandlersBound = false;
    }
    mapInstance.remove();
  }
});
</script>

<style scoped>
:deep(.mapboxgl-ctrl-scale) {
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

:deep(.plotly .updatemenu-item-rect) {
  fill: rgba(10, 16, 30, 0.9) !important;
  stroke: rgba(255, 255, 255, 0.2) !important;
}

:deep(.plotly .updatemenu-item:hover .updatemenu-item-rect) {
  fill: rgba(10, 16, 30, 0.95) !important;
}

:deep(.plotly .hoverlayer .hovertext rect) {
  fill: rgba(10, 16, 30, 0.9) !important;
  stroke: rgba(255, 255, 255, 0.15) !important;
}

:deep(.plotly .updatemenu-container rect) {
  stroke: rgba(255, 255, 255, 0.6) !important;
  stroke-width: 1 !important;
}
</style>
