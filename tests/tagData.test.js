import { expect, test } from "vitest";
import { advanceAlongTimeline, buildHeadings, buildMetrics, buildTimeTimeline, buildDistanceTimeline, normalizePressureData, smoothAngle, findClosestIndex, buildFallbackTimelines } from "../src/lib/tagData";

test("does not offer pressure metrics with only missing values", () => {
  expect(buildMetrics({ altitude: [null, null], surface_pressure: ["", null] })).toEqual([]);
  expect(buildMetrics({ altitude: [0, null] })).toEqual(["altitude"]);
});

test("skips missing coordinates while preserving valid zero coordinates", () => {
  const timeline = buildTimeTimeline({
    datetime: ["2024-01-01", "2024-01-02", "2024-01-03"],
    lon: [null, -3, 0], lat: [52, null, 0], altitude: [null, null, 0],
    values: { surface_pressure: [null, null, null] },
  });
  expect(timeline).toHaveLength(1);
  expect(timeline[0]).toMatchObject({ index: 2, lon: 0, lat: 0, metrics: { altitude: 0, surface_pressure: null } });
});

test("averages observed pressure values without treating missing values as zero", () => {
  const timeline = buildDistanceTimeline([
    { lon: -3, lat: 52, metrics: { altitude: 10, surface_pressure: 1000 } },
    { lon: -3, lat: 52, metrics: { altitude: null, surface_pressure: null } },
    { lon: -2, lat: 52, metrics: { altitude: null, surface_pressure: null } },
  ]);
  expect(timeline[0].metrics).toEqual({ altitude: 10, surface_pressure: 1000 });
  expect(timeline[1].metrics).toEqual({ altitude: null, surface_pressure: null });
  expect(timeline[1].distanceKm).toBeGreaterThan(0);
});

test("uses most-likely pressure samples instead of mixing them with simulations", () => {
  const normalized = normalizePressureData({ datetime: ["2024-01-01", "2024-01-01"], lon: [1, 2], lat: [51, 52], altitude: [10, 20], type: ["simulation", "most_likely"] });
  expect(normalized.lon).toEqual([2]);
  expect(normalized.altitude).toEqual([20]);
});

test("smooths bearings across the 180 degree boundary", () => {
  expect(smoothAngle(179, -179, 0.5)).toBe(-180);
});

test("finds the nearest timestamp and chooses the earlier one on a tie", () => {
  const samples = [{ ms: 10 }, { ms: 20 }, { ms: 30 }];
  expect(findClosestIndex(samples, 26, "ms")).toBe(2);
  expect(findClosestIndex(samples, 15, "ms")).toBe(0);
});


test.each([null, ""])("does not fabricate fallback paths from missing coordinates (%s)", (missing) => {
  expect(buildFallbackTimelines([{ type: "most_likely", stap_id: 1, lon: missing, lat: missing }], [{ stap_id: 1, start: "2024-01-01", end: "2024-01-03" }])).toEqual({ timeTimeline: [], distanceTimeline: [] });
});


test("keeps missing altitude out of distance averages while rendering it at ground level", () => {
  const timeline = buildTimeTimeline({ datetime: ["2024-01-01", "2024-01-02"], lon: [-3, -3], lat: [52, 52], altitude: [null, 10] });
  expect(timeline[0].altitude).toBe(0);
  expect(timeline[0].metrics.altitude).toBeNull();
  expect(buildDistanceTimeline(timeline)[0].metrics.altitude).toBe(10);
});

test("buildHeadings skips stationary rows and looks ahead to the next movement", () => {
  const timeline = [
    { lon: 0, lat: 0 },
    { lon: 0, lat: 0 },
    { lon: 0, lat: 0.0001 },
    { lon: 1, lat: 0 },
    { lon: 1, lat: 1 },
  ];
  const headings = buildHeadings(timeline, 2);
  expect(headings).toHaveLength(5);
  // Stationary rows face the upcoming eastward flight instead of defaulting to north.
  expect(headings[0]).toBeCloseTo(90, 0);
  expect(headings[1]).toBeCloseTo(90, 0);
  expect(headings[3]).toBeCloseTo(0, 0);
  // Last row has nothing ahead and keeps the previous heading.
  expect(headings[4]).toBeCloseTo(headings[3], 6);
  expect(buildHeadings([], 2)).toEqual([]);
});

test("advanceAlongTimeline caps distance travelled but not time spent stationary", () => {
  // Three stationary rows, then two moving rows ~111 km apart, then the end.
  const timeline = [
    { lon: 0, lat: 0 },
    { lon: 0, lat: 0 },
    { lon: 0, lat: 0 },
    { lon: 1, lat: 0 },
    { lon: 2, lat: 0 },
    { lon: 2, lat: 0 },
  ];
  // Stationary rows pass at full row speed even with a tight km cap.
  expect(advanceAlongTimeline(timeline, 0, 0, 2, 1)).toEqual({ index: 2, frac: 0 });
  // A moving segment is capped: ~111 km segment, 11.1 km allowed -> ~10% of the way.
  const capped = advanceAlongTimeline(timeline, 2, 0, 1, 11.12);
  expect(capped.index).toBe(2);
  expect(capped.frac).toBeCloseTo(0.1, 2);
  // Without a cap it advances by whole rows and keeps the fraction.
  const free = advanceAlongTimeline(timeline, 2, 0.5, 1.25);
  expect(free.index).toBe(3);
  expect(free.frac).toBeCloseTo(0.75, 6);
  // Reaching the end wraps to the start.
  expect(advanceAlongTimeline(timeline, 5, 0, 1)).toEqual({ index: 0, frac: 0 });
});
