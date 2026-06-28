const ZENODO_API = "https://zenodo.org/api/records";

const noop = () => {};

const cleanText = (value) => {
  if (value == null) {
    return "";
  }
  const text = String(value).trim();
  return !text || text.toUpperCase() === "NA" ? "" : text;
};

const toNumber = (value) => {
  const text = cleanText(value);
  if (!text) {
    return null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const toInt = (value) => {
  const number = toNumber(value);
  return Number.isFinite(number) ? Math.round(number) : null;
};

const roundNumber = (value, digits) => {
  const number = toNumber(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
};

const normalizeDateTime = (value) => {
  const text = cleanText(value);
  if (!text) {
    return null;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  return date.toISOString().replace(/:00\.000Z$/, ":00Z");
};

const basename = (path) =>
  String(path || "")
    .split(/[/?#]/)[0]
    .split("/")
    .filter(Boolean)
    .pop();

const parseCSV = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header = [], ...body] = rows;
  return body
    .filter((values) => values.some((value) => cleanText(value)))
    .map((values) =>
      Object.fromEntries(header.map((name, index) => [cleanText(name), cleanText(values[index])])),
    );
};

const tableToColumns = (rows, columns, transforms = {}) => {
  const payload = Object.fromEntries(columns.map((column) => [column, []]));
  rows.forEach((row) => {
    columns.forEach((column) => {
      const transform = transforms[column];
      payload[column].push(transform ? transform(row[column]) : row[column] || null);
    });
  });
  return payload;
};

const uniqueCount = (rows, key = "tag_id") => new Set(rows.map((row) => row[key]).filter(Boolean)).size;

const extractRecordId = (value) => {
  const text = cleanText(value);
  const match = text.match(/zenodo\.(\d+)$/i) || text.match(/records\/(\d+)/i) || text.match(/^(\d+)$/);
  if (!match) {
    throw new Error("Enter a Zenodo record id, record URL, or DOI.");
  }
  return match[1];
};

const buildHeaders = (token) => {
  const headers = {};
  if (cleanText(token)) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
};

const fetchJSON = async (url, headers) => {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Zenodo request failed (${response.status}) for ${url}`);
  }
  return response.json();
};

const fetchText = async (url, headers) => {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Zenodo file download failed (${response.status}) for ${url}`);
  }
  return response.text();
};

const zenodoFileUrl = (file) => file?.links?.self || file?.links?.download || file?.links?.content;

const describeAccessProblem = (record, token) => {
  const accessStatus = cleanText(record?.access?.status || record?.metadata?.access_right).toLowerCase();
  const hasToken = Boolean(cleanText(token));
  if (["embargoed", "restricted", "closed"].includes(accessStatus)) {
    return hasToken
      ? "Zenodo returned this record without accessible files. Check that the token has permission to read this record."
      : "This Zenodo record is not openly accessible. Add a token with permission to read the record.";
  }
  return hasToken
    ? "Zenodo returned this record without accessible files. Check that the token is valid and has permission to read the files."
    : "Zenodo returned this record without accessible files. Add a token if the files are embargoed or restricted.";
};

const contributorsFromRecord = (record) =>
  (record?.metadata?.creators || record?.metadata?.contributors || []).map((person) => ({
    title: person.name || [person.given_name, person.family_name].filter(Boolean).join(" "),
    orcid: person.orcid ? `https://orcid.org/${person.orcid.replace(/^https?:\/\/orcid\.org\//, "")}` : "",
  }));

const normalizeTaxa = (value) => {
  if (!value) {
    return [];
  }
  const taxa = Array.isArray(value) ? value : String(value).split(/[,;]+/);
  return taxa
    .map((entry) => (typeof entry === "string" ? { scientific_name: cleanText(entry) } : entry))
    .filter((entry) => entry.scientific_name || entry.common_name);
};

const normalizeBoolean = (value) => {
  if (value === true || value === false) {
    return value;
  }
  const text = cleanText(value).toUpperCase();
  if (text === "TRUE") {
    return true;
  }
  if (text === "FALSE") {
    return false;
  }
  return null;
};

const relationTypeLabels = {
  iscitedby: "Is cited by",
  cites: "Cites",
  issupplementto: "Is supplement to",
  issupplementedby: "Is supplemented by",
  iscontinuedby: "Is continued by",
  continues: "Continues",
  isnewversionof: "Is new version of",
  ispreviousversionof: "Is previous version of",
  ispartof: "Is part of",
  haspart: "Has part",
  ispublishedin: "Is published in",
  isreferencedby: "Is referenced by",
  references: "References",
  isdocumentedby: "Is documented by",
  documents: "Documents",
  iscompiledby: "Is compiled by",
  compiles: "Compiles",
  isvariantformof: "Is variant form of",
  isoriginalformof: "Is original form of",
  isidenticalto: "Is identical to",
  hasmetadata: "Has metadata",
  ismetadatafor: "Is metadata for",
  reviews: "Reviews",
  isreviewedby: "Is reviewed by",
  isderivedfrom: "Is derived from",
  issourceof: "Is source of",
  describes: "Describes",
  isdescribedby: "Is described by",
  hasversion: "Has version",
  isversionof: "Is version of",
  requires: "Requires",
  isrequiredby: "Is required by",
  obsoletes: "Obsoletes",
  isobsoletedby: "Is obsoleted by",
  collects: "Collects",
  iscollectedby: "Is collected by",
  hastranslation: "Has translation",
  istranslationof: "Is translation of",
};

const humanizeRelationType = (value) => {
  const lowered = cleanText(value).toLowerCase();
  if (relationTypeLabels[lowered]) {
    return relationTypeLabels[lowered];
  }
  if (!lowered) {
    return "";
  }
  return lowered.slice(0, 1).toUpperCase() + lowered.slice(1);
};

const normalizeRelatedIdentifiers = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      relationType: humanizeRelationType(item?.relationType),
      relatedIdentifier: cleanText(item?.relatedIdentifier || item?.identifier),
      relatedIdentifierType: cleanText(item?.relatedIdentifierType || item?.identifierType).toLowerCase(),
    }))
    .filter((item) => item.relatedIdentifier);

