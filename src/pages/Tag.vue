<template>
  <section class="min-h-screen w-full bg-[color:var(--ink)] px-3 pb-3 pt-[4.5rem]">
    <div
      class="grid w-full grid-cols-1 gap-3 lg:h-[max(660px,calc(100vh-5.25rem))] lg:grid-cols-[minmax(320px,440px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_clamp(280px,42%,520px)]"
    >
      <div class="panel h-full relative z-20 overflow-visible rounded-xl p-4 sm:overflow-y-auto">
        <div class="grid gap-4">
          <div>
            <!-- Headless UI owns open/close: clicking the field opens the full list with
                 the current tag selected, typing filters it, Escape or clicking elsewhere
                 closes it and restores the tag name. -->
            <Combobox v-model="selectedTag" as="div" class="relative" v-slot="{ open }">
              <div class="relative">
                <div class="relative">
                  <ComboboxInput
                    class="field pr-10"
                    :displayValue="tagDisplayValue"
                    @change="searchQuery = $event.target.value"
                    @focus="$event.target.select()"
                    @click="openOptions(open, tagMenuButton, $event)"
                    @keydown.enter="pickFirstMatch"
                    @blur.capture="$event.stopImmediatePropagation()"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="Search tag, species, project"
                  />
                  <ComboboxButton
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-fg/50"
                    ref="tagMenuButton"
                    aria-label="Show all tags"
                    @click="searchQuery = ''"
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
              <ComboboxOptions class="menu z-50 max-h-72">
                <div v-if="!filteredTags.length" class="px-3 py-2 text-xs text-fg/50">
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
                      active ? 'bg-fg/10' : '',
                      selected ? 'border border-fg/20' : 'border border-transparent',
                    ]"
                  >
                    <p class="text-sm font-medium text-fg">
                      {{ tag.tag_id }} · {{ tag.common_name || tag.scientific_name || "Unknown" }}
                      <span
                        v-if="tag.is_private"
                        class="badge-private"
                      >
                        Private
                      </span>
                    </p>
                    <p
                      v-if="tag.project_title"
                      class="mt-1 text-[11px] uppercase tracking-[0.2em] text-fg/50"
                    >
                      {{ displayProjectTitle(tag.project_title) }}
                    </p>
                  </div>
                </ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          </div>

          <div class="flex items-center justify-between gap-3 sm:hidden">
            <p class="eyebrow">Details</p>
            <button
              type="button"
              class="button-ghost"
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
            <div v-if="tagDetails" class="space-y-3 text-sm text-fg/70 break-words">
              <div>
                <p class="text-fg/90 break-words">
                  <span class="font-medium">{{ speciesInfo.commonName || "Unknown species" }}</span>
                  <span v-if="speciesInfo.scientificName" class="ml-2 italic text-fg/60">
                    {{ speciesInfo.scientificName }}
                  </span>
                  <img
                    v-if="speciesInfo.iucnIcon"
                    :src="speciesInfo.iucnIcon"
                    :title="`IUCN ${speciesInfo.iucnLabel}`"
                    alt=""
                    aria-hidden="true"
                    class="ml-2 inline-block h-3.5 w-3.5 align-[-2px] object-contain"
                  />
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg/60">
                  <a
                    v-if="speciesInfo.ebirdLink"
                    :href="speciesInfo.ebirdLink"
                    target="_blank"
                    rel="noreferrer"
                    class="chip"
                  >
                    eBird
                  </a>
                  <a
                    v-if="speciesInfo.statusTrendsLink"
                    :href="speciesInfo.statusTrendsLink"
                    target="_blank"
                    rel="noreferrer"
                    class="chip"
                  >
                    Trends
                  </a>
                  <a
                    v-if="speciesInfo.birdlifeFactsheetLink"
                    :href="speciesInfo.birdlifeFactsheetLink"
                    target="_blank"
                    rel="noreferrer"
                    class="chip"
                  >
                    BirdLife
                  </a>
                  <a
                    v-if="speciesInfo.birdsOfTheWorldLink"
                    :href="speciesInfo.birdsOfTheWorldLink"
                    target="_blank"
                    rel="noreferrer"
                    class="chip"
                  >
                    Birds of the World
                  </a>
                  <span
                    v-if="speciesInfo.status"
                    class="chip"
                  >
                    Status: {{ speciesInfo.status }}
                  </span>
                  <span
                    v-if="speciesInfo.trend"
                    class="chip"
                  >
                    Trend: {{ speciesInfo.trend }}
                  </span>
                </div>
              </div>
              <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-fg/80">
                <div class="col-span-2 min-w-0">
                  <dt class="eyebrow">Project</dt>
                  <dd class="mt-1 break-words">
                    <RouterLink
                      v-if="tagDetails?.project_id"
                      :to="`/project/${projectSlug(tagDetails.project_id)}`"
                      class="link"
                    >
                      {{ displayProjectTitle(tagDetails.project_title) || "—" }}
                    </RouterLink>
                    <span v-else>—</span>
                    <span v-if="tagDetails.is_private" class="badge-private">Private</span>
                  </dd>
                </div>
                <div>
                  <dt class="eyebrow">Ring</dt>
                  <dd class="mt-1">{{ tagDetails.ring_number || "—" }}</dd>
                </div>
                <div>
                  <dt class="eyebrow">Sex</dt>
                  <dd class="mt-1">{{ sexSymbol || "—" }}</dd>
                </div>
                <div>
                  <dt class="eyebrow">Age class</dt>
                  <dd class="mt-1">{{ tagDetails.age_class || "—" }}</dd>
                </div>
                <div>
                  <dt class="eyebrow">Wing length</dt>
                  <dd class="mt-1">
                    {{ tagDetails.wing_length ? `${tagDetails.wing_length} mm` : "—" }}
                  </dd>
                </div>
                <div class="col-span-2">
                  <dt class="eyebrow">Model</dt>
                  <dd class="mt-1 break-words">
                    {{
                      tagDetails.model
                        ? tagDetails.firmware
                          ? `${tagDetails.model} (${tagDetails.firmware})`
                          : tagDetails.model
                        : "—"
                    }}
                  </dd>
                </div>
              </dl>
            </div>
            <div v-if="observations.length" class="space-y-2">
              <p class="eyebrow">Observations</p>
              <div
                class="card w-full max-w-full overflow-hidden"
              >
                <table class="w-full max-w-full table-auto text-left text-xs text-fg/70">
                  <thead
                    class="sticky top-0 text-[10px] uppercase tracking-[0.2em] text-fg/50"
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
                      class="border-t border-fg/5 transition hover:bg-fg/5"
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
        class="relative h-full min-h-[400px] overflow-hidden rounded-xl border border-fg/10 bg-[color:var(--slate)] lg:min-h-0"
      >
        <div ref="mapContainer" class="h-full w-full"></div>
        <div
          v-if="isMapLoading"
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-live="polite"
        >
          <p class="rounded-full border border-fg/10 bg-shade/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-fg/70 backdrop-blur">
            Loading…
          </p>
        </div>
        <label
          v-if="hasPressurePath"
          class="absolute left-4 top-4 z-10 inline-flex items-center gap-3 rounded-full border border-fg/10 bg-shade/60 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-fg/70 backdrop-blur cursor-pointer"
          @pointerdown.stop
          @touchstart.stop
          @touchend.stop
        >
          <span>Bird view</span>
          <input v-model="isCameraFollowEnabled" type="checkbox" class="sr-only" />
          <span
            class="relative inline-flex h-5 w-9 items-center rounded-full border transition"
            :class="
              isCameraFollowEnabled
                ? 'border-[color:var(--teal)]/50 bg-[color:var(--teal)]/20'
                : 'border-fg/20 bg-fg/10'
            "
          >
            <span
              class="absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition duration-200"
              :class="
                isCameraFollowEnabled
                  ? 'translate-x-4 bg-[color:var(--teal)]'
                  : 'translate-x-0 bg-fg/70'
              "
            ></span>
          </span>
        </label>
      </div>

      <div class="panel h-full min-h-0 lg:col-span-2 flex flex-col gap-1 rounded-xl px-2 pb-1 pt-2 sm:px-3">
        <!-- Timeline bar: playback and plot options. The plot below is the scrubber. -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-fg/15 bg-fg/5 text-fg/80 transition hover:text-fg disabled:opacity-40"
            :disabled="!canPlayPressure"
            @click="togglePressurePlayback"
            :aria-label="isPressurePlaying ? 'Pause' : 'Play'"
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
            aria-label="Playback speed"
            class="timeline-select w-20 tabular-nums"
          >
            <option v-for="speed in SPEED_PRESETS" :key="speed.id" :value="speed.id">
              {{ speed.label }}
            </option>
          </select>
          <div
            class="flex items-center rounded-full border border-fg/15 bg-fg/5 p-0.5 text-[10px] uppercase tracking-[0.2em] text-fg/60"
            role="group"
            aria-label="Plot against"
          >
            <button
              type="button"
              class="rounded-full px-3 py-1.5 transition [touch-action:manipulation]"
              :class="sliderMode === 'time' ? 'bg-fg/10 text-fg' : ''"
              :aria-pressed="sliderMode === 'time'"
              @click="sliderMode = 'time'"
            >
              Time
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 transition [touch-action:manipulation]"
              :class="sliderMode === 'distance' ? 'bg-fg/10 text-fg' : ''"
              :aria-pressed="sliderMode === 'distance'"
              @click="sliderMode = 'distance'"
            >
              Distance
            </button>
          </div>
          <select
            v-if="metrics.length > 1"
            v-model="selectedMetric"
            aria-label="Plotted variable"
            class="timeline-select"
          >
            <option v-for="metric in metrics" :key="metric" :value="metric">
              {{ formatMetricLabel(metric) }}
            </option>
          </select>
          <span v-else-if="metrics.length" class="text-xs text-fg/70">
            {{ formatMetricLabel(metrics[0]) }}
          </span>
          <span
            v-if="showNightShading"
            class="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-fg/50"
          >
            <span class="h-3 w-3 rounded-sm" :style="{ background: nightSwatch }"></span>
            Night
          </span>
          <span
            class="ml-auto text-xs uppercase tracking-[0.2em] text-fg/70 tabular-nums"
            aria-live="off"
          >
            {{ currentPressureLabel }}
          </span>
        </div>
        <input
          v-if="!hasPressurePath"
          class="pressure-slider w-full cursor-pointer appearance-none [touch-action:pan-x]"
          type="range"
          aria-label="Position along the track"
          :min="pressureSliderMin"
          :max="pressureSliderMax"
          :step="pressureSliderStep"
          :value="pressureSliderValue"
          @input="onPressureSliderInput"
          :disabled="!activeTimeline.length"
        />
        <div
          ref="plotWrapper"
          class="plotly-container relative flex-1 min-h-[220px] sm:min-h-[260px] lg:min-h-0 overflow-hidden"
        >
          <div
            v-if="hasPressurePath"
            ref="plotContainer"
            class="h-full w-full min-h-0 overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--teal)]"
            tabindex="0"
            role="slider"
            aria-label="Position along the track. Click the plot or use the arrow keys to move; space to play or pause."
            :aria-valuemin="0"
            :aria-valuemax="maxPressureIndex"
            :aria-valuenow="currentPressureIndex"
            :aria-valuetext="currentPressureLabel"
            @keydown="onPlotKeydown"
          ></div>
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center bg-shade/60 text-center"
          >
            <div class="rounded-2xl border border-fg/10 bg-shade/50 px-6 py-4" aria-live="polite">
              <p class="eyebrow">Pressurepath Data</p>
              <p class="mt-2 font-display text-lg text-fg">
                {{ isPressureLoading ? "Loading…" : "Not available for this tag" }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTheme } from "../lib/theme";
