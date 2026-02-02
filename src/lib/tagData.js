const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const lerp = (from, to, t) => from + (to - from) * t;

export const median = (values) => {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const findClosestIndex = (list, target, key) => {
  if (!list.length || !Number.isFinite(target)) {
    return 0;
  }
  let low = 0;
  let high = list.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (list[mid][key] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  if (low > 0) {
    const prev = list[low - 1][key];
    const curr = list[low][key];
    return Math.abs(target - prev) <= Math.abs(curr - target) ? low - 1 : low;
  }
  return low;
};

export const normalizeAngle = (value) => ((value + 540) % 360) - 180;

export const smoothAngle = (current, target, alpha) => {
  if (current == null) {
    return target;
  }
  const delta = normalizeAngle(target - current);
  return normalizeAngle(current + delta * alpha);
};

export const smoothingAlpha = (deltaMs, timeConstantMs) => {
  if (!Number.isFinite(timeConstantMs) || timeConstantMs <= 0) {
    return 1;
  }
  const dt = Math.max(0, Number(deltaMs) || 0);
  return 1 - Math.exp(-dt / timeConstantMs);
};

export const bearingDegrees = (from, to) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const toDeg = (value) => (value * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

export const destinationPoint = (from, bearing, distanceKm) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const toDeg = (value) => (value * 180) / Math.PI;
  const radius = 6371;
  const angular = distanceKm / radius;
  const bearingRad = toRad(bearing);
  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lon);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearingRad),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return {
    lat: toDeg(lat2),
    lon: ((toDeg(lon2) + 540) % 360) - 180,
  };
};

export const normalizeTable = (raw) => {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw !== "object") {
    return [];
  }
  const columns = Object.keys(raw).filter((key) => Array.isArray(raw[key]));
  if (!columns.length) {
    return [];
  }
  const length = Math.max(...columns.map((key) => raw[key].length));
  return Array.from({ length }, (_, index) => {
    const row = {};
    columns.forEach((key) => {
      row[key] = raw[key][index];
    });
    return row;
  });
};

export const buildMetrics = (values) => {
  const allow = new Set(["altitude", "surface_pressure"]);
  if (!values || typeof values !== "object") {
    return [];
  }
  return Object.keys(values).filter((name) => {
    if (!allow.has(name)) {
      return false;
    }
    const series = values[name];
    if (!Array.isArray(series) || !series.length) {
      return false;
    }
    return series.some((value) => Number.isFinite(Number(value)));
  });
};

export const normalizePressureData = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  let vectors = {};
  if (Array.isArray(raw.columns) && (Array.isArray(raw.points) || Array.isArray(raw.rows))) {
    const rows = Array.isArray(raw.points) ? raw.points : raw.rows;
    raw.columns.forEach((name, idx) => {
      vectors[name] = rows.map((row) => row?.[idx]);
    });
  } else {
    Object.keys(raw).forEach((key) => {
      if (Array.isArray(raw[key])) {
        vectors[key] = raw[key];
      }
    });
  }

  const datetimeKey = vectors.datetime ? "datetime" : vectors.t ? "t" : null;
  if (!datetimeKey || !vectors.lon || !vectors.lat) {
    return null;
  }

  const requiredKeys = [datetimeKey, "lon", "lat", "altitude", "surface_pressure", "type"].filter(
    Boolean,
  );
  const lengths = requiredKeys
    .map((key) => (Array.isArray(vectors[key]) ? vectors[key].length : null))
    .filter((value) => Number.isFinite(value));
  const minLength = lengths.length ? Math.min(...lengths) : 0;
  if (!minLength) {
    return null;
  }

  const keepMostLikely = Array.isArray(vectors.type)
    ? vectors.type.slice(0, minLength).includes("most_likely")
    : false;
  const indices = [];
  for (let i = 0; i < minLength; i += 1) {
    if (!keepMostLikely || vectors.type[i] === "most_likely") {
      indices.push(i);
    }
  }

  const pick = (key) => (vectors[key] ? indices.map((idx) => vectors[key][idx]) : []);

  const datetime = pick(datetimeKey);
  const lon = pick("lon");
  const lat = pick("lat");
  const altitude = pick("altitude");
  const surfacePressure = pick("surface_pressure");
  const stapId = pick("stap_id");

  const length = Math.min(datetime.length, lon.length, lat.length);
  const trimmed = (arr) => (Array.isArray(arr) ? arr.slice(0, length) : []);

  const values = {};
  if (altitude.length) {
    values.altitude = trimmed(altitude);
  }
  if (surfacePressure.length) {
    values.surface_pressure = trimmed(surfacePressure);
  }

  return {
    length,
    datetimeKey,
    datetime: trimmed(datetime),
    lon: trimmed(lon),
    lat: trimmed(lat),
    altitude: trimmed(altitude),
    values,
    stap_id: trimmed(stapId),
  };
};

