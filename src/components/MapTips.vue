<template>
  <!-- A dismissible tips panel over a map; once closed it stays closed (per browser) and a
       "?" button brings it back. The bullets are the default slot (<li> items). -->
  <div
    v-if="isOpen"
    :id="panelId"
    class="panel pointer-events-auto absolute max-sm:hidden w-[min(88vw,360px)] p-5 text-sm text-fg/70"
    :class="positionClass"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <span
          class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-fg/10 bg-fg/5 text-[color:var(--teal)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.5" />
            <circle cx="12" cy="16.8" r="0.6" fill="currentColor" />
          </svg>
        </span>
        <p class="eyebrow text-fg/70">{{ title }}</p>
      </div>
      <button
        type="button"
        class="icon-button h-7 w-7"
        :aria-label="`Dismiss ${title.toLowerCase()}`"
        @click="dismiss"
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
    <ul class="mt-3 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-fg/80">
      <slot />
    </ul>
  </div>
  <button
    v-else
    type="button"
    class="icon-button pointer-events-auto absolute max-sm:hidden h-11 w-11"
    :class="positionClass"
    :aria-label="`Show ${title.toLowerCase()}`"
    :aria-controls="panelId"
    :title="title"
    @click="isOpen = true"
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
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.5" />
      <circle cx="12" cy="16.8" r="0.6" fill="currentColor" />
    </svg>
  </button>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  // localStorage key remembering that the panel was dismissed.
  storageKey: { type: String, required: true },
  panelId: { type: String, required: true },
  // Tailwind position classes for both the panel and the "?" button.
  positionClass: { type: String, default: "" },
});

const readDismissed = () => {
  try {
    return localStorage.getItem(props.storageKey) === "true";
  } catch {
    return false;
  }
};

const isOpen = ref(!readDismissed());
// The page can read isOpen (e.g. to keep map content clear of the open panel).
defineExpose({ isOpen });

const dismiss = () => {
  isOpen.value = false;
  try {
    localStorage.setItem(props.storageKey, "true");
  } catch {
    // Storage unavailable: the panel just reopens on the next visit.
  }
};
</script>
