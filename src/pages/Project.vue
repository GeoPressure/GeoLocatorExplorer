<template>
  <section class="min-h-screen w-full bg-[color:var(--ink)] px-6 pb-6 pt-24">
    <div
      class="grid grid-cols-1 gap-6 lg:h-[calc(100vh-7.5rem)] lg:grid-cols-[minmax(360px,500px)_minmax(0,1fr)]"
    >
      <div class="panel order-2 h-auto overflow-visible lg:order-1 lg:h-full lg:overflow-y-auto">
        <div>
          <label class="text-xs uppercase tracking-[0.2em] text-white/60">Select Project</label>
          <Combobox
            v-model="selectedId"
            as="div"
            class="relative mt-2"
            @update:modelValue="updateProject"
          >
            <div class="relative">
              <ComboboxInput
                class="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-10 text-sm text-white placeholder:text-white/40"
                :displayValue="comboboxDisplayValue"
                @change="searchQuery = $event.target.value"
                @input="searchQuery = $event.target.value"
                @focus="openProjectPicker"
                @click="openProjectPicker"
                @keydown.escape="isSearching = false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                placeholder="Search title, species, author, keyword"
              />
              <ComboboxButton
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50"
                @click="openProjectPicker"
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
            <ComboboxOptions
              static
              v-show="isSearching"
              class="absolute z-10 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-white/10 bg-[color:var(--slate)] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
            >
              <div v-if="!filteredProjects.length" class="px-3 py-2 text-xs text-white/50">
                No projects found
              </div>
              <ComboboxOption
                v-for="project in filteredProjects"
                :key="projectKey(project)"
                :value="projectKey(project)"
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
                    {{ displayProjectTitle(project.title) }}
                  </p>
                  <p
                    v-if="projectSubtitle(project)"
                    class="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/50"
                  >
                    {{ projectSubtitle(project) }}
                  </p>
                </div>
              </ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        </div>

        <div v-if="selectedProject" class="mt-6 space-y-4">
          <div>
            <h2 class="font-display text-2xl">
              {{ displayProjectTitle(selectedProject.title) }}
            </h2>
          </div>

          <div v-if="contributors.length" class="space-y-2 text-sm text-white/70">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="contributor in contributors"
                :key="contributor.name + contributor.orcid"
                class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                <span>{{ contributor.name }}</span>
                <a
                  v-if="contributor.orcid"
                  :href="contributor.orcid"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img src="/ORCID_iD.svg" alt="ORCID" class="h-4 w-4" />
                </a>
              </span>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="text-[10px] uppercase tracking-[0.3em] text-white/50">Total Tags</p>
                <p class="mt-1 font-display text-4xl text-white sm:text-5xl">{{ totalTags }}</p>
              </div>
            </div>

            <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <p class="text-[10px] uppercase tracking-[0.25em] text-white/50">Sensors</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span
                    v-for="entry in sensorEntries"
                    :key="entry.key"
                    class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      class="h-4 w-4"
                      :style="{ color: entry.color }"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      v-html="entry.icon"
                    ></svg>
                    {{ entry.label }}
                    <span class="text-white">{{ entry.value }}</span>
                  </span>
                </div>
              </div>

              <div class="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <p class="text-[10px] uppercase tracking-[0.25em] text-white/50">Outputs</p>
                <div class="mt-2 grid grid-cols-1 gap-2 text-xs">
                  <div
                    v-for="entry in trackEntries"
                    :key="entry.key"
                    class="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                  >
                    <div
                      class="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/60"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        class="h-4 w-4"
                        :style="{ color: entry.color }"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        v-html="entry.icon"
                      ></svg>
                      {{ entry.label }}
                    </div>
                    <span class="font-display text-base text-white">{{ entry.value }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="selectedProject.description"
            class="project-description rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
          >
            <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Description</p>
            <div class="mt-2" v-html="selectedProject.description"></div>
          </div>

          <div class="flex flex-wrap gap-2">
            <span
              v-for="taxon in displayTaxa"
              :key="taxon.key"
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.1em] text-white/70"
            >
              <a
                v-if="taxon.speciesCode"
                :href="`https://ebird.org/species/${taxon.speciesCode}`"
                target="_blank"
                rel="noreferrer"
                class="rounded-full bg-white/20 p-1"
                aria-label="Open eBird species page"
              >
                <img src="/ebird.svg" alt="eBird" class="h-3 w-3" />
              </a>
              <span>{{ taxon.label }}</span>
            </span>
          </div>

          <div v-if="selectedProject.temporal?.start" class="grid gap-2 text-sm text-white/70">
            <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Timeline</p>
            <p>{{ selectedProject.temporal.start }} → {{ selectedProject.temporal.end }}</p>
          </div>

          <div v-if="selectedProject.keywords?.length" class="text-xs text-white/60">
            <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Keywords</p>
            <span class="mt-2 inline-block">{{ keywordsList }}</span>
            <span v-if="keywordsOverflow" class="ml-2 text-white/40"
              >+{{ keywordsOverflow }} more</span
            >
          </div>

          <div v-if="relatedIdentifiers.length" class="text-xs text-white/70">
            <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Related Identifiers</p>
            <ul class="mt-3 space-y-2">
              <li v-for="item in relatedIdentifiers" :key="item.identifier + item.relationType">
                <span class="text-white/50">{{ item.relationType || "Related" }}: </span>
                <span class="text-white/50"> </span>
                <a
                  v-if="item.identifierType === 'doi'"
                  :href="`https://doi.org/${item.identifier}`"
                  target="_blank"
                  rel="noreferrer"
                  class="text-[color:var(--teal)] hover:text-white"
                >
                  {{ item.identifier }}
                </a>
                <a
                  v-else-if="item.identifierType === 'url'"
                  :href="item.identifier"
                  target="_blank"
                  rel="noreferrer"
                  class="text-[color:var(--teal)] hover:text-white"
                >
                  {{ item.identifier }}
                </a>
                <span v-else>{{ item.identifier }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <a
              v-if="repositoryUrl"
              :href="repositoryUrl"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path
                  d="M12 .5C5.73.5.5 5.86.5 12.4c0 5.22 3.44 9.66 8.2 11.23.6.12.82-.27.82-.6 0-.3-.01-1.1-.02-2.15-3.34.75-4.04-1.66-4.04-1.66-.55-1.44-1.33-1.82-1.33-1.82-1.09-.77.08-.75.08-.75 1.2.09 1.84 1.28 1.84 1.28 1.08 1.9 2.83 1.35 3.52 1.03.11-.8.42-1.35.76-1.66-2.66-.31-5.46-1.38-5.46-6.15 0-1.36.46-2.47 1.22-3.34-.12-.31-.53-1.58.12-3.29 0 0 1-.33 3.3 1.28a11.1 11.1 0 0 1 6 0c2.3-1.61 3.3-1.28 3.3-1.28.65 1.71.24 2.98.12 3.29.76.87 1.22 1.98 1.22 3.34 0 4.78-2.8 5.83-5.47 6.14.43.38.81 1.12.81 2.26 0 1.63-.02 2.94-.02 3.34 0 .33.22.72.83.6 4.76-1.57 8.2-6.01 8.2-11.23C23.5 5.86 18.27.5 12 .5z"
                />
              </svg>
              <span>{{ repositoryLabel }}</span>
            </a>

            <a
              v-if="selectedProject.concept_doi"
              :href="selectedProject.concept_doi"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <span class="rounded-full bg-white/20 px-2 py-0.5 text-[9px] text-white/70">DOI</span>
              <span class="font-semibold">10.5281/zenodo.{{ selectedProject.concept_id }}</span>
            </a>
          </div>

          <div
            v-if="citationText"
            class="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">Citation</p>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60 transition hover:border-white/30 hover:text-white"
                :disabled="!citationText"
                @click="copyCitation"
                aria-label="Copy citation"
              >
                <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor">
                  <path
                    d="M8 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ citationCopied ? "Copied" : "Copy" }}</span>
              </button>
            </div>
            <p class="mt-3 text-[11px] text-white/70">{{ citationText }}</p>
          </div>

          <div
            v-if="footerMeta.length"
            class="flex whitespace-nowrap gap-3 overflow-x-auto text-[10px] uppercase tracking-[0.2em] text-white/40"
          >
            <template v-for="(item, index) in footerMeta" :key="item.label">
              <span v-if="index > 0">·</span>
              <span>
                <a
                  v-if="item.href"
                  :href="item.href"
                  target="_blank"
                  rel="noreferrer"
                  class="hover:text-white"
                >
                  {{ item.label }} {{ item.value }}
                </a>
                <span v-else>{{ item.label }} {{ item.value }}</span>
              </span>
            </template>
          </div>
        </div>
      </div>

      <div
        class="relative order-1 h-[60vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--slate)] lg:order-2 lg:h-full"
      >
        <div ref="mapContainer" class="h-full w-full"></div>
        <div
          class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
        ></div>
        <div
          v-if="embargoNotice"
          class="absolute inset-0 flex items-center justify-center bg-black/60 text-center"
        >
          <div class="rounded-2xl border border-white/10 bg-black/50 px-6 py-4">
            <p class="text-xs uppercase tracking-[0.3em] text-white/50">Project Data</p>
            <p class="mt-2 font-display text-lg text-white">
              Under Embargo until {{ embargoNotice }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import mapboxgl from "mapbox-gl";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/vue";
import { loadProjectData, loadProjects } from "../lib/data";
import { colorForIndex, formatShortDate, normalizeKeywords, projectSlug, sexSymbol } from "../lib/format";
import { MAPBOX_TOKEN } from "../lib/config";
import { buildTagPopupHtml } from "../lib/popup";
import { createSidePopup } from "../lib/mapbox";

const route = useRoute();
const router = useRouter();
const mapContainer = ref(null);
const projects = ref([]);
const selectedId = ref("");
const searchQuery = ref("");
const isSearching = ref(false);
const citationCopied = ref(false);
let citationCopyTimer;

let mapInstance;
let mapReady = false;
const emptyProjectData = () => ({ tags: [], known_locations: [] });
const projectData = ref(emptyProjectData());
let hoverPopup;
let locationPopup;
let hoverTagId = null;
let pinnedTagId = null;
let hoverHandlersBound = false;
let locationHandlersBound = false;
let stapHandlersBound = false;
let hoverShowTimer;
let hoverHideTimer;
let tagInfoMap = new Map();

const baseUrl = import.meta.env.BASE_URL || "/";

const projectKey = (project) => project.id || project.concept_id || project.title;

const normalizeProjectData = (data) =>
  Array.isArray(data) ? { tags: data, known_locations: [] } : data || emptyProjectData();

const selectedProject = computed(() =>
  projects.value.find((project) => projectKey(project) === selectedId.value),
);

const projectSlugIndex = computed(
  () =>
    new Map(
      projects.value
        .map((project) => projectKey(project))
        .filter(Boolean)
        .map((id) => [projectSlug(id), id]),
    ),
);

const projectDisplayValue = (value) => {
  if (!value) {
    return "";
  }
  const project = projects.value.find((item) => projectKey(item) === value);
  return displayProjectTitle(project?.title);
};

const comboboxDisplayValue = () =>
  isSearching.value ? searchQuery.value : projectDisplayValue(selectedId.value);

const projectTaxaNames = (project) => {
  const taxa = project.taxonomic || [];
  return taxa
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }
      return entry.common_name || entry.scientific_name || "";
    })
    .filter(Boolean);
};