const normalizeContributors = (value, record) => {
  if (Array.isArray(value) && value.length) {
    return value.map((person) => ({
      title:
        cleanText(person?.title) ||
        [cleanText(person?.givenName), cleanText(person?.familyName)].filter(Boolean).join(" "),
      givenName: cleanText(person?.givenName),
      familyName: cleanText(person?.familyName),
      path: cleanText(person?.path || person?.orcid),
      roles: cleanText(person?.roles),
      organization: cleanText(person?.organization),
    }));
  }
  return contributorsFromRecord(record).map((person) => ({
    title: person.title,
    path: person.orcid,
    roles: "",
    organization: "",
  }));
};

const normalizeLicenses = (value, metadata) => {
  if (Array.isArray(value) && value.length) {
    return value.map((license) => ({
      title: cleanText(license?.title || license?.name),
      name: cleanText(license?.name || license?.title),
      path: cleanText(license?.path || license?.url),
    }));
  }
  if (metadata?.license) {
    return [
      {
        title: cleanText(metadata.license.title || metadata.license.id),
        name: cleanText(metadata.license.id || metadata.license.title),
        path: cleanText(metadata.license.url),
      },
    ];
  }
  return [];
};

const normalizeSpeciesEntries = (species, taxonomic) => {
  if (Array.isArray(species) && species.length) {
    return species
      .map((entry) => ({
        scientific_name: cleanText(entry?.Scientific_name || entry?.scientific_name || entry?.scientific_name_input),
        common_name: cleanText(entry?.English_name_AviList || entry?.common_name),
        species_code: cleanText(entry?.Species_code_Cornell_Lab || entry?.species_code),
        in_ebirdst: normalizeBoolean(entry?.in_ebirdst),
        iucn_red_list_category: cleanText(entry?.IUCN_Red_List_Category || entry?.iucn_red_list_category).toUpperCase(),
        birdlife_factsheet_url: cleanText(entry?.BirdLife_DataZone_URL || entry?.birdlife_factsheet_url),
        birds_of_the_world_url: cleanText(entry?.Birds_of_the_World_URL || entry?.birds_of_the_world_url),
      }))
      .filter((entry) => entry.scientific_name || entry.common_name);
  }
  return normalizeTaxa(taxonomic);
};