import { useRoute, useRouter } from "vue-router";
import mapboxgl from "mapbox-gl";
import Plotly from "plotly.js-basic-dist-min";
import { Threebox, THREE } from "threebox-plugin";
import { loadTagData, loadTagPressurePath, loadTags } from "../lib/data";
import { PRIVATE_DATAPACKAGES_CHANGED_EVENT } from "../lib/privateDatapackageStore";
import {
  buildDistanceTimeline,
  buildFallbackTimelines,
  buildHeadings,
  advanceAlongTimeline,
  buildMetrics,
  buildNightIntervals,
  buildTimeTimeline,
  destinationPoint,
  findClosestIndex,
  lerp,
  median,
  normalizeAngle,
  normalizePressureData,
  normalizeTable,
  bearingDegrees,
  haversineKm,
  toNumber,
  smoothAngle,
  smoothingAlpha,
} from "../lib/tagData";
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

const { theme } = useTheme();
const route = useRoute();
const router = useRouter();
const mapWrapper = ref(null);
const mapContainer = ref(null);
const plotContainer = ref(null);
const plotWrapper = ref(null);
const isMapLoading = ref(true);
// Night periods [startMs, endMs] for the shading on the plot.
const nightIntervals = ref([]);
const tags = ref([]);
const selectedTag = ref("");
const metrics = ref([]);
const selectedMetric = ref("");
const tagData = ref(null);
const searchQuery = ref("");
const isMobile = ref(false);
const isPanelCollapsed = ref(false);
const tagMenuButton = ref(null);
const timeTimeline = ref([]);
const distanceTimeline = ref([]);
const hasPressurePath = ref(false);
const isPressureLoading = ref(false);
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
const terrainExaggeration = 8;
let pressureData;
let resizeHandler;
let mapReady = false;
let resizeObserver;
let playRafId;
let lastPlayTimestamp = null;
let playAccumulator = 0;
let privateDatapackagesChangedHandler;
let pressureMarkerReady = false;
const PLAYBACK_DAYS_PER_SEC = 5;
const PLAYBACK_KM_PER_SEC = 200;
const FALLBACK_TIME_STEP_DAYS = 1;
const FALLBACK_DISTANCE_MIN_STEP_KM = 5;
const FALLBACK_DISTANCE_TARGET_POINTS = 800;
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
// Pressure-derived altitude can change by several km between consecutive rows, and it is
// drawn with the terrain exaggeration, so the displayed altitude is low-pass filtered.
// The camera follows more lazily than the bird so climbs read as bird motion, not camera shake.
const MARKER_ALTITUDE_SMOOTH_MS = 250;
const CAMERA_ALTITUDE_SMOOTH_MS = 700;
const CAMERA_POSITION_SMOOTH_MS = 100;
const HEADING_MIN_KM = 2;
const CAMERA_TERRAIN_CLEARANCE_M = 3000;
const CAMERA_FLOOR_RISE_MS = 120;
const CAMERA_FLOOR_FALL_MS = 900;
const BIRDVIEW_ZOOM_SMOOTH_MS = 120;
const BIRDVIEW_MIN_CAMERA_DISTANCE_M = 5000;
const BIRDVIEW_MAX_CAMERA_DISTANCE_M = 5000000;
const BIRDVIEW_MODEL_URL = new URL(
  "models/flying_bird.glb",
  `${window.location.origin}${import.meta.env.BASE_URL || "/"}`,
).toString();
const PRESSURE_CURSOR_COLOR = "#ef4444";
// Plotly draws to SVG with explicit colors, so it gets its own palette per theme.
const PLOT_COLORS = {
  dark: {
    text: "#f5f2e8",
    grid: "rgba(255,255,255,0.08)",
    baseline: "rgba(245, 242, 232, 0.35)",
    night: "rgba(130, 150, 230, 0.16)",
  },
  light: {
    text: "#141a24",
    grid: "rgba(11,17,28,0.08)",
    baseline: "rgba(20, 26, 36, 0.35)",
    night: "rgba(40, 60, 150, 0.12)",
  },
};
const PRESSURE_PATH_COLOR = "#f8fafc";
let savedCameraState = null;
let pressureMarker3d = null;
let pressureMarkerLoading = false;
let pressureMarkerMixer = null;
let pressureMarkerMixerRafId = null;
let pressureMarkerMixerLastMs = null;
// Camera pose relative to the bird (see applyFollowCamera).
let cameraRig = null;
// Wheel / +/- zoom still to apply, as log(distance factor); eased in by followStep.
let pendingBirdZoomLog = 0;
let smoothedBirdBearing = null;
// Smoothed state the bird-view camera and marker are drawn from (see runFollowFrame).
let followState = null;
let followRafId = null;
let lastAppliedCameraKey = "";
const selectedSpeed = ref("1x");
// The plot element is recreated whenever a tag without pressure data is shown, so the
// Plotly event handlers are tracked per element.
let plotHandlersBoundTo = null;
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