const projectContributorNames = (project) =>
  (project.contributors || [])
    .map(
      (person) => person.title || [person.givenName, person.familyName].filter(Boolean).join(" "),
    )
    .filter(Boolean);

const displayProjectTitle = (title) =>
  String(title || "")
    .replace(/^GeoLocator Data package:\s*/i, "")
    .trim();

const projectSearchText = (project) => {
  const title = displayProjectTitle(project.title || "");
  const taxa = projectTaxaNames(project).join(" ");
  const contributors = projectContributorNames(project).join(" ");
  return `${title} ${taxa} ${contributors}`.toLowerCase();
};

const projectSubtitle = (project) => {
  const taxa = projectTaxaNames(project);
  const contributors = projectContributorNames(project);
  const parts = [];
  if (taxa.length) {
    const taxaPreview = taxa.slice(0, 2).join(" · ");
    const suffix = taxa.length > 2 ? ` +${taxa.length - 2}` : "";
    parts.push(`${taxaPreview}${suffix}`);
  }
  if (contributors.length) {
    const peoplePreview = contributors.slice(0, 2).join(", ");
    const suffix = contributors.length > 2 ? ` +${contributors.length - 2}` : "";
    parts.push(`${peoplePreview}${suffix}`);
  }
  const keywords = normalizeKeywords(project.keywords);
  if (keywords.length) {
    parts.push(keywords.slice(0, 2).join(", "));
  }
  return parts.join(" • ");
};

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return projects.value;
  }
  return projects.value.filter((project) => projectSearchText(project).includes(query));
});

