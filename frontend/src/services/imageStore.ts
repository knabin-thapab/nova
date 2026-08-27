/**
 * IndexedDB-based storage for persisting enhanced images across page refreshes.
 * Images are stored as Blobs with metadata and auto-expire after 24 hours.
 */

const DB_NAME = 'nova_image_store';
const DB_VERSION = 1;
const STORE_NAME = 'enhanced_images';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface StoredImage {
  id: string;
  originalName: string;
  originalWidth: number;
  originalHeight: number;
  originalSize: string;
  enhancedBlob: Blob;
  enhancedWidth: number;
  enhancedHeight: number;
  mode: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/** Save an enhanced image to IndexedDB */
export async function saveEnhancedImage(image: StoredImage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(image);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load all non-expired enhanced images from IndexedDB */
export async function loadEnhancedImages(): Promise<StoredImage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const now = Date.now();
      const valid = (request.result as StoredImage[]).filter(
        (img) => now - img.timestamp < MAX_AGE_MS
      );
      // Sort newest first
      valid.sort((a, b) => b.timestamp - a.timestamp);
      resolve(valid);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Delete a specific enhanced image */
export async function deleteEnhancedImage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Purge all expired images from IndexedDB */
export async function purgeExpiredImages(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  request.onsuccess = () => {
    const now = Date.now();
    for (const img of request.result as StoredImage[]) {
      if (now - img.timestamp >= MAX_AGE_MS) {
        store.delete(img.id);
      }
    }
  };
}

/** Clear all enhanced images */
export async function clearAllEnhancedImages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