export const haversineKm = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const buildTimeTimeline = (data) => {
  if (
    !data ||
    !Array.isArray(data.datetime) ||
    !Array.isArray(data.lon) ||
    !Array.isArray(data.lat)
  ) {
    return [];
  }
  const length = Math.min(data.datetime.length, data.lon.length, data.lat.length);
  const timeline = [];
  for (let i = 0; i < length; i += 1) {
    const lon = Number(data.lon[i]);
    const lat = Number(data.lat[i]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      continue;
    }
    const datetime = data.datetime[i];
    const ms = Date.parse(datetime);
    if (!datetime || Number.isNaN(ms)) {
      continue;
    }
    const rawAlt = data.altitude?.[i];
    const rawSurface = data.values?.surface_pressure?.[i];
    const stapId = data.stap_id?.[i];
    const altitude = Number.isFinite(Number(rawAlt)) ? Math.max(0, Number(rawAlt)) : 0;
    const surfacePressure = Number.isFinite(Number(rawSurface)) ? Number(rawSurface) : null;
    timeline.push({
      index: i,
      datetime,
      ms,
      lon,
      lat,
      stapId,
      altitude,
      metrics: {
        altitude: Number.isFinite(altitude) ? altitude : null,
        surface_pressure: surfacePressure,
      },
    });
  }
  return timeline;
};

export const buildDistanceTimeline = (timeline) => {
  if (!timeline.length) return [];

  const out = [];
  let prevOut = null;
  let distanceKm = 0;

  let lat = null;
  let lon = null;
  let count = 0;
  let altSum = 0;
  let surfSum = 0;
  let lastEntry = null;

  const flush = () => {
    if (!count) return;

    if (prevOut) {
      distanceKm += haversineKm(prevOut, lastEntry);
    }

    const avgAlt = altSum / count;
    const avgSurf = surfSum / count;

    const next = {
      ...lastEntry,
      altitude: Number.isFinite(avgAlt) ? avgAlt : lastEntry.altitude,
      distanceKm: Math.round(distanceKm),
      metrics: {
        altitude: Number.isFinite(avgAlt) ? avgAlt : null,
        surface_pressure: Number.isFinite(avgSurf) ? avgSurf : null,
      },
    };

    out.push(next);
    prevOut = next;
    count = altSum = surfSum = 0;
  };

  for (const e of timeline) {
    const sameLocation = lat !== null && Number(e.lat) === lat && Number(e.lon) === lon;

    if (!sameLocation) {
      flush();
      lat = Number(e.lat);
      lon = Number(e.lon);
    }

    const alt = Number(e.metrics?.altitude);
    const surf = Number(e.metrics?.surface_pressure);

    if (Number.isFinite(alt)) altSum += alt;
    if (Number.isFinite(surf)) surfSum += surf;

    count += 1;
    lastEntry = e;
  }

  flush();
  return out;
};