const displayTaxa = computed(() => {
  const taxa = selectedProject.value?.taxonomic || [];
  return taxa
    .map((entry) => {
      if (typeof entry === "string") {
        return { key: entry, label: entry, speciesCode: "" };
      }
      const label = entry.common_name || entry.scientific_name || "";
      return {
        key: entry.species_code || label,
        label,
        speciesCode: entry.species_code || "",
      };
    })
    .filter((entry) => entry.label);
});

const normalizedKeywords = computed(() => normalizeKeywords(selectedProject.value?.keywords));
const keywordsList = computed(() => normalizedKeywords.value.slice(0, 6).join(", "));
const keywordsOverflow = computed(() => Math.max(normalizedKeywords.value.length - 6, 0));

const hasProjectMapData = computed(() => {
  const flag = selectedProject.value?.has_project_data;
  return flag === false ? false : flag === true || projectTags.value.length > 0;
});

const embargoNotice = computed(() => {
  const embargo = selectedProject.value?.embargo;
  if (!embargo || hasProjectMapData.value) {
    return "";
  }
  return new Date(embargo).getTime() > Date.now() ? formatShortDate(embargo) : "";
});

const footerMeta = computed(() => {
  const meta = [];
  if (selectedProject.value?.created) {
    meta.push({ label: "Created", value: formatShortDate(selectedProject.value.created) });
  }
  if (selectedProject.value?.version) {
    meta.push({ label: "Version", value: selectedProject.value.version });
  }
  licenseItems.value.forEach((license) => {
    if (license.name) {
      meta.push({
        label: "License",
        value: license.name,
        href: license.path || "",
      });
    }
  });
  return meta;
});