const buildSpeciesLookup = (speciesEntries) => {
  const lookup = new Map();
  speciesEntries.forEach((entry) => {
    const keys = [
      cleanText(entry.scientific_name),
      cleanText(entry.scientific_name_input),
      cleanText(entry.Scientific_name),
    ].filter(Boolean);
    keys.forEach((key) => {
      lookup.set(key, entry);
    });
  });
  return lookup;
};

const normalizeCounts = (value, tables) => {
  const fromDatapackage = value && typeof value === "object" ? value : null;
  const countKeys = [
    "tags",
    "measurements",
    "light",
    "pressure",
    "activity",
    "temperature_external",
    "temperature_internal",
    "magnetic",
    "wet_count",
    "conductivity",
    "paths",
    "pressurepaths",
  ];
  if (fromDatapackage) {
    return Object.fromEntries(countKeys.map((key) => [key, toInt(fromDatapackage[key]) || 0]));
  }
  return {
    tags: uniqueCount(tables.tags || []),
    measurements: uniqueCount(tables.measurements || []),
    light: uniqueCount(tables.light || []),
    pressure: uniqueCount(tables.pressure || []),
    activity: uniqueCount(tables.activity || []),
    temperature_external: uniqueCount(tables.temperature_external || []),
    temperature_internal: uniqueCount(tables.temperature_internal || []),
    magnetic: uniqueCount(tables.magnetic || []),
    wet_count: uniqueCount(tables.wet_count || []),
    conductivity: uniqueCount(tables.conductivity || []),
    paths: uniqueCount(tables.paths || []),
    pressurepaths: uniqueCount(tables.pressurepaths || []),
  };
};

const firstText = (value) => {
  if (Array.isArray(value)) {
    return cleanText(value.find((entry) => cleanText(entry)));
  }
  return cleanText(value);
};

const recordConceptId = (record, recordId) => {
  const doi = record?.metadata?.doi || record?.doi || "";
  const conceptDoi = record?.metadata?.conceptdoi || record?.conceptdoi || "";
  const match = String(conceptDoi || doi).match(/zenodo\.(\d+)$/i);
  return cleanText(record?.conceptrecid || record?.parent?.id || (match ? match[1] : "") || recordId);
};

const projectIdForRecord = (record, recordId) => `private-zenodo-${recordConceptId(record, recordId)}`;

const recordHomepage = (record, recordId) => record?.links?.html || `https://zenodo.org/records/${recordId}`;

const buildProject = (datapackage, record, tables, recordId) => {
  const projectId = projectIdForRecord(record, recordId);
  const conceptId = recordConceptId(record, recordId);
  const metadata = record?.metadata || {};
  const counts = normalizeCounts(datapackage.numberTags, tables);
  const embargo = record?.access?.embargo?.until || datapackage.embargo || "";
  return {
    id: projectId,
    concept_id: conceptId,
    record_id: recordId,
    title: datapackage.title || metadata.title || `Zenodo record ${recordId}`,
    description: cleanText(datapackage.description) || metadata.description || "",
    version: datapackage.version || metadata.version || "",
    created: datapackage.created || metadata.publication_date || record?.created || "",
    status: record?.status || "published",
    access_status: record?.access?.status || datapackage.access_status || "",
    embargo,
    repository:
      firstText(datapackage.codeRepository) ||
      firstText(datapackage.repository) ||
      record?.custom_fields?.["code:codeRepository"] ||
      metadata?.custom?.["code:codeRepository"] ||
      "",
    homepage: datapackage.homepage || recordHomepage(record, recordId),
    keywords:
      datapackage.keywords ||
      (Array.isArray(metadata.keywords) ? metadata.keywords.join(", ") : ""),
    grants: datapackage.grants || "",
    bibliographicCitation: datapackage.bibliographicCitation || metadata.citation || "",
    taxonomic: normalizeSpeciesEntries(datapackage.species, datapackage.taxonomic || datapackage.taxonomicCoverage),
    numberTags: counts,
    counts,
    contributors: normalizeContributors(datapackage.contributors, record),
    licenses: normalizeLicenses(datapackage.licenses, metadata),
    relatedIdentifiers: normalizeRelatedIdentifiers(
      datapackage.relatedIdentifiers || metadata.related_identifiers,
    ),
    temporal: datapackage.temporal || null,
    concept_doi: conceptId ? `https://doi.org/10.5281/zenodo.${conceptId}` : "",
    has_project_data: true,
    is_private: true,
  };
};