const getPressureBearing = () => {
  const headings = activeHeadings.value;
  if (!headings.length) {
    return 0;
  }
  const index = Math.min(Math.max(currentPressureIndex.value, 0), headings.length - 1);
  return headings[index] ?? 0;
};

// Altitude in the exaggerated 3D scene: the terrain is drawn `terrainExaggeration` times
// higher, so the bird, its path and the camera target must use the same scale to stay
// above the ground and consistent with each other.
const displayAltitude = (altitude) => Math.max(0, Number(altitude) || 0) * terrainExaggeration;

const tagMeta = computed(() => tags.value.find((tag) => tag.tag_id === selectedTag.value));
const tagDetails = computed(() => ({
  ...(tagMeta.value || {}),
  ...(tagData.value || {}),
}));

const iucnCategoryMeta = (value) => {
  const code = String(value || "").trim().toUpperCase();
  if (!code) {
    return null;
  }
  const iconCodes = new Set(["LC", "NT", "VU", "EN", "CR", "DD"]);
  const icon = iconCodes.has(code) ? `${import.meta.env.BASE_URL}icons/iucn_${code}.png` : "";
  const map = {
    LC: { label: "Least Concern", icon },
    NT: { label: "Near Threatened", icon },
    VU: { label: "Vulnerable", icon },
    EN: { label: "Endangered", icon },
    CR: { label: "Critically Endangered", icon },
    EW: { label: "Extinct in the Wild", icon: "" },
    EX: { label: "Extinct", icon: "" },
    DD: { label: "Data Deficient", icon },
    NE: { label: "Not Evaluated", icon: "" },
  };
  return map[code] || { label: code, icon: "" };
};

const sexSymbol = computed(() => formatSexSymbol(tagDetails.value?.sex));
const speciesInfo = computed(() => {
  const commonName = tagDetails.value?.common_name || "";
  const scientificName = tagDetails.value?.scientific_name || "";
  const speciesCode = tagDetails.value?.species_code || "";
  const iucnCategory = String(tagDetails.value?.iucn_red_list_category || "").toUpperCase();
  const birdlifeFactsheetLink = tagDetails.value?.birdlife_factsheet_url || "";
  const birdsOfTheWorldLink = tagDetails.value?.birds_of_the_world_url || "";
  const inStatusTrends = tagDetails.value?.in_ebirdst ?? null;
  const status = tagDetails.value?.ebird_status || "";
  const trend = tagDetails.value?.ebird_trend || "";
  const week = 21;
  const ebirdLink = speciesCode ? `https://ebird.org/species/${speciesCode}` : "";
  const statusTrendsLink = speciesCode && inStatusTrends === true
    ? `https://science.ebird.org/en/status-and-trends/species/${speciesCode}/abundance-map-weekly?week=${week}`
    : "";
  const iucnMeta = iucnCategoryMeta(iucnCategory);
  return {
    commonName,
    scientificName,
    ebirdLink,
    statusTrendsLink,
    iucnLabel: iucnMeta?.label || "",
    iucnIcon: iucnMeta?.icon || "",
    birdlifeFactsheetLink,
    birdsOfTheWorldLink,
    inStatusTrends: typeof inStatusTrends === "boolean" ? inStatusTrends : null,
    status,
    trend,
  };
});
const activeTimeline = computed(() =>
  sliderMode.value === "distance" ? distanceTimeline.value : timeTimeline.value,
);
const activeHeadings = computed(() => buildHeadings(activeTimeline.value, HEADING_MIN_KM));

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
  if (!current) {
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

const nightSwatch = computed(() => (PLOT_COLORS[theme.value] || PLOT_COLORS.dark).night);

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
        const totalKm = Number(list[list.length - 1]?.distanceKm) - Number(list[0]?.distanceKm);
        const avgKmPerRow =
          Number.isFinite(totalKm) && totalKm > 0 && list.length > 1
            ? totalKm / (list.length - 1)
            : 0;
        if (avgKmPerRow > 0) {
          return PLAYBACK_KM_PER_SEC / avgKmPerRow;
        }
        const deltas = [];
        for (let i = 1; i < list.length; i += 1) {
          const delta = Number(list[i].distanceKm) - Number(list[i - 1].distanceKm);
          if (Number.isFinite(delta) && delta > 0) {
            deltas.push(delta);
          }
        }
        const medianKmPerRow = median(deltas);
        return medianKmPerRow > 0 ? PLAYBACK_KM_PER_SEC / medianKmPerRow : 1;
      }
      const totalMs = Number(list[list.length - 1]?.ms) - Number(list[0]?.ms);
      const totalDays = Number.isFinite(totalMs) ? totalMs / (1000 * 60 * 60 * 24) : 0;
      const avgDays = totalDays > 0 && list.length > 1 ? totalDays / (list.length - 1) : 0;
      if (avgDays > 0) {
        return PLAYBACK_DAYS_PER_SEC / avgDays;
      }
      const deltas = [];
      for (let i = 1; i < list.length; i += 1) {
        const dtMs = Number(list[i].ms) - Number(list[i - 1].ms);
        if (Number.isFinite(dtMs) && dtMs > 0) {
          deltas.push(dtMs / (1000 * 60 * 60 * 24));
        }
      }
      const medianDays = median(deltas);
      return medianDays > 0 ? PLAYBACK_DAYS_PER_SEC / medianDays : 1;
    })();
    const speedPreset =
      SPEED_PRESETS.find((preset) => preset.id === selectedSpeed.value)?.factor ?? 1;
    const birdFactor = isCameraFollowEnabled.value ? BIRDVIEW_SPEED_FACTOR : 1;
    const rows = (delta / 1000) * rowsPerSecond * speedPreset * birdFactor;
    // In bird view also cap the ground speed: with 5-min data, time-based playback would
    // otherwise cross a whole night's flight in a fraction of a second.
    const maxKm = isCameraFollowEnabled.value
      ? (delta / 1000) * PLAYBACK_KM_PER_SEC * BIRDVIEW_SPEED_FACTOR * speedPreset
      : Infinity;
    const next = advanceAlongTimeline(
      list,
      currentPressureIndex.value,
      playAccumulator,
      rows,
      maxKm,
    );
    playAccumulator = next.frac;
    if (next.index !== currentPressureIndex.value) {
      currentPressureIndex.value = next.index;
    }
    pressureLerp.value = playAccumulator;
    updatePressureMarker();
    followStep(timestamp);
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
  requestFollowFrame();
};