const toCount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const projectCounts = computed(
  () => selectedProject.value?.counts || selectedProject.value?.numberTags || {},
);
const totalTags = computed(() => toCount(projectCounts.value.tags));

const sensorEntries = computed(() => {
  const counts = projectCounts.value;
  const config = [
    {
      key: "light",
      label: "Light",
      color: "var(--ember)",
      icon: '<circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M4.5 19.5l2-2" />',
    },
    {
      key: "activity",
      label: "Activity",
      color: "var(--teal)",
      icon: '<path d="M3 12h4l2-5 4 10 2-5h4" />',
    },
    {
      key: "pressure",
      label: "Pressure",
      color: "var(--accent)",
      icon: '<circle cx="12" cy="12" r="7" /><path d="M12 12l4-2" />',
    },
    {
      key: "temperature_external",
      label: "Temp Ext",
      color: "var(--ember)",
      icon: '<path d="M14 14a4 4 0 1 1-4-4V4a2 2 0 1 1 4 0v6" />',
    },
    {
      key: "temperature_internal",
      label: "Temp Int",
      color: "var(--ember)",
      icon: '<path d="M14 14a4 4 0 1 1-4-4V4a2 2 0 1 1 4 0v6" /><circle cx="12" cy="16" r="1.5" />',
    },
    {
      key: "magnetic",
      label: "Magnetic",
      color: "var(--accent)",
      icon: '<path d="M7 3v6a5 5 0 0 0 10 0V3" /><path d="M7 9h10" />',
    },
    {
      key: "wet_count",
      label: "Wet Count",
      color: "var(--teal)",
      icon: '<path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" />',
    },
    {
      key: "conductivity",
      label: "Conductivity",
      color: "var(--accent)",
      icon: '<path d="M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />',
    },
    {
      key: "measurements",
      label: "Measurements",
      color: "var(--accent)",
      icon: '<path d="M4 18V8M10 18V4M16 18v-6M20 18v-10" />',
    },
  ];

  return config
    .map((entry) => ({
      ...entry,
      value: toCount(counts[entry.key]),
    }))
    .filter((entry) => entry.key !== "measurements" && entry.value > 0);
});