const tagMetaFromRow = (row, project, speciesLookup) => {
  const scientificName = cleanText(row.scientific_name);
  const species = speciesLookup.get(scientificName) || {};
  return {
    tag_id: row.tag_id,
    ring_number: row.ring_number || "",
    scientific_name: scientificName,
    common_name: row.common_name || species.common_name || "",
    species_code: row.species_code || species.species_code || "",
    iucn_red_list_category:
      cleanText(row.iucn_red_list_category).toUpperCase() || species.iucn_red_list_category || "",
    birdlife_factsheet_url: row.birdlife_factsheet_url || species.birdlife_factsheet_url || "",
    birds_of_the_world_url: row.birds_of_the_world_url || species.birds_of_the_world_url || "",
    in_ebirdst:
      normalizeBoolean(row.in_ebirdst) ??
      (typeof species.in_ebirdst === "boolean" ? species.in_ebirdst : null),
    manufacturer: row.manufacturer || "",
    model: row.model || "",
    firmware: row.firmware || "",
    weight: row.weight || "",
    attachment_type: row.attachment_type || "",
    readout_method: row.readout_method || "",
    tag_comments: row.tag_comments || "",
    project_id: project.id,
    project_title: project.title,
    is_private: true,
  };
};

const processObservations = (rows) => {
  const byTag = new Map();
  rows.forEach((row) => {
    if (!row.tag_id) {
      return;
    }
    const list = byTag.get(row.tag_id) || [];
    list.push({
      datetime: normalizeDateTime(row.datetime),
      observation_type: row.observation_type || null,
      latitude: toNumber(row.latitude),
      longitude: toNumber(row.longitude),
      location_name: row.location_name || null,
      sex: row.sex || null,
      age_class: row.age_class || null,
      wing_length: toNumber(row.wing_length),
    });
    byTag.set(row.tag_id, list);
  });
  byTag.forEach((list) =>
    list.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()),
  );
  return byTag;
};

const buildTagStats = (observations) => {
  const stats = new Map();
  observations.forEach((list, tagId) => {
    stats.set(tagId, {
      sex: list.find((row) => row.sex && row.sex !== "U")?.sex || null,
      age_class: list.find((row) => row.age_class && row.age_class !== "U")?.age_class || null,
      wing_length: list.find((row) => Number.isFinite(row.wing_length) && row.wing_length > 0)?.wing_length || null,
    });
  });
  return stats;
};

const rowsByTag = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.tag_id) {
      return;
    }
    const list = map.get(row.tag_id) || [];
    list.push(row);
    map.set(row.tag_id, list);
  });
  return map;
};