watch(isCameraFollowEnabled, (enabled) => {
  if (!mapInstance || !mapReady) {
    return;
  }
  cameraRig = null;
  pendingBirdZoomLog = 0;
  smoothedBirdBearing = null;
  followState = null;
  lastAppliedCameraKey = "";
  if (!enabled) {
    stopFollowLoop();
    stopPressureMarkerAnimation();
  }
  if (!enabled) {
    userCameraInteracting = false;
    cameraMovedDuringInteraction = false;
    wasPlayingBeforeInteraction = false;
  }
  setBirdViewControls(enabled);
  applyBirdViewState(enabled);
  if (typeof mapInstance.getFreeCameraOptions !== "function") {
    return;
  }
  if (enabled) {
    savedCameraState = {
      center: mapInstance.getCenter(),
      zoom: mapInstance.getZoom(),
      pitch: mapInstance.getPitch(),
      bearing: mapInstance.getBearing(),
    };
    requestFollowFrame();
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

const refreshTags = async () => {
  tags.value = await loadTags();
};

const displayProjectTitle = (title) =>
  String(title || "")
    .replace(/^GeoLocator Data package:\s*/i, "")
    .trim();


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

// Open the full list when the field is clicked while closed (Headless UI only opens
// on typing or on its button, so the click is passed to the button), with the current
// name selected so typing replaces it. Enter with no highlighted option (it was
// filtered away) picks the first match. Clicking elsewhere only closes the list:
// Headless UI would pick the highlighted option on blur, so the input's capture-phase
// blur listener stops its handler; its outside-click handling still closes the list.
const openOptions = (open, button, event) => {
  if (!open) {
    searchQuery.value = "";
    button?.$el?.click();
    event?.target?.select();
  }
};

const pickFirstMatch = (event) => {
  if (!event.target.getAttribute("aria-activedescendant") && filteredTags.value.length) {
    selectedTag.value = filteredTags.value[0].tag_id;
  }
};

const filteredTags = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return tags.value;
  }
  return tags.value.filter((tag) => tagSearchText(tag).includes(query));
});

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
      syncThreeboxCamera();
      threebox.update();
    },
  });
  return threebox;
};