const trackEntries = computed(() => {
  const counts = projectCounts.value;
  const config = [
    {
      key: "paths",
      label: "Paths",
      color: "var(--teal)",
      icon: '<path d="M4 18c3-6 7-8 12-12" /><circle cx="6" cy="16" r="1.5" /><circle cx="18" cy="6" r="1.5" />',
    },
    {
      key: "pressure",
      label: "Pressure Paths",
      color: "var(--accent)",
      icon: '<circle cx="12" cy="12" r="7" /><path d="M12 12l4-2" />',
    },
  ];

  return config
    .map((entry) => ({
      ...entry,
      value: toCount(counts[entry.key]),
    }))
    .filter((entry) => entry.value > 0);
});

const citationText = computed(() => {
  const raw = selectedProject.value?.bibliographicCitation || "";
  return String(raw || "").trim();
});

const copyCitation = async () => {
  if (!citationText.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(citationText.value);
    citationCopied.value = true;
    if (citationCopyTimer) {
      clearTimeout(citationCopyTimer);
    }
    citationCopyTimer = setTimeout(() => {
      citationCopied.value = false;
      citationCopyTimer = null;
    }, 1600);
  } catch (error) {
    console.error("Failed to copy citation:", error);
  }
};

const licenseItems = computed(() =>
  (selectedProject.value?.licenses || []).map((license) => ({
    name: license.name || license.title || "License",
    title: license.title || license.name || "",
    path: license.path || "",
  })),
);

const contributors = computed(() =>
  (selectedProject.value?.contributors || []).map((person) => ({
    name:
      person.title || [person.givenName, person.familyName].filter(Boolean).join(" ") || "Unknown",
    orcid: person.path || "",
    role: person.roles || "",
    organization: person.organization || "",
  })),
);

const relatedIdentifiers = computed(() =>
  (selectedProject.value?.relatedIdentifiers || []).map((item) => ({
    relationType: item.relationType || "",
    identifier: item.relatedIdentifier || "",
    identifierType: item.relatedIdentifierType || "",
  })),
);
const repositoryUrl = computed(() => selectedProject.value?.repository || "");
const repositoryLabel = computed(() => {
  if (!repositoryUrl.value) {
    return "";
  }
  try {
    const parsed = new URL(repositoryUrl.value);
    if (parsed.hostname.includes("github.com")) {
      const parts = parsed.pathname
        .replace(/\.git$/, "")
        .split("/")
        .filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
    }
    return parsed.hostname + parsed.pathname.replace(/\.git$/, "");
  } catch {
    return repositoryUrl.value.replace(/\.git$/, "");
  }
});
const projectTags = computed(() => projectData.value.tags);
const projectKnownLocations = computed(() => projectData.value.known_locations);
const projectTagIds = computed(() => projectTags.value.map((entry) => entry.tag_id));

const updateProjectData = async () => {
  const currentId = selectedId.value;
  if (!currentId || selectedProject.value?.has_project_data === false) {
    projectData.value = emptyProjectData();
    tagInfoMap = new Map();
    clearMapData();
    return;
  }
  try {
    const data = await loadProjectData(currentId);
    projectData.value = normalizeProjectData(data);
    const metaEntries = projectData.value.tags.map((tag) => [
      tag.tag_id,
      {
        commonName: tag.common_name || "",
        species: tag.scientific_name || "",
        sexSymbol: sexSymbol(tag.sex),
        ageClass: tag.age_class || "",
        wingLength: tag.wing_length || "",
      },
    ]);
    tagInfoMap = new Map(metaEntries);
    if (mapReady) {
      updateMap();
    }
  } catch (error) {
    console.error("Failed to load project data:", error);
    projectData.value = emptyProjectData();
    tagInfoMap = new Map();
    clearMapData();
  }
};

const openProjectPicker = () => {
  isSearching.value = true;
  searchQuery.value = "";
};

const resolveProjectId = (value) => {
  const text = String(value || "");
  return projectSlugIndex.value.get(text) || text;
};