const buildProjectData = (tags, stapsByTag, pathsByTag, observationsByTag, project) => {
  const tagsPayload = tags.map((tag) => {
    const pathRows = pathsByTag.get(tag.tag_id) || [];
    const mostLikely = pathRows.filter((row) => row.type === "most_likely");
    const sourceRows = mostLikely.length ? mostLikely : pathRows.filter((row) => row.type === "simulation");
    const stapCoords = new Map();
    sourceRows.forEach((row) => {
      const stapId = cleanText(row.stap_id);
      const lon = toNumber(row.lon);
      const lat = toNumber(row.lat);
      if (!stapId || !Number.isFinite(lon) || !Number.isFinite(lat)) {
        return;
      }
      const entry = stapCoords.get(stapId) || { lon: 0, lat: 0, count: 0 };
      entry.lon += lon;
      entry.lat += lat;
      entry.count += 1;
      stapCoords.set(stapId, entry);
    });
    const staps = (stapsByTag.get(tag.tag_id) || [])
      .map((stap) => {
        const stapId = cleanText(stap.stap_id);
        const coords = stapCoords.get(stapId);
        const start = normalizeDateTime(stap.start);
        const end = normalizeDateTime(stap.end);
        const duration = start && end ? Math.max(0, (new Date(end) - new Date(start)) / 86400000) : 0;
        return {
          stap_id: stapId,
          longitude: coords ? Number((coords.lon / coords.count).toFixed(5)) : roundNumber(stap.known_lon, 5),
          latitude: coords ? Number((coords.lat / coords.count).toFixed(5)) : roundNumber(stap.known_lat, 5),
          duration_days: Number(duration.toFixed(2)),
          start,
          end,
        };
      })
      .filter((stap) => Number.isFinite(stap.longitude) && Number.isFinite(stap.latitude));
    return {
      tag_id: tag.tag_id,
      scientific_name: tag.scientific_name,
      common_name: tag.common_name,
      species_code: tag.species_code,
      iucn_red_list_category: tag.iucn_red_list_category,
      birdlife_factsheet_url: tag.birdlife_factsheet_url,
      birds_of_the_world_url: tag.birds_of_the_world_url,
      in_ebirdst: tag.in_ebirdst,
      sex: tag.sex,
      age_class: tag.age_class,
      wing_length: tag.wing_length,
      staps,
    };
  });

  const knownLocations = [];
  observationsByTag.forEach((rows) => {
    rows
      .filter((row) => ["equipment", "retrieval"].includes(String(row.observation_type || "").toLowerCase()))
      .forEach((row) => {
        if (Number.isFinite(row.latitude) && Number.isFinite(row.longitude)) {
          knownLocations.push({
            latitude: row.latitude,
            longitude: row.longitude,
            location_name: row.location_name || "",
            kind: String(row.observation_type || "").toLowerCase(),
          });
        }
      });
  });

  project.has_project_data = tagsPayload.some((tag) => tag.staps.length);
  return { tags: tagsPayload, known_locations: knownLocations };
};

export const processDatapackage = ({ datapackage, tables, record, recordId }) => {
  const project = buildProject(datapackage, record, tables, recordId);
  const speciesEntries = normalizeSpeciesEntries(datapackage.species, datapackage.taxonomic || datapackage.taxonomicCoverage);
  const speciesLookup = buildSpeciesLookup(speciesEntries);
  const tagRows = tables.tags || [];
  const observationsByTag = processObservations(tables.observations || []);
  const statsByTag = buildTagStats(observationsByTag);
  const stapsByTag = rowsByTag(tables.staps || []);
  const pathsByTag = rowsByTag(tables.paths || []);
  const edgesByTag = rowsByTag(tables.edges || []);
  const pressureByTag = rowsByTag(tables.pressurepaths || []);

  const tags = tagRows
    .map((row) => {
      const tag = tagMetaFromRow(row, project, speciesLookup);
      const stats = statsByTag.get(tag.tag_id) || {};
      tag.sex = stats.sex;
      tag.age_class = stats.age_class;
      tag.wing_length = stats.wing_length;
      return tag;
    })
    .filter((tag) => stapsByTag.has(tag.tag_id) && pathsByTag.has(tag.tag_id));

  const projectData = buildProjectData(tags, stapsByTag, pathsByTag, observationsByTag, project);
  const tagDataById = Object.fromEntries(
    tags.map((tag) => {
      const pathRows = pathsByTag.get(tag.tag_id) || [];
      const stapRows = stapsByTag.get(tag.tag_id) || [];
      const edgeRows = edgesByTag.get(tag.tag_id) || [];
      const pressureRows = pressureByTag.get(tag.tag_id) || [];
      return [
        tag.tag_id,
        {
          ...tag,
          paths: tableToColumns(
            pathRows.filter((row) => !row.j || Number(row.j) <= 10),
            ["stap_id", "type", "lat", "lon"],
            { stap_id: toInt, lat: (v) => roundNumber(v, 4), lon: (v) => roundNumber(v, 4) },
          ),
          staps: tableToColumns(
            stapRows,
            Object.keys(stapRows[0] || {}).filter((key) => key !== "tag_id" && key !== "known_lat" && key !== "known_lon"),
            { stap_id: toInt, start: normalizeDateTime, end: normalizeDateTime },
          ),
          edges: tableToColumns(
            edgeRows,
            Object.keys(edgeRows[0] || {}).filter((key) => key !== "tag_id"),
            { stap_s: toInt, stap_t: toInt, distance: (v) => roundNumber(v, 1), bearing: (v) => roundNumber(v, 1) },
          ),
          observations: observationsByTag.get(tag.tag_id) || [],
          pressurepath: tableToColumns(
            pressureRows.filter((row) => !row.j || Number(row.j) <= 10),
            Object.keys(pressureRows[0] || {}).filter(
              (key) => !["tag_id", "ind", "location_name", "life_stage", "nb_sample"].includes(key),
            ),
            {
              stap_id: (v) => roundNumber(v, 3),
              lat: (v) => roundNumber(v, 4),
              lon: (v) => roundNumber(v, 4),
              altitude: toInt,
              pressure: (v) => roundNumber(v, 1),
              pressure_norm: (v) => roundNumber(v, 1),
              datetime: normalizeDateTime,
              t: normalizeDateTime,
            },
          ),
        },
      ];
    }),
  );

  return {
    id: project.id,
    title: project.title,
    recordId,
    project,
    projectData,
    tags: tags.map((tag) => ({
      tag_id: tag.tag_id,
      common_name: tag.common_name,
      scientific_name: tag.scientific_name,
      project_id: tag.project_id,
      project_title: tag.project_title,
      species_code: tag.species_code,
      iucn_red_list_category: tag.iucn_red_list_category,
      birdlife_factsheet_url: tag.birdlife_factsheet_url,
      birds_of_the_world_url: tag.birds_of_the_world_url,
      is_private: true,
    })),
    tagDataById,
  };
};