// Threebox's CameraSync rebuilds the camera's x/y from the map centre and zoom, and only
// takes z from Mapbox's real camera. With terrain on, Mapbox re-centres on the point where
// the view ray hits the (exaggerated) ground, so that rebuilt x/y drifts as the ground under
// the screen centre changes height. The path and bird then slide against the terrain by
// tens of pixels over mountains. Put the three.js camera exactly where Mapbox's camera is.
const syncThreeboxCamera = () => {
  if (!threebox || !mapInstance) {
    return;
  }
  const position = mapInstance.getFreeCameraOptions()?.position;
  if (!position) {
    return;
  }
  const lngLat = position.toLngLat();
  const altitude = position.toAltitude();
  if (!Number.isFinite(lngLat.lng) || !Number.isFinite(lngLat.lat) || !Number.isFinite(altitude)) {
    return;
  }
  const cameraInWorld = threebox
    .projectToWorld([lngLat.lng, lngLat.lat, altitude])
    .applyMatrix4(threebox.world.matrix);
  const elements = threebox.camera.matrixWorld.elements;
  elements[12] = cameraInWorld.x;
  elements[13] = cameraInWorld.y;
  elements[14] = cameraInWorld.z;
  threebox.camera.matrixWorldInverse.copy(threebox.camera.matrixWorld).invert();
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
  const lineCoords = timeline.map((entry) => [
    entry.lon,
    entry.lat,
    displayAltitude(entry.altitude),
  ]);
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

const applyMarkerRotation = (heading) => {
  if (!pressureMarker3d) {
    return;
  }
  if (pressureMarker3d.model) {
    pressureMarker3d.model.rotation.set(0, 0, THREE.MathUtils.degToRad(-heading + 180));
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
          mtl: `${import.meta.env.BASE_URL}models/empty.mtl`,
          units: "meters",
          scale: 50000,
          anchor: "center",
        },
        (model) => {
          pressureMarker3d = model;
          pressureMarkerLoading = false;
          threebox.add(pressureMarker3d);
          startPressureMarkerAnimation();
          pressureMarker3d.setCoords([point.lon, point.lat, markerAltitude(point)]);
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
    // Once following, followStep owns the bird's position so it moves together with the camera.
    if (!followState) {
      pressureMarker3d.setCoords([point.lon, point.lat, markerAltitude(point)]);
      applyMarkerRotation(getPressureBearing());
    }
  }
};

const markerAltitude = (point) =>
  followState ? followState.markerAlt : displayAltitude(point?.altitude);

const stopFollowLoop = () => {
  if (followRafId) {
    cancelAnimationFrame(followRafId);
    followRafId = null;
  }
};

// Bird view keeps its own animation loop so the smoothed camera keeps easing towards the
// bird while paused or after scrubbing the slider.
// During playback the playback tick calls followStep itself (see startPressurePlayback),
// so the bird and the camera always move in the same callback and can never be drawn
// out of step with each other.
const requestFollowFrame = () => {
  if (!mapInstance || !mapReady || !isCameraFollowEnabled.value || followRafId) {
    return;
  }
  followRafId = requestAnimationFrame(runFollowFrame);
};

const runFollowFrame = (now) => {
  followRafId = null;
  if (!mapInstance || !mapReady || !isCameraFollowEnabled.value) {
    return;
  }
  if (!isPressurePlaying.value) {
    followStep(now);
  }
  followRafId = requestAnimationFrame(runFollowFrame);
};

const followStep = (now) => {
  if (!mapInstance || !mapReady || !isCameraFollowEnabled.value) {
    return;
  }
  const point = getInterpolatedPressurePoint();
  if (!point || !Number.isFinite(point.lon) || !Number.isFinite(point.lat)) {
    return;
  }
  const targetAlt = displayAltitude(point.altitude);
  const heading = getPressureBearing();
  let dt = 0;
  if (!followState) {
    followState = {
      lon: point.lon,
      lat: point.lat,
      cameraAlt: targetAlt,
      markerAlt: targetAlt,
      floorAlt: null,
      ms: now,
    };
    smoothedBirdBearing = heading;
  } else {
    // Cap dt so a backgrounded tab resumes with a short glide instead of a snap.
    dt = Math.min(Math.max(0, now - followState.ms), 250);
    followState.ms = now;
    const aPos = smoothingAlpha(dt, CAMERA_POSITION_SMOOTH_MS);
    followState.lon = smoothAngle(followState.lon, point.lon, aPos);
    followState.lat = lerp(followState.lat, point.lat, aPos);
    followState.cameraAlt = lerp(
      followState.cameraAlt,
      targetAlt,
      smoothingAlpha(dt, CAMERA_ALTITUDE_SMOOTH_MS),
    );
    followState.markerAlt = lerp(
      followState.markerAlt,
      targetAlt,
      smoothingAlpha(dt, MARKER_ALTITUDE_SMOOTH_MS),
    );
    smoothedBirdBearing = smoothAngle(
      smoothedBirdBearing,
      heading,
      smoothingAlpha(dt, CAMERA_BEARING_SMOOTH_MS),
    );
  }

  if (pressureMarker3d) {
    pressureMarker3d.setCoords([point.lon, point.lat, followState.markerAlt]);
    applyMarkerRotation(heading);
  }
  if (!userCameraInteracting) {
    applyPendingBirdZoom(dt);
    applyFollowCamera(dt);
  }
};

// Zoom in bird view moves the camera along its line of sight to the bird (scaling the rig's
// offset, keeping its angles), so the bird stays put on screen. Mapbox's own zoom heads for
// the ground under the cursor, which is far below the (exaggerated) bird, and flies past it.
const applyPendingBirdZoom = (dt) => {
  if (!cameraRig || Math.abs(pendingBirdZoomLog) < 1e-4) {
    pendingBirdZoomLog = 0;
    return;
  }
  const step = pendingBirdZoomLog * smoothingAlpha(dt, BIRDVIEW_ZOOM_SMOOTH_MS);
  pendingBirdZoomLog -= step;
  const distance = Math.hypot(cameraRig.groundKm * 1000, cameraRig.heightM);
  const target = Math.min(
    BIRDVIEW_MAX_CAMERA_DISTANCE_M,
    Math.max(BIRDVIEW_MIN_CAMERA_DISTANCE_M, distance * Math.exp(step)),
  );
  if (!(distance > 0)) {
    return;
  }
  let factor = target / distance;
  // Do not zoom in below the terrain floor: the camera would only be backed off again.
  const floor = followState?.floorAlt;
  if (factor < 1 && Number.isFinite(floor) && cameraRig.heightM > 1 && followState) {
    const minFactor = (floor - followState.cameraAlt) / cameraRig.heightM;
    factor = Math.max(factor, Math.min(1, minFactor));
  }
  cameraRig.groundKm *= factor;
  cameraRig.heightM *= factor;
};

const zoomBirdView = (logFactor) => {
  if (!cameraRig) {
    cameraRig = defaultCameraRig();
  }
  pendingBirdZoomLog += logFactor;
  requestFollowFrame();
};

const onBirdViewWheel = (event) => {
  if (!isCameraFollowEnabled.value) {
    return;
  }
  event.preventDefault();
  const perUnit = event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 1 : 0.002;
  zoomBirdView(event.deltaY * perUnit);
};

// The bird-view camera is rigidly attached to the bird: its position is stored relative to
// the bird and its heading, and its pitch/bearing relative to that heading. Re-applying the
// rig reproduces exactly the view the user left after panning, rotating or zooming with the
// normal Mapbox controls (including a bird that is off-centre), so nothing snaps.
const defaultCameraRig = () => {
  const focusAlt = followState?.cameraAlt ?? 0;
  const heightM =
    Math.max(BIRDVIEW_MIN_ALTITUDE, focusAlt + BIRDVIEW_ALTITUDE_OFFSET) - focusAlt;
  const groundKm = BIRDVIEW_BEHIND_KM;
  return {
    relAzimuthDeg: 180,
    groundKm,
    heightM,
    // Looking straight at the bird from behind.
    pitchDeg: (Math.atan2(groundKm * 1000, heightM) * 180) / Math.PI,
    relBearingDeg: 0,
  };
};

const captureCameraRig = () => {
  if (!mapInstance || !followState) {
    return;
  }
  const position = mapInstance.getFreeCameraOptions()?.position;
  if (!position) {
    return;
  }
  const lngLat = position.toLngLat();
  const cameraPoint = { lon: lngLat.lng, lat: lngLat.lat };
  const heading = smoothedBirdBearing ?? 0;
  const rig = {
    relAzimuthDeg: normalizeAngle(bearingDegrees(followState, cameraPoint) - heading),
    groundKm: haversineKm(followState, cameraPoint),
    heightM: position.toAltitude() - followState.cameraAlt,
    pitchDeg: mapInstance.getPitch(),
    relBearingDeg: normalizeAngle(mapInstance.getBearing() - heading),
  };
  if (Object.values(rig).every(Number.isFinite)) {
    cameraRig = rig;
    lastAppliedCameraKey = "";
  }
};

const applyFollowCamera = (dt) => {
  if (typeof mapInstance.getFreeCameraOptions !== "function" || !followState) {
    return;
  }
  if (!cameraRig) {
    cameraRig = defaultCameraRig();
  }
  const focus = followState;
  const heading = smoothedBirdBearing ?? 0;
  const azimuth = normalizeAngle(heading + cameraRig.relAzimuthDeg);
  let cameraGround = destinationPoint(focus, azimuth, cameraRig.groundKm);
  let cameraAlt = Math.max(0, focus.cameraAlt + cameraRig.heightM);

  // Keep the camera above the exaggerated terrain under it. If it dips below, Mapbox
  // pushes it up on its own during the render and we push it back next frame, which
  // shakes. The floor rises quickly and relaxes slowly so DEM detail does not jitter it.
  const ground = mapInstance.queryTerrainElevation?.([cameraGround.lon, cameraGround.lat], {
    exaggerated: true,
  });
  if (Number.isFinite(ground)) {
    const target = ground + CAMERA_TERRAIN_CLEARANCE_M;
    if (focus.floorAlt == null) {
      focus.floorAlt = target;
    } else {
      const tau = target > focus.floorAlt ? CAMERA_FLOOR_RISE_MS : CAMERA_FLOOR_FALL_MS;
      focus.floorAlt = lerp(focus.floorAlt, target, smoothingAlpha(dt, tau));
    }
    if (cameraAlt < focus.floorAlt) {
      if (cameraRig.heightM > 1) {
        // Back the camera away from the bird along its line of sight rather than lifting it
        // straight up, so the bird keeps its place on screen (it just gets smaller).
        const scale = (focus.floorAlt - focus.cameraAlt) / cameraRig.heightM;
        cameraGround = destinationPoint(focus, azimuth, cameraRig.groundKm * scale);
        cameraAlt = focus.cameraAlt + cameraRig.heightM * scale;
      } else {
        cameraAlt = focus.floorAlt;
      }
    }
  }
  const bearing = normalizeAngle(heading + cameraRig.relBearingDeg);

  // Skip redundant camera updates once everything has settled (e.g. paused).
  const key = [cameraGround.lon, cameraGround.lat]
    .map((value) => value.toFixed(6))
    .concat([cameraAlt.toFixed(1), bearing.toFixed(4), cameraRig.pitchDeg.toFixed(4)])
    .join("|");
  if (key === lastAppliedCameraKey) {
    return;
  }
  lastAppliedCameraKey = key;

  const camera = mapInstance.getFreeCameraOptions();
  camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
    [cameraGround.lon, cameraGround.lat],
    cameraAlt,
  );
  camera.setPitchBearing(cameraRig.pitchDeg, bearing);
  mapInstance.setFreeCameraOptions(camera);
};

