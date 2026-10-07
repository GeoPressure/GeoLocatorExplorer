import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { IDBFactory, IDBDatabase, IDBObjectStore } from "fake-indexeddb";

let store;
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  store = await import("../src/lib/privateDatapackageStore");
});
afterEach(() => vi.unstubAllGlobals());

const record = { id: "private-zenodo-123", recordId: "124", project: { title: "Migration" }, tags: [{ tag_id: "bird" }] };

test("saves, replaces, lists and removes a package through IndexedDB", async () => {
  await store.savePrivateDatapackage(record);
  expect(await store.listPrivateDatapackages()).toEqual([{ ...record, savedAt: expect.any(String) }]);
  await store.savePrivateDatapackage({ ...record, title: "Updated" });
  expect(await store.listPrivateDatapackages()).toHaveLength(1);
  expect((await store.listPrivateDatapackages())[0].title).toBe("Updated");
  await store.deletePrivateDatapackage(record.id);
  expect(await store.listPrivateDatapackages()).toEqual([]);
});

test("announces a save only after its transaction has committed", async () => {
  // Open the database before tracking write transaction completion.
  await store.listPrivateDatapackages();
  let completed = false;
  const transaction = IDBDatabase.prototype.transaction;
  vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(function (...args) {
    const tx = transaction.apply(this, args);
    tx.addEventListener("complete", () => { completed = true; });
    return tx;
  });
  const dispatch = vi.spyOn(window, "dispatchEvent").mockImplementation(() => {
    expect(completed).toBe(true);
    return true;
  });
  await store.savePrivateDatapackage(record);
  expect(dispatch).toHaveBeenCalledOnce();
});

test("rejects an aborted write and does not announce a successful save", async () => {
  const put = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (...args) {
    const request = put.apply(this, args);
    request.addEventListener("success", () => this.transaction.abort());
    return request;
  });
  const dispatch = vi.spyOn(window, "dispatchEvent");
  await expect(store.savePrivateDatapackage(record)).rejects.toMatchObject({ name: "AbortError" });
  expect(dispatch).not.toHaveBeenCalled();
  expect(await store.listPrivateDatapackages()).toEqual([]);
});