export const loadZenodoDatapackage = async ({ record: recordInput, token, onProgress = noop }) => {
  const recordId = extractRecordId(recordInput);
  const headers = buildHeaders(token);
  onProgress(`Resolving Zenodo record ${recordId}...`);
  const record = await fetchJSON(`${ZENODO_API}/${recordId}`, headers);
  const files = Array.isArray(record.files) ? record.files : [];
  if (!files.length) {
    throw new Error(describeAccessProblem(record, token));
  }
  const fileByName = new Map(files.map((file) => [basename(file.key || file.filename || file.name), file]));
  const datapackageFile = files.find((file) => basename(file.key || file.filename || file.name) === "datapackage.json");
  if (!datapackageFile) {
    const availableFiles = files
      .map((file) => basename(file.key || file.filename || file.name))
      .filter(Boolean)
      .slice(0, 8);
    throw new Error(
      availableFiles.length
        ? `This Zenodo record does not expose a datapackage.json file. Visible files: ${availableFiles.join(", ")}.`
        : describeAccessProblem(record, token),
    );
  }
  onProgress(`Downloading datapackage.json from Zenodo record ${recordId}...`);
  const datapackage = JSON.parse(await fetchText(zenodoFileUrl(datapackageFile), headers));
  const resources = Array.isArray(datapackage.resources) ? datapackage.resources : [];
  const tables = {};
  const downloadableResources = resources.filter((resource) => {
    const path = Array.isArray(resource.path) ? resource.path[0] : resource.path;
    return resource.name && fileByName.get(basename(path));
  });
  onProgress(
    `Found ${downloadableResources.length} datapackage resource${downloadableResources.length === 1 ? "" : "s"}.`,
  );
  for (const [index, resource] of downloadableResources.entries()) {
    const name = resource.name;
    const path = Array.isArray(resource.path) ? resource.path[0] : resource.path;
    const file = fileByName.get(basename(path));
    if (!name || !file || basename(path) === "datapackage.json") {
      continue;
    }
    onProgress(`Downloading ${name} (${index + 1}/${downloadableResources.length})...`);
    const text = await fetchText(zenodoFileUrl(file), headers);
    onProgress(`Parsing ${name} (${index + 1}/${downloadableResources.length})...`);
    tables[name] = parseCSV(text);
  }
  onProgress("Transforming datapackage into project and tag views...");
  return processDatapackage({ datapackage, tables, record, recordId });
};
