// IndexedDB Persistent Storage for User Uploaded Images
const DB_NAME = 'YazhPhotographyDB';
const DB_VERSION = 1;
const STORE_NAME = 'uploaded_photos';

class PhotoDatabase {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('visibility', 'visibility', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('clientPin', 'clientPin', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async addPhoto(photo) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(photo);

      request.onsuccess = () => {
        document.dispatchEvent(new CustomEvent('photosUpdated', { detail: photo }));
        resolve(photo);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllPhotos() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getPublicPhotos() {
    const all = await this.getAllPhotos();
    return all.filter(p => p.visibility === 'public');
  }

  async getPrivatePhotosByPin(pin) {
    const all = await this.getAllPhotos();
    return all.filter(p => p.visibility === 'private' && (p.clientPin === pin || !p.clientPin));
  }

  async deletePhoto(id) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        document.dispatchEvent(new CustomEvent('photosUpdated', { detail: { id, deleted: true } }));
        resolve(true);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

export const photoDB = new PhotoDatabase();
