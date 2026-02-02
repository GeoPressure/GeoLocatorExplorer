<template>
  <div class="min-h-screen bg-[color:var(--ink)] text-[color:var(--cream)]">
    <header class="fixed inset-x-0 top-0 z-30">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <img
            src="/logo.svg"
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
        <nav class="hidden items-center gap-3 text-sm font-semibold md:flex">
          <RouterLink to="/" class="nav-pill" active-class="nav-pill-active"> Globe </RouterLink>
          <RouterLink to="/project" class="nav-pill" active-class="nav-pill-active">
            Projects
          </RouterLink>
          <RouterLink to="/tag" class="nav-pill" active-class="nav-pill-active"> Tags </RouterLink>
        </nav>
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white/80 transition hover:text-white md:hidden"
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
      </div>
      <div
        v-if="isMenuOpen"
        class="border-t border-white/10 bg-black/40 backdrop-blur-md md:hidden"
      >
        <nav class="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-sm font-semibold">
          <RouterLink to="/" class="nav-pill" active-class="nav-pill-active" @click="closeMenu">
            Globe
          </RouterLink>
          <RouterLink
            to="/project"
            class="nav-pill"
            active-class="nav-pill-active"
            @click="closeMenu"
          >
            Projects
          </RouterLink>
          <RouterLink to="/tag" class="nav-pill" active-class="nav-pill-active" @click="closeMenu">
            Tags
          </RouterLink>
        </nav>
      </div>
    </header>

    <RouterView />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

const isMenuOpen = ref(false);
const route = useRoute();

const closeMenu = () => {
  isMenuOpen.value = false;
};

watch(
  () => route.fullPath,
  () => {
    isMenuOpen.value = false;
  },
);
</script>