// While the user drives the camera with the normal Mapbox controls the follow loop leaves
// the camera alone; when the gesture (and its inertia) ends, the new view is captured into
// the rig. Dragging pauses playback and resumes it afterwards, as before.
let userCameraInteracting = false;
let cameraMovedDuringInteraction = false;
let wasPlayingBeforeInteraction = false;
let cameraHandlersBound = false;

const finishCameraInteraction = () => {
  if (!userCameraInteracting) {
    return;
  }
  userCameraInteracting = false;
  if (cameraMovedDuringInteraction && isCameraFollowEnabled.value) {
    captureCameraRig();
  }
  cameraMovedDuringInteraction = false;
  if (wasPlayingBeforeInteraction) {
    wasPlayingBeforeInteraction = false;
    startPressurePlayback();
  }
  requestFollowFrame();
};

// Playback is paused for the whole gesture (drag, wheel, buttons) so the bird does not fly
// out of view while the camera is held, and resumes when the gesture ends.
const beginCameraInteraction = () => {
  if (!userCameraInteracting) {
    wasPlayingBeforeInteraction = isPressurePlaying.value;
    if (wasPlayingBeforeInteraction) {
      stopPressurePlayback();
    }
  }
  userCameraInteracting = true;
};

const onCameraPointerDown = () => {
  if (!isCameraFollowEnabled.value) {
    return;
  }
  beginCameraInteraction();
  cameraMovedDuringInteraction = false;
};

const onCameraPointerUp = () => {
  // A click without movement ends here; a drag ends on moveend, after any inertia.
  if (userCameraInteracting && !cameraMovedDuringInteraction) {
    finishCameraInteraction();
  }
};

const onCameraMoveStart = (event) => {
  // Only user gestures (wheel, drag, navigation buttons) carry an originalEvent; the follow
  // loop's own setFreeCameraOptions calls do not.
  if (!isCameraFollowEnabled.value || !event?.originalEvent) {
    return;
  }
  beginCameraInteraction();
  cameraMovedDuringInteraction = true;
};

// In bird view the +/- buttons zoom towards the bird (see applyPendingBirdZoom) and the
// compass returns to the default view behind the bird instead of turning the map to north.
const onNavControlClick = (event) => {
  if (!isCameraFollowEnabled.value) {
    return;
  }
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }
  if (target.closest(".mapboxgl-ctrl-zoom-in")) {
    zoomBirdView(-Math.log(1.6));
  } else if (target.closest(".mapboxgl-ctrl-zoom-out")) {
    zoomBirdView(Math.log(1.6));
  } else if (target.closest(".mapboxgl-ctrl-compass")) {
    cameraRig = null;
    pendingBirdZoomLog = 0;
    lastAppliedCameraKey = "";
    requestFollowFrame();
  } else {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
};

const onCameraMoveEnd = () => {
  if (userCameraInteracting && cameraMovedDuringInteraction) {
    finishCameraInteraction();
  }
};

// At bird-view pitch a quick drag "throw" carries the camera hundreds of km past the bird,
// so pan momentum is switched off while following (rotate keeps its own). Mapbox's scroll
// and double-click zoom are replaced by zoomBirdView while following.
const setBirdViewControls = (birdView) => {
  if (!mapInstance) {
    return;
  }
  if (mapInstance.dragPan?.isEnabled()) {
    mapInstance.dragPan.enable(birdView ? { maxSpeed: 0 } : undefined);
  }
  ["scrollZoom", "doubleClickZoom"].forEach((name) => {
    if (birdView) {
      mapInstance[name]?.disable();
    } else {
      mapInstance[name]?.enable();
    }
  });
};

const bindCameraHandlers = () => {
  if (cameraHandlersBound || !mapInstance) {
    return;
  }
  mapInstance.on("mousedown", onCameraPointerDown);
  mapInstance.on("touchstart", onCameraPointerDown);
  mapInstance.on("mouseup", onCameraPointerUp);
  mapInstance.on("touchend", onCameraPointerUp);
  mapInstance.on("movestart", onCameraMoveStart);
  mapInstance.on("moveend", onCameraMoveEnd);
  mapInstance.getContainer().addEventListener("click", onNavControlClick, true);
  mapInstance.getCanvasContainer().addEventListener("wheel", onBirdViewWheel, { passive: false });
  window.addEventListener("mouseup", onCameraPointerUp);
  window.addEventListener("touchend", onCameraPointerUp, { passive: true });
  cameraHandlersBound = true;
};

const unbindCameraHandlers = () => {
  if (!cameraHandlersBound || !mapInstance) {
    return;
  }
  mapInstance.off("mousedown", onCameraPointerDown);
  mapInstance.off("touchstart", onCameraPointerDown);
  mapInstance.off("mouseup", onCameraPointerUp);
  mapInstance.off("touchend", onCameraPointerUp);
  mapInstance.off("movestart", onCameraMoveStart);
  mapInstance.off("moveend", onCameraMoveEnd);
  mapInstance.getContainer().removeEventListener("click", onNavControlClick, true);
  mapInstance.getCanvasContainer().removeEventListener("wheel", onBirdViewWheel);
  window.removeEventListener("mouseup", onCameraPointerUp);
  window.removeEventListener("touchend", onCameraPointerUp);
  cameraHandlersBound = false;
};

const cursorShape = () => {
  const x = plotX(currentPressurePoint.value);
  return {
    type: "line",
    xref: "x",
    yref: "paper",
    x0: x,
    x1: x,
    y0: 0,
    y1: 1,
    line: { color: PRESSURE_CURSOR_COLOR, width: 3 },
  };
};

const updatePlotCursor = () => {
  if (!plotContainer.value || !plotContainer.value._fullLayout) {
    return;
  }
  Plotly.relayout(plotContainer.value, {
    shapes: currentPressurePoint.value ? [cursorShape()] : [],
  });
};

const plotX = (entry) => (sliderMode.value === "distance" ? entry.distanceKm : entry.datetime);

// One filled trace for all nights, rather than layout shapes, which the cursor update
// would redraw on every frame. It sits on the hidden 0–1 axis "y" so it spans the plot
// height and is drawn under the data, which uses the overlaying axis "y2".
// Time mode only: most geolocator species fly at night, so against distance nearly the
// whole axis would be shaded.
const showNightShading = computed(
  () => sliderMode.value === "time" && hasPressurePath.value && nightIntervals.value.length > 0,
);