const resampleTimeline = (timeline, stepMs) => {
  if (!Array.isArray(timeline) || timeline.length < 2 || !Number.isFinite(stepMs) || stepMs <= 0) {
    return Array.isArray(timeline) ? timeline : [];
  }
  const startMs = Number(timeline[0]?.ms);
  const endMs = Number(timeline[timeline.length - 1]?.ms);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return timeline;
  }
  const out = [];
  let idx = 0;
  for (let ms = startMs; ms <= endMs; ms += stepMs) {
    while (idx < timeline.length - 2 && Number(timeline[idx + 1]?.ms) < ms) {
      idx += 1;
    }
    const prev = timeline[idx];
    const next = timeline[Math.min(idx + 1, timeline.length - 1)];
    const prevMs = Number(prev?.ms);
    const nextMs = Number(next?.ms);
    const t =
      Number.isFinite(prevMs) && Number.isFinite(nextMs) && nextMs > prevMs
        ? Math.min(Math.max((ms - prevMs) / (nextMs - prevMs), 0), 1)
        : 0;
    out.push({
      index: out.length,
      datetime: new Date(ms).toISOString(),
      ms,
      lon: lerp(Number(prev.lon), Number(next.lon), t),
      lat: lerp(Number(prev.lat), Number(next.lat), t),
      stapId: prev.stapId ?? next.stapId ?? "",
      altitude: 0,
      metrics: { altitude: 0, surface_pressure: null },
    });
  }
  const last = timeline[timeline.length - 1];
  if (out.length && out[out.length - 1].ms < endMs) {
    out.push({
      ...last,
      index: out.length,
      datetime: new Date(endMs).toISOString(),
      ms: endMs,
      altitude: 0,
      metrics: { altitude: 0, surface_pressure: null },
    });
  }
  return out;
};

const buildPathContext = (pathsRaw, stapsRaw) => {
  const pathRows = normalizeTable(pathsRaw);
  if (!pathRows.length) {
    return null;
  }
  const mostLikelyRows = pathRows.filter((row) => row?.type === "most_likely");
  const sourceRows = mostLikelyRows.length
    ? mostLikelyRows
    : pathRows.filter((row) => row?.type === "simulation");
  if (!sourceRows.length) {
    return null;
  }

  const stapRows = normalizeTable(stapsRaw);
  const stapTimeMap = new Map();
  const stapDurations = [];
  const knownTimes = [];

  stapRows.forEach((row) => {
    const stapId = row?.stap_id != null ? String(row.stap_id) : "";
    if (!stapId) {
      return;
    }
    const startMs = row?.start ? new Date(row.start).getTime() : null;
    const endMs = row?.end ? new Date(row.end).getTime() : null;
    const startTime = Number.isFinite(startMs) ? startMs : null;
    const endTime = Number.isFinite(endMs) ? endMs : null;
    if (Number.isFinite(startTime)) {
      knownTimes.push(startTime);
    }
    if (Number.isFinite(endTime)) {
      knownTimes.push(endTime);
    }
    if (Number.isFinite(startTime) && Number.isFinite(endTime) && endTime >= startTime) {
      stapDurations.push(endTime - startTime);
    }
    stapTimeMap.set(stapId, { startMs: startTime, endMs: endTime });
  });

  const pointsByStap = new Map();
  const seenOrder = [];

  sourceRows.forEach((row) => {
    const lon = Number(row?.lon);
    const lat = Number(row?.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return;
    }
    const rawStapId = row?.stap_id ?? row?.stapId ?? "";
    const stapId = rawStapId != null ? String(rawStapId) : "";
    if (!pointsByStap.has(stapId)) {
      pointsByStap.set(stapId, []);
      seenOrder.push(stapId);
    }
    pointsByStap.get(stapId).push({ lon, lat, stapId });
  });

  if (!seenOrder.length) {
    return null;
  }

  const orderedStaps = (() => {
    const withTime = [];
    const withoutTime = [];
    seenOrder.forEach((stapId, index) => {
      const startMs = stapTimeMap.get(stapId)?.startMs;
      if (Number.isFinite(startMs)) {
        withTime.push({ stapId, startMs, index });
      } else {
        withoutTime.push({ stapId, index });
      }
    });
    withTime.sort((a, b) => (a.startMs - b.startMs) || (a.index - b.index));
    return [...withTime.map((item) => item.stapId), ...withoutTime.map((item) => item.stapId)];
  })();

  const defaultDurationMs = median(stapDurations) || MS_PER_DAY;
  const baseTimeMs = knownTimes.length ? Math.min(...knownTimes) : Date.UTC(2000, 0, 1);

  return {
    orderedStaps,
    pointsByStap,
    stapTimeMap,
    defaultDurationMs,
    baseTimeMs,
  };
};

