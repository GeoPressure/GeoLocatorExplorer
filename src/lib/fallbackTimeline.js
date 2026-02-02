const MS_PER_DAY = 1000 * 60 * 60 * 24;

const lerp = (from, to, t) => from + (to - from) * t;

const median = (values) => {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const normalizeTable = (raw) => {
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

const haversineKm = (a, b) => {
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

const buildTimeTimeline = (context) => {
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
        const stepCount = Math.min(
          12,
          Math.max(2, Math.round(travelGap / MS_PER_DAY)),
        );
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

const buildDistanceTimeline = (context, options) => {
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
  const timeTimeline = resampleTimeline(buildTimeTimeline(context), timeStepDays * MS_PER_DAY);
  const distanceTimeline = buildDistanceTimeline(context, options);
  return { timeTimeline, distanceTimeline };
};