function clearMapData() {
  if (!mapInstance || !mapReady) {
    return;
  }
  const emptyCollection = { type: "FeatureCollection", features: [] };
  const pathsSource = mapInstance.getSource("project-paths");
  if (pathsSource) {
    pathsSource.setData(emptyCollection);
  }
  const stapsSource = mapInstance.getSource("project-staps");
  if (stapsSource) {
    stapsSource.setData(emptyCollection);
  }
  const locationSource = mapInstance.getSource("project-locations");
  if (locationSource) {
    locationSource.setData(emptyCollection);
  }
  clearTagHover({ force: true });
  if (locationPopup) {
    locationPopup.remove();
    locationPopup = null;
  }
  tagInfoMap = new Map();
}

const setHighlightTag = (tagId) => {
  if (!mapInstance?.getLayer("project-paths-line")) {
    return;
  }
  if (mapInstance.getLayer("project-paths-highlight")) {
    mapInstance.setFilter("project-paths-highlight", ["==", ["get", "tagId"], tagId || ""]);
  }
  if (mapInstance.getLayer("project-staps-highlight")) {
    mapInstance.setFilter("project-staps-highlight", ["==", ["get", "tagId"], tagId || ""]);
  }
  mapInstance.setPaintProperty("project-paths-line", "line-opacity", tagId ? 0.2 : 0.6);
  if (mapInstance.getLayer("project-staps-circles")) {
    mapInstance.setPaintProperty("project-staps-circles", "circle-opacity", tagId ? 0.25 : 0.6);
  }
  if (tagId) {
    if (mapInstance.getLayer("project-paths-highlight")) {
      mapInstance.moveLayer("project-paths-highlight");
    }
    if (mapInstance.getLayer("project-staps-highlight")) {
      mapInstance.moveLayer("project-staps-highlight");
    }
  }
};

const setTagHover = (tagId, lngLat, { lock = false } = {}) => {
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
  setHighlightTag(tagId);
  const meta = tagInfoMap.get(tagId) || {};
  const tagLink = `${baseUrl}tag/${encodeURIComponent(tagId)}`;
  const projectId = projectKey(selectedProject.value || {});
  const projectTitle = selectedProject.value?.title || "";
  const projectLink = "";
  const html = buildTagPopupHtml({
    species: meta.commonName || meta.species || "Unknown species",
    tagId,
    tagLink,
    projectTitle,
    projectLink,
  });
  hoverPopup = createSidePopup(mapInstance, lngLat, html, hoverPopup);
};

const clearTagHover = ({ force = false } = {}) => {
  if (pinnedTagId && !force) {
    return;
  }
  pinnedTagId = null;
  hoverTagId = null;
  setHighlightTag(null);
  if (hoverPopup) {
    hoverPopup.remove();
    hoverPopup = null;
  }
};

const scheduleHoverShow = (tagId, lngLat, { lock = false } = {}) => {
  if (hoverHideTimer) {
    clearTimeout(hoverHideTimer);
    hoverHideTimer = null;
  }
  if (hoverShowTimer) {
    clearTimeout(hoverShowTimer);
  }
  hoverShowTimer = setTimeout(() => {
    setTagHover(tagId, lngLat, { lock });
    hoverShowTimer = null;
  }, 80);
};

const scheduleHoverHide = () => {
  if (hoverShowTimer) {
    clearTimeout(hoverShowTimer);
    hoverShowTimer = null;
  }
  if (hoverHideTimer) {
    clearTimeout(hoverHideTimer);
  }
  hoverHideTimer = setTimeout(() => {
    clearTagHover();
    hoverHideTimer = null;
  }, 120);
};