const buildFallbackTimeTimeline = (context) => {
  const { orderedStaps, pointsByStap, stapTimeMap, defaultDurationMs, baseTimeMs } = context;
  const timeline = [];
  let cursorMs = null;

  orderedStaps.forEach((stapId, index) => {
    const points = pointsByStap.get(stapId) || [];
    if (!points.length) {
      return;
    }
    const meta = stapTimeMap.get(stapId) || {};
    let startMs = Number.isFinite(meta.startMs) ? meta.startMs : null;
    let endMs = Number.isFinite(meta.endMs) ? meta.endMs : null;
    const nextStapId = orderedStaps[index + 1];
    const nextStartMs = Number.isFinite(stapTimeMap.get(nextStapId)?.startMs)
      ? stapTimeMap.get(nextStapId).startMs
      : null;

    if (!Number.isFinite(startMs)) {
      if (Number.isFinite(cursorMs)) {
        startMs = cursorMs;
      } else if (Number.isFinite(endMs)) {
        startMs = endMs - defaultDurationMs;
      } else {
        startMs = baseTimeMs;
      }
    }

    if (!Number.isFinite(endMs)) {
      if (Number.isFinite(nextStartMs) && nextStartMs >= startMs) {
        endMs = nextStartMs;
      } else {
        endMs = startMs + defaultDurationMs;
      }
    }

    if (endMs <= startMs) {
      endMs = startMs + defaultDurationMs;
    }

    const span = points.length > 1 ? (endMs - startMs) / (points.length - 1) : 0;
    points.forEach((point, pointIndex) => {
      const ms = Math.round(startMs + span * pointIndex);
      timeline.push({
        index: timeline.length,
        datetime: new Date(ms).toISOString(),
        ms,
        lon: point.lon,
        lat: point.lat,
        stapId,
        altitude: 0,
        metrics: { altitude: 0, surface_pressure: null },
      });
    });

    cursorMs = endMs;

    const nextPoints = nextStapId ? pointsByStap.get(nextStapId) : null;
    if (nextPoints?.length) {
      const travelStart = endMs;
      const travelEnd =
        Number.isFinite(nextStartMs) && nextStartMs > travelStart
          ? nextStartMs
          : travelStart + defaultDurationMs;
      const travelGap = travelEnd - travelStart;
      if (travelGap > 0) {
        const from = points[points.length - 1];
        const to = nextPoints[0];
        const stepCount = Math.min(12, Math.max(2, Math.round(travelGap / MS_PER_DAY)));
        for (let step = 1; step < stepCount; step += 1) {
          const t = step / stepCount;
          const ms = Math.round(travelStart + travelGap * t);
          timeline.push({
            index: timeline.length,
            datetime: new Date(ms).toISOString(),
            ms,
            lon: lerp(from.lon, to.lon, t),
            lat: lerp(from.lat, to.lat, t),
            stapId,
            altitude: 0,
            metrics: { altitude: 0, surface_pressure: null },
          });
        }
      }
    }
  });

  return timeline;
};

