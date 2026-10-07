<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur"
    @pointerdown="startedOnBackdrop = $event.target === $event.currentTarget"
    @click.self="startedOnBackdrop && closeModal()"
  >
    <div
      class="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[color:var(--slate)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.6)]"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] uppercase tracking-[0.28em] text-white/50">Private Zenodo</p>
          <h2 class="mt-1 font-display text-2xl text-white">Load private datapackage</h2>
        </div>
        <button
          type="button"
          class="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-white/30 hover:text-white"
          @click="closeModal"
        >
          Close
        </button>
      </div>

      <form class="mt-5 grid gap-3" @submit.prevent="$emit('load')">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-xs">
          <p class="text-white/60">Paste a share link from Zenodo’s Share → Links.</p>
          <div class="ml-auto flex flex-wrap gap-3 text-[color:var(--teal)]">
            <a
              v-if="selectedRecordId"
              :href="`https://zenodo.org/records/${selectedRecordId}`"
              target="_blank"
              rel="noreferrer"
              class="transition hover:text-white"
            >Selected record ↗</a>
            <a
              href="https://zenodo.org/me/uploads?q=GeoLocator%20Data%20Package%3A&f=shared_with_me%3Afalse&l=list&p=1&s=10&sort=bestmatch"
              target="_blank"
              rel="noreferrer"
              class="transition hover:text-white"
            >My records ↗</a>
            <a
              href="https://zenodo.org/communities/geolocator-dp/records?q=&amp;f=access_status%3Aembargoed&amp;l=list&amp;p=1&amp;s=10&amp;sort=newest"
              target="_blank"
              rel="noreferrer"
              class="transition hover:text-white"
            >All records ↗</a>
          </div>
        </div>
        <div class="grid gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
          <label for="zenodo-record">Zenodo share link, DOI or id</label>
          <div class="relative">
            <input
              id="zenodo-record"
              :value="recordInput"
              name="zenodo_record"
              class="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-4 pr-12 text-sm normal-case tracking-normal text-white placeholder:text-white/35"
              placeholder="https://zenodo.org/records/1234567?token=…"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              @input="$emit('update:recordInput', $event.target.value)"
            />
            <a
              v-if="recordUrl"
              :href="recordUrl"
              target="_blank"
              rel="noreferrer"
              aria-label="Open entered record on Zenodo"
              title="Open on Zenodo"
              class="absolute inset-y-0 right-0 flex items-center px-4 text-[color:var(--teal)] transition hover:text-white"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                <path d="M14 5h5v5M10 14 19 5M19 14v5H5V5h5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </div>
        </div>

        <label v-if="showTokenInput" class="grid gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
          <span class="flex items-center justify-between gap-3">
            <span>Personal access token (optional)</span>
            <a
              href="https://zenodo.org/account/settings/applications/"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1 text-[10px] text-[color:var(--teal)] transition hover:text-white"
            >
              <span>Get Token</span>
              <svg
                viewBox="0 0 24 24"
                class="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              >
                <path d="M14 5h5v5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M10 14 19 5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19 14v5H5V5h5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </a>
          </span>
          <input
            :value="tokenInput"
            type="password"
            name="zenodo_token"
            class="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-white/35"
            placeholder="Personal access token"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            @input="$emit('update:tokenInput', $event.target.value)"
          />
        </label>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            class="button-primary disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isProcessing || !recordInput.trim()"
          >
            {{ isProcessing ? "Processing" : "Load Record" }}
          </button>
        </div>

        <p v-if="status" class="inline-flex items-center gap-2 text-sm text-white/70">
          <span v-if="isProcessing" class="status-spinner" aria-hidden="true"></span>
          <span>{{ status }}</span>
        </p>
        <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
      </form>

      <div class="mt-6">
        <p class="text-[10px] uppercase tracking-[0.28em] text-white/50">Cached Records</p>
        <div
          v-if="!records.length"
          class="mt-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/50"
        >
          No private datapackages are stored in this browser.
        </div>
        <div v-else class="mt-3 grid gap-2">
          <div
            v-for="record in records"
            :key="record.id"
            class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-white">{{ formatTitle(record.title) }}</p>
              <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                {{ record.tagCount }} tags · Zenodo {{ record.recordId || "record" }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/60 transition hover:border-white/30 hover:text-white"
                @click="$emit('select', record.id)"
              >
                Open
              </button>
              <button
                type="button"
                class="rounded-full border border-red-300/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-red-200/80 transition hover:border-red-200/60 hover:text-red-100"
                @click="$emit('remove', record.id)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { normalizeZenodoId } from "../lib/privateData";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  recordInput: { type: String, default: "" },
  selectedRecordId: { type: String, default: "" },
  tokenInput: { type: String, default: "" },
  records: { type: Array, default: () => [] },
  status: { type: String, default: "" },
  error: { type: String, default: "" },
  isProcessing: { type: Boolean, default: false },
  formatTitle: { type: Function, default: (title) => String(title || "") },
});

const startedOnBackdrop = ref(false);
const recordUrl = computed(() => {
  const record = props.recordInput.trim();
  const id = normalizeZenodoId(record);
  if (!id) return "";
  return /^https?:\/\/zenodo\.org\/records\/\d+/i.test(record) ? record : `https://zenodo.org/records/${id}`;
});

const showTokenInput = computed(() => {
  const record = props.recordInput.trim();
  return /zenodo\.(\d+)$/i.test(record) || /records\/(\d+)/i.test(record) || /^\d+$/.test(record)
    ? !new URLSearchParams(record.split("?")[1]?.split("#")[0]).get("token")
    : false;
});

const emit = defineEmits([
  "update:modelValue",
  "update:recordInput",
  "update:tokenInput",
  "load",
  "select",
  "remove",
]);

const closeModal = () => emit("update:modelValue", false);
const formatTitle = (title) => props.formatTitle(title);
</script>

<style scoped>
.status-spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--teal);
  border-radius: 999px;
  animation: status-spin 0.75s linear infinite;
}

@keyframes status-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
