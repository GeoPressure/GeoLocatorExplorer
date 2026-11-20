<template>
  <!-- Full height below the fixed header: narrow gallery on the left, the selected species on the right -->
  <section
    class="flex h-[100dvh] w-full flex-col bg-[color:var(--ink)] px-4 pb-4 pt-[5rem] sm:px-6"
  >
    <p v-if="error" class="text-sm text-white/70">Videos could not be loaded ({{ error }}).</p>
    <template v-else-if="manifest">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h1 class="font-display text-xl">Migration videos</h1>
        <a class="button-ghost" :href="fileUrl(manifest.zip)" download>Download all</a>
      </div>

      <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <!-- Gallery: open species first, embargoed ones at the bottom -->
        <div class="min-h-0 overflow-y-auto pr-1">
          <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <template v-for="s in gallery" :key="s.code">
              <p
                v-if="s.code === firstEmbargoed"
                class="col-span-full mt-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ember)]"
              >
                Under embargo
              </p>
              <button
                type="button"
                class="group grid gap-0.5 text-left"
                :aria-pressed="s.code === selected"
                @click="selected = s.code"
              >
                <span
                  class="relative block aspect-[4/5] overflow-hidden rounded-lg border transition"
                  :class="
                    s.code === selected
                      ? 'border-[color:var(--teal)] ring-2 ring-[color:var(--teal)]'
                      : 'border-white/10 group-hover:border-white/40'
                  "
                >
                  <img
                    :src="fileUrl(s.embargo ? s.files.blur : s.files.poster)"
                    :alt="s.name"
                    loading="lazy"
                    class="h-full w-full object-cover"
                    :class="s.embargo ? 'opacity-50' : ''"
                  />
                  <span
                    v-if="s.embargo"
                    class="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-[10px] uppercase tracking-[0.18em] text-[color:var(--ember)]"
                  >
                    Embargo
                  </span>
                </span>
                <span class="truncate text-xs text-white/80">{{ s.name }}</span>
                <span
                  class="truncate text-[11px] font-semibold text-[color:var(--teal)]"
                  :title="authors(s)"
                >
                  {{ authors(s) }}
                </span>
              </button>
            </template>
          </div>
        </div>

        <!-- Selected species: inline on large screens, full-screen overlay on phones -->
        <div
          v-if="current"
          class="fixed inset-0 z-40 flex flex-col gap-3 overflow-y-auto bg-[color:var(--ink)] p-4 lg:static lg:z-auto lg:min-h-0 lg:overflow-hidden lg:p-0"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate font-display text-lg">{{ current.name }}</h2>
              <p class="truncate text-sm font-semibold text-[color:var(--teal)]">
                Data: {{ authors(current) }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button
                v-if="current.caption"
                type="button"
                class="button-ghost whitespace-nowrap"
                :title="current.caption"
                @click="copyCaption"
              >
                {{ copied ? "Copied" : "Copy text" }}
              </button>
              <button type="button" class="button-ghost lg:hidden" @click="selected = ''">
                Close
              </button>
            </div>
          </div>

          <div
            v-if="current.embargo"
            class="relative aspect-[4/5] overflow-hidden rounded-xl lg:aspect-auto lg:min-h-0 lg:flex-1"
          >
            <img
              :src="fileUrl(current.files.blur)"
              :alt="`${current.name}, under embargo`"
              class="h-full w-full object-contain opacity-60"
            />
            <p
              class="absolute inset-0 grid place-content-center text-center font-display text-lg uppercase tracking-[0.2em] text-[color:var(--ember)]"
            >
              Under embargo
              <span class="mt-1 text-xs normal-case tracking-normal text-white/80">
                until {{ formatDate(lastEmbargo(current)) }}
              </span>
            </p>
          </div>

          <!-- Phones: video full width, stills side by side below; large screens: stills beside the video -->
          <div
            v-else
            class="grid grid-cols-2 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[2fr_1fr] lg:grid-rows-2"
          >
            <figure class="relative col-span-2 aspect-[4/5] lg:col-span-1 lg:row-span-2 lg:aspect-auto lg:min-h-0">
              <video
                :key="current.code"
                class="h-full w-full rounded-xl bg-black/50 object-contain"
                :src="fileUrl(current.files.video)"
                :poster="fileUrl(current.files.poster)"
                controls
                playsinline
                autoplay
                muted
                loop
              ></video>
              <a
                class="download-chip"
                :href="fileUrl(current.files.video)"
                :download="current.files.video"
                >MP4 ↓</a
              >
            </figure>
            <figure
              v-for="key in ['poster', 'year']"
              :key="key"
              class="relative aspect-[4/5] lg:aspect-auto lg:min-h-0"
            >
              <img
                :src="fileUrl(current.files[key])"
                :alt="`${current.name}, ${key === 'poster' ? 'mid-October' : 'whole year'}`"
                class="h-full w-full rounded-xl bg-black/50 object-contain"
              />
              <a
                class="download-chip"
                :href="fileUrl(current.files[key])"
                :download="current.files[key]"
                >PNG ↓</a
              >
            </figure>
          </div>
        </div>
        <p v-else class="hidden self-center text-center text-sm text-white/50 lg:block">
          Select a species
        </p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const base = `${import.meta.env.BASE_URL}media/`;
const route = useRoute();
const router = useRouter();
const manifest = ref(null);
const error = ref("");
const selected = ref("");
const copied = ref(false);

const species = computed(() => manifest.value?.species ?? []);
const current = computed(() => species.value.find((s) => s.code === selected.value));
const gallery = computed(() => [
  ...species.value.filter((s) => !s.embargo),
  ...species.value.filter((s) => s.embargo),
]);
const firstEmbargoed = computed(() => gallery.value.find((s) => s.embargo)?.code);
// First author and year of each data package, e.g. "Rime et al. 2025"
const authors = (s) => s.packages.map((p) => p.cite).join("; ");

const fileUrl = (name) => `${base}${name}`;
const lastEmbargo = (s) =>
  s.embargo
    .map((e) => e.until)
    .sort()
    .at(-1);
const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// The selected species lives in the URL (?species=grrwar1), so a link can open one video
watch(selected, (code) => {
  copied.value = false;
  router.replace({ query: code ? { species: code } : {} });
});
async function copyCaption() {
  try {
    await navigator.clipboard.writeText(current.value.caption);
    copied.value = true;
  } catch {
    copied.value = false;
  }
}
function onKey(event) {
  if (event.key === "Escape") selected.value = "";
}

// Unlisted: ask search engines not to index this page while it is open
let robots = null;
let robotsBefore = null;
onMounted(async () => {
  robots = document.querySelector('meta[name="robots"]');
  robotsBefore = robots?.getAttribute("content") ?? null;
  robots?.setAttribute("content", "noindex,nofollow");
  window.addEventListener("keydown", onKey);
  try {
    const response = await fetch(`${base}manifest.json`, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    manifest.value = await response.json();
    const wanted = String(route.query.species || "");
    if (species.value.some((s) => s.code === wanted)) {
      selected.value = wanted;
    }
  } catch (e) {
    error.value = String(e?.message || e);
  }
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  if (robots && robotsBefore !== null) {
    robots.setAttribute("content", robotsBefore);
  }
});
</script>

<style scoped>
@reference "../style.css";
.download-chip {
  @apply absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition hover:bg-[color:var(--teal)] hover:text-black;
}
</style>