const updateMap = () => {
  if (!mapInstance || !mapReady) {
    return;
  }
  if (projectTags.value.length === 0) {
    clearMapData();
    return;
  }
  const features = [];
  let minLon = 180;
  let minLat = 90;
  let maxLon = -180;
  let maxLat = -90;

  const colorMap = new Map();
  projectTags.value.forEach((tag, idx) => {
    const tagId = tag.tag_id;
    const color = colorForIndex(idx, projectTags.value.length);
    colorMap.set(tagId, color);
    const sortedStaps = [...tag.staps].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
    const coordinates = sortedStaps.map((stap) => [stap.longitude, stap.latitude]);
    coordinates.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    if (coordinates.length < 2) {
      return;
    }
    features.push({
      type: "Feature",
      properties: {
        tagId,
        color,
      },
      geometry: {
        type: "LineString",
        coordinates,
      },
    });
  });

  const collection = {
    type: "FeatureCollection",
    features,
  };

  const source = mapInstance.getSource("project-paths");
  if (source) {
    source.setData(collection);
  } else {
    mapInstance.addSource("project-paths", {
      type: "geojson",
      data: collection,
    });
    mapInstance.addLayer({
      id: "project-paths-line",
      type: "line",
      source: "project-paths",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2.5,
        "line-opacity": 0.6,
      },
    });
    mapInstance.addLayer({
      id: "project-paths-highlight",
      type: "line",
      source: "project-paths",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 3.5,
        "line-opacity": 0.95,
      },
      filter: ["==", ["get", "tagId"], ""],
    });
  }

  if (features.length && Number.isFinite(minLon)) {
    mapInstance.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      {
        padding: 60,
        duration: 800,
      },
    );
  }

  if (!hoverHandlersBound && mapInstance.getLayer("project-paths-line")) {
    hoverHandlersBound = true;
    mapInstance.on("mouseenter", "project-paths-line", (event) => {
      mapInstance.getCanvas().style.cursor = "pointer";
      const tagId = event.features[0].properties?.tagId;
      if (!pinnedTagId) {
        scheduleHoverShow(tagId, event.lngLat);
      }
    });

    mapInstance.on("mousemove", "project-paths-line", (event) => {
      if (hoverTagId && hoverPopup && !pinnedTagId) {
        hoverPopup.setLngLat(event.lngLat);
      }
    });

    mapInstance.on("mouseleave", "project-paths-line", () => {
      mapInstance.getCanvas().style.cursor = "";
      scheduleHoverHide();
    });

    mapInstance.on("click", "project-paths-line", (event) => {
      const tagId = event.features[0].properties?.tagId;
      setTagHover(tagId, event.lngLat, { lock: true });
    });

    mapInstance.on("click", (event) => {
      const hit = mapInstance.queryRenderedFeatures(event.point, {
        layers: ["project-paths-line"],
      });
      if (!hit.length && pinnedTagId) {
        clearTagHover({ force: true });
      }
    });
  }

  if (pinnedTagId && !projectTagIds.value.includes(pinnedTagId)) {
    clearTagHover({ force: true });
  }

  const locationFeatures = projectKnownLocations.value.map((loc) => ({
    type: "Feature",
    properties: {
      kind: loc.kind || "known",
      name: loc.location_name || "",
    },
    geometry: {
      type: "Point",
      coordinates: [loc.longitude, loc.latitude],
    },
  }));

  const locationCollection = {
    type: "FeatureCollection",
    features: locationFeatures,
  };

  const locationSource = mapInstance.getSource("project-locations");
  if (locationSource) {
    locationSource.setData(locationCollection);
  } else {
    mapInstance.addSource("project-locations", {
      type: "geojson",
      data: locationCollection,
    });
    mapInstance.addLayer({
      id: "project-locations-circles",
      type: "circle",
      source: "project-locations",
      paint: {
        "circle-color": ["case", ["==", ["get", "kind"], "equipment"], "#f8fafc", "#cbd5f5"],
        "circle-radius": ["case", ["==", ["get", "kind"], "equipment"], 8, 6],
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(0,0,0,0.7)",
        "circle-opacity": 0.95,
      },
    });
  }

  if (!locationHandlersBound && mapInstance.getLayer("project-locations-circles")) {
    locationHandlersBound = true;
    mapInstance.on("mousemove", "project-locations-circles", (event) => {
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

    mapInstance.on("mouseleave", "project-locations-circles", () => {
      mapInstance.getCanvas().style.cursor = "";
      if (locationPopup) {
        locationPopup.remove();
        locationPopup = null;
      }
    });
  }

  if (!stapHandlersBound && mapInstance.getLayer("project-staps-circles")) {
    stapHandlersBound = true;
    mapInstance.on("mouseenter", "project-staps-circles", (event) => {
      mapInstance.getCanvas().style.cursor = "pointer";
      const tagId = event.features[0].properties?.tagId;
      if (!pinnedTagId) {
        scheduleHoverShow(tagId, event.lngLat);
      }
    });

    mapInstance.on("mousemove", "project-staps-circles", (event) => {
      if (hoverTagId && hoverPopup && !pinnedTagId) {
        hoverPopup.setLngLat(event.lngLat);
      }
    });

    mapInstance.on("mouseleave", "project-staps-circles", () => {
      mapInstance.getCanvas().style.cursor = "";
      scheduleHoverHide();
    });

    mapInstance.on("click", "project-staps-circles", (event) => {
      const tagId = event.features[0].properties?.tagId;
      setTagHover(tagId, event.lngLat, { lock: true });
    });
  }

  const staps = projectTags.value.flatMap((tag) =>
    tag.staps.map((stap) => ({
      ...stap,
      tag_id: tag.tag_id,
    })),
  );
  const stapFeatures = staps.map((stap) => ({
    type: "Feature",
    properties: {
      tagId: stap.tag_id,
      duration: stap.duration_days,
      color: colorMap.get(stap.tag_id) || "rgba(255,255,255,0.6)",
    },
    geometry: {
      type: "Point",
      coordinates: [stap.longitude, stap.latitude],
    },
  }));
  const stapCollection = {
    type: "FeatureCollection",
    features: stapFeatures,
  };
  const stapSource = mapInstance.getSource("project-staps");
  if (stapSource) {
    stapSource.setData(stapCollection);
  } else {
    mapInstance.addSource("project-staps", {
      type: "geojson",
      data: stapCollection,
    });
    mapInstance.addLayer({
      id: "project-staps-circles",
      type: "circle",
      source: "project-staps",
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["interpolate", ["linear"], ["get", "duration"], 0, 3, 5, 6, 20, 12],
        "circle-opacity": 0.6,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "rgba(0,0,0,0.4)",
      },
    });
    mapInstance.addLayer({
      id: "project-staps-highlight",
      type: "circle",
      source: "project-staps",
      paint: {
        "circle-color": ["get", "color"],
        "circle-radius": ["interpolate", ["linear"], ["get", "duration"], 0, 4, 5, 7, 20, 14],
        "circle-opacity": 0.95,
        "circle-stroke-width": 1,
        "circle-stroke-color": "rgba(0,0,0,0.6)",
      },
      filter: ["==", ["get", "tagId"], ""],
    });
  }
};

