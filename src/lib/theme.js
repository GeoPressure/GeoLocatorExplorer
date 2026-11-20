import { readonly, ref } from "vue";

// Light/dark theme.
//
// The user picks a preference ("system", "light" or "dark"), stored in localStorage.
// "system" follows the OS setting. The resolved theme ("light" or "dark") is written to
// `data-theme` on <html>, which switches the CSS tokens in style.css. The same logic runs
// inline in index.html before the app loads, so the page never flashes the wrong theme.
// Maps and plots, which can't read CSS variables, watch `theme` and restyle themselves.

export const THEME_STORAGE_KEY = "gle-theme";
export const THEME_PREFERENCES = ["system", "light", "dark"];

const media =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: light)")
    : null;

const readPreference = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

const resolve = (pref) => {
  if (pref === "light" || pref === "dark") {
    return pref;
  }
  return media?.matches ? "light" : "dark";
};

const preference = ref(readPreference());
const theme = ref(resolve(preference.value));

const apply = () => {
  theme.value = resolve(preference.value);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme.value;
  }
};

media?.addEventListener?.("change", () => {
  if (preference.value === "system") {
    apply();
  }
});

export const setThemePreference = (value) => {
  preference.value = THEME_PREFERENCES.includes(value) ? value : "system";
  try {
    if (preference.value === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference.value);
    }
  } catch {
    // Storage blocked (private mode): the choice still applies for this visit.
  }
  apply();
};

export const cycleThemePreference = () => {
  const index = THEME_PREFERENCES.indexOf(preference.value);
  setThemePreference(THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length]);
};

apply();

export const useTheme = () => ({
  preference: readonly(preference),
  theme: readonly(theme),
  setThemePreference,
  cycleThemePreference,
});

// Atmosphere around the Mapbox globe for the current theme.
export const mapFog = (value) =>
  value === "light"
    ? {
        "color": "rgba(236, 240, 246, 0.8)",
        "high-color": "rgba(170, 195, 230, 0.6)",
        "space-color": "rgb(232, 236, 243)",
        "horizon-blend": 0.1,
        "star-intensity": 0,
      }
    : {
        "color": "rgba(10, 16, 30, 0.55)",
        "high-color": "rgba(60, 80, 120, 0.2)",
        "space-color": "rgba(3, 6, 12, 0.8)",
        "horizon-blend": 0.1,
      };

// Mapbox basemap for the current theme.
export const basemapStyle = (value) =>
  value === "light" ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/dark-v11";

// Satellite basemap: EOX Sentinel-2 cloudless mosaic (https://s2maps.eu), cloud-free imagery
// at ~10 m. Tiles are in Web Mercator; the data stop around zoom 14, so Mapbox overzooms past it.
const S2CLOUDLESS_YEAR = 2025;
export const satelliteStyle = {
  version: 8,
  sources: {
    s2cloudless: {
      type: "raster",
      tiles: [
        `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${S2CLOUDLESS_YEAR}_3857/default/g/{z}/{y}/{x}.jpg`,
      ],
      tileSize: 256,
      maxzoom: 14,
      attribution:
        `<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless – s2maps.eu by EOX IT Services GmbH</a> ` +
        `(contains modified Copernicus Sentinel data ${S2CLOUDLESS_YEAR})`,
    },
  },
  layers: [{ id: "s2cloudless", type: "raster", source: "s2cloudless" }],
};