const buildNightTrace = (timeline, color) => {
  if (!showNightShading.value || timeline.length < 2) {
    return null;
  }
  const firstMs = timeline[0].ms;
  const lastMs = timeline[timeline.length - 1].ms;
  const x = [];
  const y = [];
  nightIntervals.value.forEach(([startMs, endMs]) => {
    if (endMs < firstMs || startMs > lastMs) {
      return;
    }
    const x0 = Math.max(startMs, firstMs);
    const x1 = Math.min(endMs, lastMs);
    if (x1 <= x0) {
      return;
    }
    x.push(x0, x0, x1, x1, x0, null);
    y.push(0, 1, 1, 0, 0, null);
  });
  if (!x.length) {
    return null;
  }
  return {
    x,
    y,
    type: "scatter",
    mode: "lines",
    fill: "toself",
    fillcolor: color,
    line: { width: 0 },
    hoverinfo: "skip",
    name: "Night",
  };
};

const updatePlot = () => {
  if (!plotContainer.value || !pressureData) {
    return;
  }
  const plotColors = PLOT_COLORS[theme.value] || PLOT_COLORS.dark;
  const metric = metrics.value.includes(selectedMetric.value)
    ? selectedMetric.value
    : metrics.value[0];
  const timeline = activeTimeline.value;
  if (!metric || !timeline.length) {
    Plotly.react(
      plotContainer.value,
      [],
      { autosize: true, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)" },
      { displayModeBar: false, responsive: true },
    );
    return;
  }

  const isDistance = sliderMode.value === "distance";
  const maxPoints = isMobile.value ? 6000 : 50000;
  const step = Math.max(1, Math.ceil(timeline.length / maxPoints));
  const xMin = plotX(timeline[0]);
  const xMax = plotX(timeline[timeline.length - 1]);
  const hasRange = isDistance
    ? Number.isFinite(Number(xMin)) && Number.isFinite(Number(xMax)) && xMin !== xMax
    : Boolean(xMin) && Boolean(xMax) && xMin !== xMax;
  const unit = metric === "altitude" ? " m" : metric === "surface_pressure" ? " hPa" : "";
  const traces = [];

  const nightTrace = buildNightTrace(timeline, plotColors.night);
  if (nightTrace) {
    traces.push(nightTrace);
  }

  // customdata holds the timeline index, so a click on the plot can seek to it.
  const baseX = [];
  const baseY = [];
  const baseIndex = [];
  const perStap = new Map();
  for (let i = 0; i < timeline.length; i += step) {
    const entry = timeline[i];
    const numeric = Number(entry.metrics?.[metric]);
    if (entry.metrics?.[metric] == null || !Number.isFinite(numeric)) {
      continue;
    }
    const xVal = plotX(entry);
    baseX.push(xVal);
    baseY.push(numeric);
    baseIndex.push(i);
    if (isDistance) {
      continue;
    }
    const stapNumeric = Number(entry.stapId);
    if (!Number.isFinite(stapNumeric) || !Number.isInteger(stapNumeric)) {
      continue;
    }
    const stapKey = String(entry.stapId);
    if (!stapColorMap.has(stapKey)) {
      continue;
    }
    const series = perStap.get(stapKey) || { x: [], y: [], index: [] };
    series.x.push(xVal);
    series.y.push(numeric);
    series.index.push(i);
    perStap.set(stapKey, series);
  }

  const hovertemplate = `%{y:.0f}${unit}<extra></extra>`;
  traces.push({
    x: baseX,
    y: baseY,
    customdata: baseIndex,
    yaxis: "y2",
    type: "scatter",
    mode: "lines",
    line: { color: plotColors.baseline, width: 1 },
    hovertemplate,
    name: formatMetricLabel(metric),
  });

  Array.from(perStap.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([stapId, series]) => {
      traces.push({
        x: series.x,
        y: series.y,
        customdata: series.index,
        yaxis: "y2",
        type: "scatter",
        mode: "lines",
        line: { color: stapColorMap.get(stapId), width: 2 },
        hovertemplate,
        name: `Stationary period ${stapId}`,
      });
    });

  if (isDistance) {
    const markerX = [];
    const markerY = [];
    const markerColor = [];
    const markerSize = [];
    const markerIndex = [];
    stapList.forEach((stap) => {
      const idx = findClosestIndex(timeline, stap.startTime, "ms");
      const entry = timeline[idx];
      const numeric = Number(entry?.metrics?.[metric]);
      if (!Number.isFinite(numeric)) {
        return;
      }
      markerX.push(entry.distanceKm);
      markerY.push(numeric);
      markerIndex.push(idx);
      markerColor.push(stapColorMap.get(stap.stapId) || "#f8fafc");
      markerSize.push(Math.min(14, 4 + Math.sqrt(Math.max(stap.duration, 0)) * 1.2));
    });
    if (markerX.length) {
      traces.push({
        x: markerX,
        y: markerY,
        customdata: markerIndex,
        yaxis: "y2",
        type: "scatter",
        mode: "markers",
        marker: {
          color: markerColor,
          size: markerSize,
          line: { color: "rgba(0,0,0,0.4)", width: 1 },
          opacity: 0.9,
        },
        hovertemplate,
        name: "Stationary periods",
      });
    }
  }

  const layout = {
    height: plotContainer.value.clientHeight || undefined,
    autosize: true,
    margin: { l: 8, r: 12, t: 8, b: 24 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: plotColors.text, family: "Sora" },
    hoverlabel: { font: { color: plotColors.text } },
    hovermode: "x",
    modebar: { bgcolor: "rgba(0,0,0,0)", color: plotColors.baseline, activecolor: plotColors.text },
    showlegend: false,
    shapes: currentPressurePoint.value ? [cursorShape()] : [],
    xaxis: {
      type: isDistance ? "linear" : "date",
      gridcolor: plotColors.grid,
      tickfont: { size: 10 },
      ticksuffix: isDistance ? " km" : "",
      autorange: !hasRange,
      range: hasRange ? [xMin, xMax] : undefined,
      automargin: true,
    },
    yaxis: {
      range: [0, 1],
      visible: false,
      fixedrange: true,
    },
    yaxis2: {
      overlaying: "y",
      side: "left",
      // Overlaying axes default to ticks synced with the hidden 0–1 axis.
      tickmode: "auto",
      gridcolor: plotColors.grid,
      tickfont: { size: 10 },
      automargin: true,
    },
    dragmode: "zoom",
    editable: false,
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

  bindPlotHandlers();
};

const seekToIndex = (index) => {
  const timeline = activeTimeline.value;
  if (!timeline.length || !Number.isFinite(index)) {
    return;
  }
  const clamped = Math.min(Math.max(Math.round(index), 0), timeline.length - 1);
  stopPressurePlayback();
  if (clamped === currentPressureIndex.value) {
    return;
  }
  currentPressureIndex.value = clamped;
};

const bindPlotHandlers = () => {
  const element = plotContainer.value;
  if (!element?.on || plotHandlersBoundTo === element) {
    return;
  }
  plotHandlersBoundTo = element;
  // Dragging the red cursor line.
  element.on("plotly_relayout", (event) => {
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
    seekToIndex(index);
  });
  // Clicking anywhere on the plot (hovermode "x" picks the nearest sample).
  element.on("plotly_click", (event) => {
    const point = event?.points?.find((p) => Number.isFinite(Number(p.customdata)));
    if (point) {
      seekToIndex(Number(point.customdata));
    }
  });
};

const onPlotKeydown = (event) => {
  const length = activeTimeline.value.length;
  if (!length) {
    return;
  }
  const smallStep = Math.max(1, Math.round(length / 200));
  const bigStep = Math.max(1, Math.round(length / 20));
  const current = currentPressureIndex.value;
  const moves = {
    ArrowRight: current + smallStep,
    ArrowUp: current + smallStep,
    ArrowLeft: current - smallStep,
    ArrowDown: current - smallStep,
    PageUp: current + bigStep,
    PageDown: current - bigStep,
    Home: 0,
    End: length - 1,
  };
  if (event.key in moves) {
    event.preventDefault();
    seekToIndex(event.shiftKey && event.key.startsWith("Arrow") ? current + Math.sign(moves[event.key] - current) * bigStep : moves[event.key]);
  } else if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    togglePressurePlayback();
  }
};

