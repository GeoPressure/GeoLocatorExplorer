<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur"
    @click.self="closeModal"
  >
    <div
      class="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[color:var(--slate)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.6)]"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] uppercase tracking-[0.28em] text-white/50">Private Zenodo</p>
          <h2 class="mt-1 font-display text-2xl text-white">Datapackage Cache</h2>
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
        <label class="grid gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
          <span class="flex items-center justify-between gap-3">
            <span>Zenodo record DOI or id</span>
            <a
              href="https://zenodo.org/me/uploads?q=GeoLocator%20Data%20Package%3A&f=shared_with_me%3Afalse&l=list&p=1&s=10&sort=bestmatch"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1 text-[10px] text-[color:var(--teal)] transition hover:text-white"
            >
              <span>Find Record</span>
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
            :value="recordInput"
            name="zenodo_record"
            class="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-white/35"
            placeholder="10.5281/zenodo.1234567"
            autocomplete="off"
            @input="$emit('update:recordInput', $event.target.value)"
          />
        </label>

        <label class="grid gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
          <span class="flex items-center justify-between gap-3">
            <span>Zenodo token</span>
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
            autocomplete="current-password"
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
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  recordInput: { type: String, default: "" },
  tokenInput: { type: String, default: "" },
  records: { type: Array, default: () => [] },
  status: { type: String, default: "" },
  error: { type: String, default: "" },
  isProcessing: { type: Boolean, default: false },
  formatTitle: { type: Function, default: (title) => String(title || "") },
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
