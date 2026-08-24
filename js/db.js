// Thin promise-based wrapper around IndexedDB for RailwayLogbook.
// Object stores: locomotives, dutyEntries, scheduleTypes, profile, meta

const DB_NAME = "railwaylogbook";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("locomotives")) {
        db.createObjectStore("locomotives", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("dutyEntries")) {
        const store = db.createObjectStore("dutyEntries", { keyPath: "id" });
        store.createIndex("date", "date");
      }
      if (!db.objectStoreNames.contains("scheduleTypes")) {
        db.createObjectStore("scheduleTypes", { keyPath: "code" });
      }
      if (!db.objectStoreNames.contains("profile")) {
        db.createObjectStore("profile", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function wrapRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const DB = {
  async getAll(storeName) {
    const store = await tx(storeName, "readonly");
    return wrapRequest(store.getAll());
  },

  async get(storeName, key) {
    const store = await tx(storeName, "readonly");
    return wrapRequest(store.get(key));
  },

  async put(storeName, value) {
    const store = await tx(storeName, "readwrite");
    return wrapRequest(store.put(value));
  },

  async delete(storeName, key) {
    const store = await tx(storeName, "readwrite");
    return wrapRequest(store.delete(key));
  },

  async clear(storeName) {
    const store = await tx(storeName, "readwrite");
    return wrapRequest(store.clear());
  },

  async count(storeName) {
    const store = await tx(storeName, "readonly");
    return wrapRequest(store.count());
  },
};