const updateProject = async (rawId) => {
  const resolvedId = resolveProjectId(rawId || selectedId.value);
  if (!resolvedId) {
    return;
  }
  if (resolvedId !== selectedId.value) {
    selectedId.value = resolvedId;
  }
  router.replace({ name: "project", params: { conceptId: projectSlug(resolvedId) } });
  await updateProjectData();
  searchQuery.value = "";
  isSearching.value = false;
};

watch(
  () => route.params.conceptId,
  (value) => {
    if (value) {
      const resolved = resolveProjectId(value);
      if (resolved !== selectedId.value) {
        updateProject(resolved);
      }
    }
  },
);

onMounted(async () => {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  mapInstance = new mapboxgl.Map({
    container: mapContainer.value,
    style: "mapbox://styles/mapbox/dark-v11",
    center: [5, 20],
    zoom: 1.4,
    pitch: 0,
    bearing: 0,
  });

  const projectsData = await loadProjects();

  projects.value = projectsData;

  const initialId = route.params.conceptId
    ? resolveProjectId(route.params.conceptId)
    : projectKey(projectsData[0] || {});
  const fallbackId = projectKey(projectsData[0] || {});
  const exists = projectsData.some((project) => projectKey(project) === initialId);
  await updateProject(exists ? initialId : fallbackId);

  mapInstance.once("load", () => {
    mapReady = true;
    updateMap();
  });
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
  }
  if (hoverPopup) {
    hoverPopup.remove();
  }
  if (locationPopup) {
    locationPopup.remove();
  }
  if (hoverShowTimer) {
    clearTimeout(hoverShowTimer);
    hoverShowTimer = null;
  }
  if (hoverHideTimer) {
    clearTimeout(hoverHideTimer);
    hoverHideTimer = null;
  }
  if (citationCopyTimer) {
    clearTimeout(citationCopyTimer);
    citationCopyTimer = null;
  }
});
</script>
