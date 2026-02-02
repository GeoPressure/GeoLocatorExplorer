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

const projectFileSafe = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/zenodo\.(\d+)$/);
  if (match) {
    return match[1];
  }
  return text.replace(/[^A-Za-z0-9_-]/g, "_");
};

export function loadProjectData(projectId) {
  return loadJSON(`data/projects/${projectFileSafe(projectId)}.json`);
}

const tagFileSafe = (value) =>
  String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "_");

export function loadTagData(tagId) {
  return loadJSON(`data/tags/${tagFileSafe(tagId)}.json`);
}
