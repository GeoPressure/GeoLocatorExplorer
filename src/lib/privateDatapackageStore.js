const DB_NAME = "geolocator-private-datapackages";
const DB_VERSION = 1;
const STORE_NAME = "datapackages";
export const PRIVATE_DATAPACKAGES_CHANGED_EVENT = "private-datapackages:changed";
let dbPromise;

const openDatabase = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

const withStore = async (mode, callback) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const listPrivateDatapackages = async () => {
  if (typeof indexedDB === "undefined") {
    return [];
  }
  const records = await withStore("readonly", (store) => store.getAll());
  return records.sort((a, b) => String(a.savedAt || "").localeCompare(String(b.savedAt || "")));
};

export const savePrivateDatapackage = async (record) => {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }
  await withStore("readwrite", (store) =>
    store.put({
      ...record,
      savedAt: new Date().toISOString(),
    }),
  );
  window.dispatchEvent(new CustomEvent(PRIVATE_DATAPACKAGES_CHANGED_EVENT));
};

export const deletePrivateDatapackage = async (id) => {
  await withStore("readwrite", (store) => store.delete(id));
  window.dispatchEvent(new CustomEvent(PRIVATE_DATAPACKAGES_CHANGED_EVENT));
};

export const summarizePrivateDatapackage = (record) => ({
  id: record.id,
  title: record.project?.title || record.title || record.id,
  recordId: record.recordId || "",
  savedAt: record.savedAt || "",
  tagCount: Array.isArray(record.tags) ? record.tags.length : 0,
});
