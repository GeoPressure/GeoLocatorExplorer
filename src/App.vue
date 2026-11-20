<template>
  <div class="app-root bg-[color:var(--ink)] text-[color:var(--cream)]">
    <header
      class="fixed inset-x-0 top-0 z-30 transition-colors"
      :class="isOverlayHeader ? '' : 'border-b border-fg/10 bg-[color:var(--ink)]/85 backdrop-blur-md'"
    >
      <div
        class="flex w-full items-center justify-between px-6"
        :class="route.name === 'home' ? 'py-4' : 'py-2.5'"
      >
        <div class="flex items-center gap-3">
          <img
            :src="`${baseUrl}logo.svg`"
            alt="GeoLocator Explorer"
            class="h-10 w-10 rounded-full bg-white/90 p-1"
          />
          <div>
            <p class="text-sm uppercase tracking-[0.32em] text-[color:var(--mist)]">
              GeoLocator Explorer
            </p>
            <p class="hidden text-lg font-display sm:block">Bird Migration Movement</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <nav class="hidden items-center gap-3 text-sm font-semibold md:flex">
            <RouterLink to="/" :class="navClass('home')"> Globe </RouterLink>
            <RouterLink to="/project" :class="navClass('project')"> Projects </RouterLink>
            <RouterLink to="/tag" :class="navClass('tag')"> Tags </RouterLink>
          </nav>
          <button
            type="button"
            class="icon-button h-9 w-9 md:hidden"
            @click="isMenuOpen = !isMenuOpen"
            aria-label="Toggle navigation"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            type="button"
            class="icon-button h-9 w-9"
            :aria-label="themeLabel"
            :title="themeLabel"
            @click="cycleThemePreference"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <template v-if="preference === 'light'">
                <circle cx="12" cy="12" r="4" />
                <path
                  d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
                />
              </template>
              <path v-else-if="preference === 'dark'" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
              <template v-else>
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M8 20h8M12 16v4" />
              </template>
            </svg>
          </button>
        </div>
      </div>
      <div
        v-if="isMenuOpen"
        class="border-t border-fg/10 bg-[color:var(--panel)] backdrop-blur-md md:hidden"
      >
        <nav class="flex flex-col gap-2 px-6 py-4 text-sm font-semibold">
          <RouterLink to="/" :class="navClass('home')" @click="closeMenu"> Globe </RouterLink>
          <RouterLink to="/project" :class="navClass('project')" @click="closeMenu">
            Projects
          </RouterLink>
          <RouterLink to="/tag" :class="navClass('tag')" @click="closeMenu"> Tags </RouterLink>
        </nav>
        <div
          class="flex items-center justify-center gap-6 border-t border-fg/10 px-6 py-2 text-xs text-[color:var(--mist)]"
          aria-label="Organization links"
        >
          <a
            href="https://www.vogelwarte.ch/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center gap-2 transition hover:text-fg"
          >
            <img :src="`${baseUrl}vogelwarte-favicon.png`" alt="" width="16" height="16" />
            vogelwarte.ch
          </a>
          <a
            href="https://geopressure.org/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center gap-2 transition hover:text-fg"
          >
            <img :src="`${baseUrl}geopressure-favicon.png`" alt="" width="16" height="16" />
            geopressure.org
          </a>
        </div>
      </div>
    </header>

    <RouterView />

    <footer v-if="route.name === 'home'" class="site-credits" aria-label="Organization links">
      <a href="https://www.vogelwarte.ch/" target="_blank" rel="noopener noreferrer" aria-label="vogelwarte.ch — Swiss Ornithological Institute">
        <img :src="`${baseUrl}vogelwarte-favicon.png`" alt="" width="16" height="16" />
        vogelwarte.ch
      </a>
      <span aria-hidden="true" class="text-fg/25">·</span>
      <a href="https://geopressure.org/" target="_blank" rel="noopener noreferrer">
        <img :src="`${baseUrl}geopressure-favicon.png`" alt="" width="16" height="16" />
        geopressure.org
      </a>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useTheme } from "./lib/theme";

const isMenuOpen = ref(false);
const route = useRoute();
const baseUrl = import.meta.env.BASE_URL;
const { preference, cycleThemePreference } = useTheme();
const themeLabels = {
  system: "Theme: follows your system (click for light)",
  light: "Theme: light (click for dark)",
  dark: "Theme: dark (click to follow your system)",
};
const themeLabel = computed(() => themeLabels[preference.value]);
// On the Globe the header floats over the full-screen map; on scrolling pages it gets
// a background so content doesn't run underneath the logo.
const isOverlayHeader = computed(() => route.name === "home" && !isMenuOpen.value);

const closeMenu = () => {
  isMenuOpen.value = false;
};

watch(
  () => route.fullPath,
  () => {
    isMenuOpen.value = false;
  },
);

const navClass = (name) => ["nav-pill", route.name === name ? "nav-pill-active" : ""];
</script>
