// Persistent Cloud Image Storage & Cloud Manifest Service for Yazh Photography
// No database required - Uses global Cloud CDN for image files & Cloud Manifest for photo metadata

const CLOUD_MANIFEST_BIN_ID = 'fbfcdba';
const CLOUD_MANIFEST_URL = `https://extendsclass.com/api/json-storage/bin/${CLOUD_MANIFEST_BIN_ID}`;

// FreeImage Public API Key for permanent Cloudflare-backed CDN image hosting
const FREEIMAGE_API_KEY = '6d207e02198a847aa98d0a2a901485a5';
const FREEIMAGE_UPLOAD_URL = 'https://freeimage.host/api/1/upload';

// Max file size: 15 MB
export const MAX_IMAGE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

class CloudStorageService {
  constructor() {
    this.manifestUrl = CLOUD_MANIFEST_URL;
    this.cacheBustCounter = Date.now();
    this.inMemoryCache = null;
    this.initPromise = this.fetchCloudManifest();
  }

  // Validate image file format and size
  validateImageFile(file) {
    if (!file) {
      return { valid: false, error: 'Please select an image file.' };
    }

    const fileType = (file.type || '').toLowerCase();
    const isAllowedType = ALLOWED_IMAGE_TYPES.includes(fileType) || 
      /\.(jpe?g|png|webp)$/i.test(file.name);

    if (!isAllowedType) {
      return {
        valid: false,
        error: 'Unsupported format. Please upload JPG, JPEG, PNG, or WebP images.'
      };
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File is too large (${sizeMB}MB). Maximum allowed size is 15MB.`
      };
    }

    return { valid: true };
  }

  // Upload an image binary to Cloud CDN with progress tracking
  async uploadImageFile(file, onProgress = null) {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (onProgress) onProgress(15, 'Preparing image for cloud transfer...');

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('key', FREEIMAGE_API_KEY);
      formData.append('action', 'upload');
      formData.append('source', file);
      formData.append('format', 'json');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', FREEIMAGE_UPLOAD_URL, true);

      // Track upload progress
      if (xhr.upload && onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.min(90, Math.round((e.loaded / e.total) * 80) + 15);
            onProgress(percent, `Uploading to Cloud CDN (${percent}%)...`);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.status_code === 200 && response.image) {
              if (onProgress) onProgress(100, 'Upload complete! Processing CDN link...');
              
              // Append cache-busting timestamp to prevent stale browser cache
              const timestamp = Date.now();
              const rawUrl = response.image.url || response.image.display_url;
              const rawThumb = response.image.thumb?.url || response.image.display_url || rawUrl;
              
              const secureUrl = rawUrl.replace(/^http:\/\//i, 'https://');
              const secureThumb = rawThumb.replace(/^http:\/\//i, 'https://');

              const finalUrl = secureUrl.includes('?') ? `${secureUrl}&v=${timestamp}` : `${secureUrl}?v=${timestamp}`;
              const finalThumb = secureThumb.includes('?') ? `${secureThumb}&v=${timestamp}` : `${secureThumb}?v=${timestamp}`;

              resolve({
                url: finalUrl,
                thumbnail: finalThumb,
                id: response.image.id_encoded || `img-${timestamp}`,
                filename: response.image.filename || file.name,
                width: response.image.width,
                height: response.image.height,
                size: response.image.size
              });
            } else {
              const errMsg = response.error?.message || response.status_txt || 'Cloud upload failed';
              reject(new Error(errMsg));
            }
          } catch (err) {
            reject(new Error('Invalid response from cloud storage provider.'));
          }
        } else {
          reject(new Error(`Cloud storage server returned status ${xhr.status}.`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error connecting to cloud image storage service.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Cloud upload timed out. Please check your internet connection.'));
      };

      xhr.timeout = 60000; // 60s timeout
      xhr.send(formData);
    });
  }

  // Fetch the cloud manifest (all photos & replacement mappings)
  async fetchCloudManifest() {
    try {
      const cacheBustUrl = `${this.manifestUrl}?_t=${Date.now()}`;
      const response = await fetch(cacheBustUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        this.inMemoryCache = {
          photos: Array.isArray(data.photos) ? data.photos : [],
          replacements: data.replacements && typeof data.replacements === 'object' ? data.replacements : {}
        };
        return this.inMemoryCache;
      }
    } catch (e) {
      console.warn('Could not fetch remote cloud manifest, using cached/empty manifest', e);
    }

    if (!this.inMemoryCache) {
      this.inMemoryCache = { photos: [], replacements: {} };
    }
    return this.inMemoryCache;
  }

  // Save the manifest to cloud storage
  async saveCloudManifest(manifest) {
    this.inMemoryCache = manifest;
    try {
      const response = await fetch(this.manifestUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(manifest)
      });

      if (!response.ok) {
        console.warn('Could not sync manifest to remote cloud endpoint:', response.status);
      }
    } catch (e) {
      console.warn('Failed to update remote cloud manifest:', e);
    }

    document.dispatchEvent(new CustomEvent('photosUpdated', { detail: manifest }));
    return manifest;
  }

  // Get all photos (both uploaded photos and replacements for built-in items)
  async getAllPhotos() {
    const manifest = await this.fetchCloudManifest();
    return manifest.photos || [];
  }

  // Get public photos
  async getPublicPhotos() {
    const photos = await this.getAllPhotos();
    return photos.filter(p => p.visibility !== 'private');
  }

  // Get private photos by PIN (for client portal)
  async getPrivatePhotosByPin(pin) {
    const photos = await this.getAllPhotos();
    return photos.filter(p => p.visibility === 'private' && (p.clientPin === pin || !p.clientPin));
  }

  // Get replacement image mappings for default/built-in portfolio items
  async getReplacements() {
    const manifest = await this.fetchCloudManifest();
    return manifest.replacements || {};
  }

  // Add a new photo to cloud storage
  async addPhoto(photo) {
    const manifest = await this.fetchCloudManifest();
    const newPhoto = {
      ...photo,
      id: photo.id || `photo-${Date.now()}`,
      visibility: photo.visibility || 'public',
      createdAt: photo.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Ensure no duplicate IDs
    manifest.photos = manifest.photos.filter(p => p.id !== newPhoto.id);
    manifest.photos.unshift(newPhoto);

    await this.saveCloudManifest(manifest);
    return newPhoto;
  }

  // Update an existing photo's metadata or replace its image
  async updatePhoto(id, updates) {
    const manifest = await this.fetchCloudManifest();
    const photoIndex = manifest.photos.findIndex(p => p.id === id);

    if (photoIndex >= 0) {
      manifest.photos[photoIndex] = {
        ...manifest.photos[photoIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.saveCloudManifest(manifest);
      return manifest.photos[photoIndex];
    }
    return null;
  }

  // Replace a built-in portfolio item or uploaded item with a new cloud image
  async replaceImage(itemId, newImageResult, newTitle = null) {
    const manifest = await this.fetchCloudManifest();
    const timestamp = Date.now();
    const versionedUrl = newImageResult.url.includes('?v=') 
      ? newImageResult.url 
      : `${newImageResult.url}?v=${timestamp}`;
    const versionedThumb = newImageResult.thumbnail.includes('?v=')
      ? newImageResult.thumbnail
      : `${newImageResult.thumbnail}?v=${timestamp}`;

    // Check if it is an uploaded photo
    const photoIndex = manifest.photos.findIndex(p => p.id === itemId);
    if (photoIndex >= 0) {
      manifest.photos[photoIndex].image = versionedUrl;
      manifest.photos[photoIndex].thumbnail = versionedThumb;
      manifest.photos[photoIndex].url = versionedUrl;
      if (newTitle) manifest.photos[photoIndex].title = newTitle;
      manifest.photos[photoIndex].updatedAt = new Date().toISOString();
    } else {
      // It is a built-in portfolio item: store replacement in replacements map
      if (!manifest.replacements) manifest.replacements = {};
      manifest.replacements[itemId] = {
        image: versionedUrl,
        thumbnail: versionedThumb,
        title: newTitle || undefined,
        updatedAt: new Date().toISOString()
      };
    }

    await this.saveCloudManifest(manifest);
    document.dispatchEvent(new CustomEvent('photoReplaced', { 
      detail: { id: itemId, image: versionedUrl, thumbnail: versionedThumb } 
    }));
    return { id: itemId, image: versionedUrl, thumbnail: versionedThumb };
  }

  // Delete a photo from cloud storage
  async deletePhoto(id) {
    const manifest = await this.fetchCloudManifest();
    manifest.photos = manifest.photos.filter(p => p.id !== id);

    if (manifest.replacements && manifest.replacements[id]) {
      delete manifest.replacements[id];
    }

    await this.saveCloudManifest(manifest);
    return true;
  }
}

export const cloudStorage = new CloudStorageService();
// Backwards compatibility alias
export const photoDB = cloudStorage;
