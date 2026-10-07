import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import Project from "../src/pages/Project.vue";
import { loadZenodoDatapackage } from "../src/lib/datapackageProcessor";
import { listPrivateDatapackages, savePrivateDatapackage } from "../src/lib/privateDatapackageStore";

vi.mock("mapbox-gl", () => ({ default: { Map: class { once() {} remove() {} } } }));
vi.mock("../src/lib/datapackageProcessor", () => ({ loadZenodoDatapackage: vi.fn() }));
vi.mock("../src/lib/privateDatapackageStore", async (importOriginal) => ({
  ...await importOriginal(),
  listPrivateDatapackages: vi.fn(),
  savePrivateDatapackage: vi.fn(),
  deletePrivateDatapackage: vi.fn(),
}));

const publicProject = { id: "123", concept_id: "123", record_id: "124", title: "Test migration" };
const importedRecord = {
  id: "private-zenodo-123",
  recordId: "124",
  project: { ...publicProject, id: "private-zenodo-123", is_private: true },
  tags: [],
  projectData: { tags: [], known_locations: [] },
};
let wrapper;
let router;
let records;

beforeEach(async () => {
  records = [];
  vi.clearAllMocks();
  listPrivateDatapackages.mockImplementation(async () => records);
  savePrivateDatapackage.mockImplementation(async (record) => {
    records = [record];
    window.dispatchEvent(new CustomEvent("private-datapackages:changed"));
  });
  loadZenodoDatapackage.mockResolvedValue(importedRecord);
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    Response.json(String(url).endsWith("projects.json") ? [{ id: "99", concept_id: "99", record_id: "100", title: "Another project" }, publicProject] : { tags: [], known_locations: [] }),
  );
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/project/:conceptId?", name: "project", component: Project }] });
  await router.push("/project/123");
  await router.isReady();
});
afterEach(() => wrapper?.unmount());

test.each([
  ["a project already in the public list", importedRecord, "123"],
  ["a project absent from the public list", {
    ...importedRecord,
    id: "private-zenodo-456",
    recordId: "457",
    project: { ...importedRecord.project, id: "private-zenodo-456", concept_id: "456", record_id: "457" },
  }, "456"],
])("selects %s after importing and keeps its panel after closing", async (_name, record, canonicalId) => {
  loadZenodoDatapackage.mockResolvedValue(record);
  wrapper = mount(Project, { global: { plugins: [router] } });
  await flushPromises();
  await wrapper.get('[aria-label="Manage private Zenodo datapackages"]').trigger("click");
  await flushPromises();
  expect(wrapper.findAll("a").some((link) => link.text().includes("Selected record"))).toBe(false);
  await wrapper.get('[name="zenodo_record"]').setValue(`https://zenodo.org/records/${record.recordId}?token=share-secret`);
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(savePrivateDatapackage).toHaveBeenCalledWith(record);
  expect(router.currentRoute.value.params.conceptId).toBe(canonicalId);
  expect(wrapper.get("h2").text()).toContain("Test migration");
  expect(wrapper.get("h2").text()).toContain("Private");
  expect(wrapper.get('[role="combobox"]').element.value).toBe("Test migration");
  expect(wrapper.get('[name="zenodo_record"]').element.value).toBe("");
  expect(wrapper.get(`a[href="https://zenodo.org/records/${record.recordId}"]`).text()).toContain("Selected record");
  await wrapper.findAll("button").find((button) => button.text() === "Close").trigger("click");
  expect(wrapper.find("form").exists()).toBe(false);
  expect(wrapper.get("h2").text()).toContain("Test migration");
  expect(wrapper.get('[role="combobox"]').element.value).toBe("Test migration");
});

test("resolves an existing private import URL to its canonical project", async () => {
  records = [importedRecord];
  await router.push("/project/private-zenodo-123");
  wrapper = mount(Project, { global: { plugins: [router] } });
  await flushPromises();
  expect(router.currentRoute.value.params.conceptId).toBe("123");
  expect(wrapper.get("h2").text()).toContain("Test migration");
  expect(wrapper.get('[role="combobox"]').element.value).toBe("Test migration");
});

test.each([
  [importedRecord, "/project/123", "123"],
  [{ ...importedRecord, id: "private-zenodo-456", recordId: "457", project: { ...importedRecord.project, id: "private-zenodo-456", concept_id: "456", record_id: "457" } }, "/project/456", "99"],
])("keeps a valid selection and reloads data after removing the active private cache %#", async (record, path, expectedId) => {
  const { deletePrivateDatapackage } = await import("../src/lib/privateDatapackageStore");
  records = [record];
  deletePrivateDatapackage.mockImplementation(async () => {
    records = [];
    window.dispatchEvent(new CustomEvent("private-datapackages:changed"));
  });
  await router.push(path);
  wrapper = mount(Project, { global: { plugins: [router] } });
  await flushPromises();
  await wrapper.get('[aria-label="Manage private Zenodo datapackages"]').trigger("click");
  await flushPromises();
  await wrapper.findAll("button").find((button) => button.text() === "Remove").trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.params.conceptId).toBe(expectedId);
  expect(wrapper.find("h2").text()).not.toContain("Private");
  expect(wrapper.get('[role="combobox"]').element.value).toBe(expectedId === "123" ? "Test migration" : "Another project");
});

test("reports a failed import and allows a retry", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  loadZenodoDatapackage.mockRejectedValueOnce(new Error("Zenodo request failed (403)"));
  wrapper = mount(Project, { global: { plugins: [router] } });
  await flushPromises();
  await wrapper.get('[aria-label="Manage private Zenodo datapackages"]').trigger("click");
  await flushPromises();
  await wrapper.get('[name="zenodo_record"]').setValue("124");
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(wrapper.text()).toContain("Zenodo request failed (403)");
  expect(wrapper.get('[type="submit"]').attributes("disabled")).toBeUndefined();
  expect(savePrivateDatapackage).not.toHaveBeenCalled();
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(wrapper.text()).not.toContain("Zenodo request failed (403)");
  expect(wrapper.get("h2").text()).toContain("Private");
});


test("clears the route and selection after removing the only available project", async () => {
  const data = await import("../src/lib/data");
  const { deletePrivateDatapackage } = await import("../src/lib/privateDatapackageStore");
  records = [importedRecord];
  vi.spyOn(data, "loadProjects").mockImplementation(async () => records.map((record) => ({ ...record.project, id: "123" })));
  deletePrivateDatapackage.mockImplementation(async () => { records = []; });
  wrapper = mount(Project, { global: { plugins: [router] } });
  await flushPromises();
  await wrapper.get('[aria-label="Manage private Zenodo datapackages"]').trigger("click");
  await flushPromises();
  await wrapper.findAll("button").find((button) => button.text() === "Remove").trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.params.conceptId || "").toBe("");
  expect(wrapper.get('[role="combobox"]').element.value).toBe("");
  await wrapper.findAll("button").find((button) => button.text() === "Close").trigger("click");
  expect(wrapper.find("h2").exists()).toBe(false);
});
