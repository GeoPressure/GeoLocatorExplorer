const cache = new Map();

export async function loadJSON(path) {
  if (cache.has(path)) {
    return cache.get(path);
  }
  const url = `${import.meta.env.BASE_URL}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  const data = await response.json();
  cache.set(path, data);
  return data;
}

export function loadProjects() {
  return loadJSON("data/projects.json");
}

export function loadTags() {
  return loadJSON("data/tags.json");
}

export function loadGlobe() {
  return loadJSON("data/globe.json");
}

export async function loadProjectData(projectId) {
  return loadJSON(`data/projects/${String(projectId || "").trim()}.json`);
}

export async function loadTagData(tagId) {
  const base = `data/tags/${String(tagId || "").trim()}`;
  const [meta, paths, staps, observations, pressurepath] = await Promise.all([
    loadJSON(`${base}/meta.json`),
    loadJSON(`${base}/paths.json`),
    loadJSON(`${base}/staps.json`),
    loadJSON(`${base}/observations.json`),
    loadJSON(`${base}/pressurepath.json`),
  ]);
  return { ...meta, paths, staps, observations, pressurepath };
}
