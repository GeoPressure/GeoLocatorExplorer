import { expect, test } from "vitest";
import { buildMetrics, buildTimeTimeline, buildDistanceTimeline, normalizePressureData, smoothAngle, findClosestIndex, buildFallbackTimelines } from "../src/lib/tagData";

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
