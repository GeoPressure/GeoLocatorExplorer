import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

let data;
let store;
const publicProject = { id: "123", concept_id: "123", record_id: "124", title: "Public title" };
const record = {
  id: "private-zenodo-123", recordId: "124",
  project: { ...publicProject, id: "private-zenodo-123", title: "Private title" },
  tags: [{ tag_id: "bird", project_title: "Private title" }],
  projectData: { tags: [{ tag_id: "bird", staps: [] }], known_locations: [] },
  tagDataById: { bird: {
    paths: [{ type: "most_likely", stap_id: 1, lon: -3, lat: 52 }],
    staps: [{ stap_id: 1, start: "2024-01-01", end: "2024-01-03" }],
  } },
};

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    if (String(url).endsWith("projects.json")) return Response.json([publicProject]);
    if (String(url).endsWith("tags.json")) return Response.json([{ tag_id: "bird", project_id: "123" }]);
    if (String(url).endsWith("globe.json")) return Response.json([]);
    return Response.json({ tags: [], known_locations: [] });
  });
  data = await import("../src/lib/data");
  store = await import("../src/lib/privateDatapackageStore");
  await store.savePrivateDatapackage(record);
});
afterEach(() => vi.unstubAllGlobals());

test("overlays public projects and tags with the cached private data", async () => {
  expect(await data.loadProjects()).toEqual([expect.objectContaining({ id: "123", title: "Private title", is_private: true })]);
  expect(await data.loadTags()).toEqual([expect.objectContaining({ tag_id: "bird", project_id: "123", is_private: true })]);
  expect(await data.loadProjectData("123")).toEqual(record.projectData);
  expect(await data.loadTagData("bird")).toMatchObject({ project_id: "123", project_title: "Private title", is_private: true });
});

test("restores the public project and data after removing a private cache", async () => {
  await data.loadProjectData("123");
  await store.deletePrivateDatapackage(record.id);
  expect(await data.loadProjects()).toEqual([publicProject]);
  expect(await data.loadProjectData("123")).toEqual({ tags: [], known_locations: [] });
});

test.each([null, ""])("does not plot missing private coordinates (%s) at zero", async (missing) => {
  await store.savePrivateDatapackage({ ...record, tagDataById: { bird: { ...record.tagDataById.bird, paths: [{ type: "most_likely", stap_id: 1, lon: missing, lat: missing }] } } });
  expect(await data.loadGlobe()).toEqual([]);
});

test("retains valid zero coordinates in the globe", async () => {
  await store.savePrivateDatapackage({ ...record, tagDataById: { bird: { ...record.tagDataById.bird, paths: [{ type: "most_likely", stap_id: 1, lon: 0, lat: 0 }] } } });
  const globe = await data.loadGlobe();
  expect(globe).toHaveLength(1);
  expect(globe[0].project_id).toBe("123");
  expect(globe[0].positions.filter(Boolean)).toEqual([[0, 0], [0, 0]]);
});
