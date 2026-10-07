import { expect, test } from "vitest";
import { buildPrivateContext } from "../src/lib/privateData";

const record = {
  recordId: "https://doi.org/10.5281/zenodo.124",
  project: { id: "private-zenodo-123", concept_id: "123" },
  tags: [{ tag_id: "bird-1" }],
};

test("uses the public project identity when importing the same Zenodo record", () => {
  const publicProject = { id: "public-project", record_id: "124", concept_id: "123" };
  const context = buildPrivateContext([record], [publicProject]);
  expect(context.entries[0].canonicalProjectId).toBe("public-project");
  expect(context.entries[0].publicProject).toBe(publicProject);
  expect(context.privateRecordIds).toEqual(new Set(["124"]));
  expect(context.privateTagIds).toEqual(new Set(["bird-1"]));
});

test("uses the concept ID for a project absent from the public data", () => {
  expect(buildPrivateContext([record]).entries[0].canonicalProjectId).toBe("123");
});

test("keeps different record versions distinct", () => {
  const publicProject = { id: "public-project", record_id: "125", concept_id: "123" };
  const context = buildPrivateContext([record], [publicProject]);
  expect(context.entries[0].publicProject).toBeUndefined();
  expect(context.privateRecordIds.has("125")).toBe(false);
});