const buildFallbackDistanceTimeline = (context, options) => {
  const distanceMinStepKm =
    Number.isFinite(options?.distanceMinStepKm) && options.distanceMinStepKm > 0
      ? options.distanceMinStepKm
      : 5;
  const distanceTargetPoints =
    Number.isFinite(options?.distanceTargetPoints) && options.distanceTargetPoints > 0
      ? options.distanceTargetPoints
      : 800;

  const { orderedStaps, pointsByStap } = context;
  const points = [];
  orderedStaps.forEach((stapId) => {
    const list = pointsByStap.get(stapId) || [];
    list.forEach((point) => points.push(point));
  });
  if (!points.length) {
    return [];
  }
  const cleaned = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = cleaned[cleaned.length - 1];
    const next = points[i];
    if (Number(prev.lon) === Number(next.lon) && Number(prev.lat) === Number(next.lat)) {
      continue;
    }
    cleaned.push(next);
  }
  if (cleaned.length < 2) {
    return [
      {
        index: 0,
        lon: cleaned[0].lon,
        lat: cleaned[0].lat,
        stapId: cleaned[0].stapId ?? "",
        distanceKm: 0,
        altitude: 0,
        metrics: { altitude: 0, surface_pressure: null },
      },
    ];
  }

  const segments = [];
  let totalKm = 0;
  for (let i = 1; i < cleaned.length; i += 1) {
    const from = cleaned[i - 1];
    const to = cleaned[i];
    const dist = haversineKm(from, to);
    if (!Number.isFinite(dist) || dist <= 0) {
      continue;
    }
    segments.push({ from, to, dist });
    totalKm += dist;
  }
  if (!segments.length || totalKm <= 0) {
    const first = cleaned[0];
    return [
      {
        index: 0,
        lon: first.lon,
        lat: first.lat,
        stapId: first.stapId ?? "",
        distanceKm: 0,
        altitude: 0,
        metrics: { altitude: 0, surface_pressure: null },
      },
    ];
  }

  const stepKm = Math.max(distanceMinStepKm, totalKm / distanceTargetPoints);
  const out = [];
  let segmentIndex = 0;
  let segmentStartKm = 0;

  for (let distance = 0; distance <= totalKm; distance += stepKm) {
    while (
      segmentIndex < segments.length - 1 &&
      segmentStartKm + segments[segmentIndex].dist < distance
    ) {
      segmentStartKm += segments[segmentIndex].dist;
      segmentIndex += 1;
    }
    const segment = segments[segmentIndex];
    const t =
      segment.dist > 0
        ? Math.min(Math.max((distance - segmentStartKm) / segment.dist, 0), 1)
        : 0;
    out.push({
      index: out.length,
      lon: lerp(segment.from.lon, segment.to.lon, t),
      lat: lerp(segment.from.lat, segment.to.lat, t),
      stapId: segment.from.stapId ?? segment.to.stapId ?? "",
      distanceKm: distance,
      altitude: 0,
      metrics: { altitude: 0, surface_pressure: null },
    });
  }

  const lastSegment = segments[segments.length - 1];
  if (out.length && out[out.length - 1].distanceKm < totalKm) {
    out.push({
      index: out.length,
      lon: lastSegment.to.lon,
      lat: lastSegment.to.lat,
      stapId: lastSegment.to.stapId ?? "",
      distanceKm: totalKm,
      altitude: 0,
      metrics: { altitude: 0, surface_pressure: null },
    });
  }
  return out;
};

export const buildFallbackTimelines = (pathsRaw, stapsRaw, options = {}) => {
  const context = buildPathContext(pathsRaw, stapsRaw);
  if (!context) {
    return { timeTimeline: [], distanceTimeline: [] };
  }
  const timeStepDays =
    Number.isFinite(options.timeStepDays) && options.timeStepDays > 0 ? options.timeStepDays : 1;
  const timeTimeline = resampleTimeline(
    buildFallbackTimeTimeline(context),
    timeStepDays * MS_PER_DAY,
  );
  const distanceTimeline = buildFallbackDistanceTimeline(context, options);
  return { timeTimeline, distanceTimeline };
};