const updateMap = () => {
  if (!mapInstance || !mapReady) {
    return;
  }
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

    const lineCoords = timeline.map((entry) => [
      entry.lon,
      entry.lat,
      displayAltitude(entry.altitude),
    ]);

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
    const lon = toNumber(row?.lon);
    const lat = toNumber(row?.lat);
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
    .map((row) => [toNumber(row.lon), toNumber(row.lat)])
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  const simulationByStap = new Map();
  simulationRows.forEach((row) => {
    const stapId = row?.stap_id;
    const lon = toNumber(row?.lon);
    const lat = toNumber(row?.lat);
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
      const lon = toNumber(obs?.longitude);
      const lat = toNumber(obs?.latitude);
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
  const isStale = () => selectedTag.value !== tagId;
  try {
    // Small files first so the map and details show right away; the pressure path
    // (the largest file by far) follows and then replaces the coarse fallback timeline.
    const data = await loadTagData(tagId, { includePressurePath: false });
    if (isStale()) {
      return;
    }
    tagData.value = data;
    pressureData = null;
    hasPressurePath.value = false;
    isPressureLoading.value = !("pressurepath" in data);
    applyTimelines();

    let rawPressure = data.pressurepath;
    if (isPressureLoading.value) {
      rawPressure = await loadTagPressurePath(tagId).catch((error) => {
        console.warn("Pressure path not available:", error);
        return null;
      });
      if (isStale()) {
        return;
      }
      isPressureLoading.value = false;
    }
    pressureData = normalizePressureData(rawPressure);
    if (pressureData) {
      stopPressurePlayback();
      hasPressurePath.value = true;
      applyTimelines();
    }
  } catch (error) {
    if (isStale()) {
      return;
    }
    console.error("Failed to load tag data:", error);
    tagData.value = null;
    pressureData = null;
    isPressureLoading.value = false;
    timeTimeline.value = [];
    distanceTimeline.value = [];
    metrics.value = [];
    selectedMetric.value = "";
    hasPressurePath.value = false;
    updateMap();
  }
};

// Builds the timelines from the pressure path when loaded, otherwise from the stopovers
// and paths, then redraws and (re)starts playback from the beginning.
const applyTimelines = () => {
  nightIntervals.value = buildNightIntervals(pressureData?.twilight);
  if (pressureData) {
    timeTimeline.value = buildTimeTimeline(pressureData);
    distanceTimeline.value = buildDistanceTimeline(timeTimeline.value);
    const availableMetrics = buildMetrics(pressureData?.values || {});
    metrics.value = availableMetrics;
    selectedMetric.value = availableMetrics.includes("altitude")
      ? "altitude"
      : availableMetrics[0] || "";
  } else {
    const fallbackTimelines = buildFallbackTimelines(tagData.value?.paths, tagData.value?.staps, {
      timeStepDays: FALLBACK_TIME_STEP_DAYS,
      distanceMinStepKm: FALLBACK_DISTANCE_MIN_STEP_KM,
      distanceTargetPoints: FALLBACK_DISTANCE_TARGET_POINTS,
    });
    timeTimeline.value = fallbackTimelines.timeTimeline;
    distanceTimeline.value = fallbackTimelines.distanceTimeline;
    metrics.value = [];
    selectedMetric.value = "";
  }
  currentPressureIndex.value = 0;
  updateMap();
  updatePlot();
  if (canPlayPressure.value) {
    startPressurePlayback();
  } else {
    isPressurePlaying.value = false;
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
  }
});

watch(selectedMetric, () => {
  updatePlot();
});

watch(hasPressurePath, (hasData) => {
  if (hasData) {
    nextTick(() => {
      updatePlot();
      updatePlotCursor();
    });
    return;
  }
  if (plotContainer.value) {
    Plotly.purge(plotContainer.value);
  }
  if (isCameraFollowEnabled.value) {
    isCameraFollowEnabled.value = false;
  }
});

watch(currentPressureIndex, () => {
  updatePressureMarker();
  updatePlotCursor();
  requestFollowFrame();
});

watch(theme, () => {
  updatePlot();
  updatePlotCursor();
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
  requestFollowFrame();
});

onMounted(async () => {
  await refreshTags();
  const initialTag = route.params.tagId ? String(route.params.tagId) : tags.value[0]?.tag_id;
  selectedTag.value = initialTag;

  privateDatapackagesChangedHandler = async () => {
    const current = selectedTag.value;
    await refreshTags();
    if (current && tags.value.some((tag) => tag.tag_id === current)) {
      await fetchTagData(current);
    }
  };
  window.addEventListener(PRIVATE_DATAPACKAGES_CHANGED_EVENT, privateDatapackagesChangedHandler);

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
    isMapLoading.value = false;
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
    bindCameraHandlers();
    applyBirdViewState(isCameraFollowEnabled.value);
    if (isCameraFollowEnabled.value) {
      // Bird view was switched on before the map finished loading.
      setBirdViewControls(true);
      requestFollowFrame();
    }
    if (selectedTag.value) {
      fetchTagData(selectedTag.value);
    }
    requestAnimationFrame(() => {
      mapInstance.resize();
    });
  });

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
    if (plotWrapper.value) {
      resizeObserver.observe(plotWrapper.value);
    }
  }
});

onBeforeUnmount(() => {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (privateDatapackagesChangedHandler) {
    window.removeEventListener(
      PRIVATE_DATAPACKAGES_CHANGED_EVENT,
      privateDatapackagesChangedHandler,
    );
  }
  stopPressurePlayback();
  stopFollowLoop();
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
    unbindCameraHandlers();
    mapInstance.remove();
  }
});
</script>

<style scoped>
:deep(.mapboxgl-ctrl-scale) {
  background: var(--panel);
  border: 1px solid color-mix(in srgb, var(--fg) 20%, transparent);
  border-top: none;
  color: var(--cream);
}

.timeline-select {
  height: 2.25rem;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--fg) 15%, transparent);
  background: color-mix(in srgb, var(--fg) 5%, transparent);
  padding: 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--fg) 85%, transparent);
}

.timeline-select option {
  background: var(--ink);
  color: var(--fg);
}

:deep(.plotly .hoverlayer .hovertext rect) {
  fill: var(--popup) !important;
  stroke: color-mix(in srgb, var(--fg) 15%, transparent) !important;
}
</style>
