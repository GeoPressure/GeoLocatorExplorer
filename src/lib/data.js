import { normalizeTable } from "./tagData";
import { loadPrivateContext, normalizeZenodoId, privateProjectKey } from "./privateData";

const cache = new Map();
const emptyProjectData = { tags: [], known_locations: [] };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

const loadPublicProjectsWithPrivateContext = async (privateRecords = null) => {
  const publicProjects = await loadJSON("data/projects.json");
  return {
    publicProjects,
    privateContext: await loadPrivateContext(publicProjects, privateRecords),
  };
};

const parseDate = (value) => {
  const timestamp = Date.parse(String(value || ""));
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

const buildPrivateGlobeTag = (tag, tagData, canonicalProjectId) => {
  const pathRows = normalizeTable(tagData?.paths);
  const stapRows = normalizeTable(tagData?.staps);
  const mostLikelyRows = pathRows.filter((row) => String(row?.type || "").toLowerCase() === "most_likely");
  const sourceRows = mostLikelyRows.length
    ? mostLikelyRows
    : pathRows.filter((row) => String(row?.type || "").toLowerCase() === "simulation");
  const stapStats = new Map();
  sourceRows.forEach((row) => {
    const stapId = String(row?.stap_id ?? "").trim();
    const lon = Number(row?.lon);
    const lat = Number(row?.lat);
    if (!stapId || !Number.isFinite(lon) || !Number.isFinite(lat)) {
      return;
    }
    const entry = stapStats.get(stapId) || { lon: 0, lat: 0, count: 0 };
    entry.lon += lon;
    entry.lat += lat;
    entry.count += 1;
    stapStats.set(stapId, entry);
  });

  const segments = stapRows
    .map((row) => {
      const stapId = String(row?.stap_id ?? "").trim();
      const stats = stapStats.get(stapId);
      const start = parseDate(row?.start);
      const end = parseDate(row?.end);
      if (!stats || !stats.count || !start || !end || end < start) {
        return null;
      }
      return {
        start,
        end,
        lon: Number((stats.lon / stats.count).toFixed(5)),
        lat: Number((stats.lat / stats.count).toFixed(5)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (!segments.length) {
    return null;
  }

  const rangeStart = segments[0].start;
  const rangeEnd = segments.reduce(
    (latest, segment) => (segment.end.getTime() > latest.getTime() ? segment.end : latest),
    segments[0].end,
  );
  const displayEnd = new Date(Math.min(rangeEnd.getTime(), rangeStart.getTime() + 365 * MS_PER_DAY));
  const positions = Array.from({ length: 365 }, () => null);

  let segmentIndex = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const sampleTime = new Date(
      Date.UTC(
        rangeStart.getUTCFullYear(),
        rangeStart.getUTCMonth(),
        rangeStart.getUTCDate() + offset,
        12,
        0,
        0,
      ),
    );
    if (sampleTime < rangeStart || sampleTime > displayEnd) {
      continue;
    }
    while (segmentIndex < segments.length && segments[segmentIndex].end < sampleTime) {
      segmentIndex += 1;
    }
    if (segmentIndex >= segments.length) {
      break;
    }
    const segment = segments[segmentIndex];
    if (!(segment.start <= sampleTime && sampleTime <= segment.end)) {
      continue;
    }
    const startOfYear = Date.UTC(sampleTime.getUTCFullYear(), 0, 0);
    const dayIndex = Math.min(
      365,
      Math.floor((sampleTime.getTime() - startOfYear) / MS_PER_DAY),
    );
    positions[Math.max(0, dayIndex - 1)] = [segment.lon, segment.lat];
  }

  if (!positions.some(Boolean)) {
    return null;
  }

  return {
    tag_id: tag.tag_id,
    scientific_name: tag.scientific_name,
    common_name: tag.common_name,
    species_code: tag.species_code,
    iucn_red_list_category: tag.iucn_red_list_category,
    birdlife_factsheet_url: tag.birdlife_factsheet_url,
    birds_of_the_world_url: tag.birds_of_the_world_url,
    in_ebirdst: tag.in_ebirdst,
    project_id: canonicalProjectId,
    project_title: tag.project_title,
    sex: tag.sex,
    age_class: tag.age_class,
    wing_length: tag.wing_length,
    positions,
    is_private: true,
  };
};

export async function loadProjects(privateRecords = null) {
  const { publicProjects, privateContext } = await loadPublicProjectsWithPrivateContext(privateRecords);
  const visiblePublicProjects = publicProjects.filter(
    (project) => !privateContext.privateRecordIds.has(normalizeZenodoId(project.record_id)),
  );
  return [
    ...visiblePublicProjects,
    ...privateContext.entries.map(({ record, canonicalProjectId, publicProject }) => ({
      ...record.project,
      id: canonicalProjectId,
      concept_id: publicProject?.concept_id || record.project?.concept_id || canonicalProjectId,
      is_private: true,
    })),
  ];
}

export async function loadTags() {
  const publicTags = await loadJSON("data/tags.json");
  const { privateContext } = await loadPublicProjectsWithPrivateContext();
  const visiblePublicTags = publicTags.filter((tag) => !privateContext.privateTagIds.has(tag.tag_id));
  return [
    ...visiblePublicTags,
    ...privateContext.entries.flatMap(({ record, canonicalProjectId }) =>
      (record.tags || []).map((tag) => ({
        ...tag,
        project_id: canonicalProjectId,
        is_private: true,
      })),
    ),
  ];
}

export async function loadGlobe() {
  const publicGlobe = await loadJSON("data/globe.json");
  const { privateContext } = await loadPublicProjectsWithPrivateContext();
  const visiblePublicGlobe = publicGlobe.filter((tag) => !privateContext.privateTagIds.has(tag.tag_id));
  const privateGlobe = privateContext.entries.flatMap(({ record, canonicalProjectId }) =>
    (record.tags || [])
      .map((tag) => buildPrivateGlobeTag(tag, record.tagDataById?.[tag.tag_id], canonicalProjectId))
      .filter(Boolean),
  );
  return [...visiblePublicGlobe, ...privateGlobe];
}

export async function loadProjectData(projectId) {
  const { privateContext } = await loadPublicProjectsWithPrivateContext();
  const privateRecord = privateContext.entries.find(
    ({ record, canonicalProjectId }) =>
      canonicalProjectId === projectId ||
      privateProjectKey(record.project || {}) === projectId ||
      record.project?.concept_id === projectId,
  )?.record;
  if (privateRecord) {
    return privateRecord.projectData || emptyProjectData;
  }
  return loadJSON(`data/projects/${String(projectId || "").trim()}.json`);
}

export async function loadTagData(tagId) {
  const { privateContext } = await loadPublicProjectsWithPrivateContext();
  const privateEntry = privateContext.entries.find(({ record }) => record.tagDataById?.[tagId]);
  if (privateEntry) {
    return {
      ...privateEntry.record.tagDataById[tagId],
      project_id: privateEntry.canonicalProjectId,
      project_title: privateEntry.record.project?.title || privateEntry.record.tagDataById[tagId]?.project_title,
      is_private: true,
    };
  }
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
