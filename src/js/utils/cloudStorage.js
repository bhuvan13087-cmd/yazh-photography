// Persistent Cloud Image Storage & Cloud Manifest Service for Yazh Photography
// Multi-Tier Cloud Architecture: Client-Side Optimization + Same-Origin API Proxy (/api/upload) -> Catbox CDN

const CLOUD_MANIFEST_BIN_ID = 'fbfcdba';
const CLOUD_MANIFEST_URL = `https://extendsclass.com/api/json-storage/bin/${CLOUD_MANIFEST_BIN_ID}`;
const PRIMARY_UPLOAD_ENDPOINT = '/api/upload';

// Max file size: 15 MB
export const MAX_IMAGE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Client-side image optimizer: Resizes massive camera RAW/JPEGs to ultra-high-definition web resolution (max 2560px)
// Keeps file size lightweight (<1.5MB), avoids serverless request body limits (4.5MB), and accelerates upload speed
async function optimizeImageForUpload(file) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.createImageBitmap && !window.FileReader) {
    return file;
  }

  // Small images (< 1.2MB) don't need resizing
  if (file.size < 1.2 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_DIM = 2560; // 4K Ultra HD max dimension
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = mimeType === 'image/png' ? undefined : 0.92;

      canvas.toBlob((blob) => {
        if (blob && blob.size < file.size) {
          const optimizedFile = new File([blob], file.name, { type: mimeType });
          resolve(optimizedFile);
        } else {
          resolve(file);
        }
      }, mimeType, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

class CloudStorageService {
  constructor() {
    this.manifestUrl = CLOUD_MANIFEST_URL;
    this.uploadEndpoint = PRIMARY_UPLOAD_ENDPOINT;
    this.cacheBustCounter = Date.now();
    this.inMemoryCache = null;
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

    // 1. Optimize image client-side if necessary
    const readyFile = await optimizeImageForUpload(file);

    // 2. Convert file to base64 for API transmission
    if (onProgress) onProgress(35, 'Encoding image payload...');
    const base64Data = await new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        reject(new Error('FileReader not available in this environment.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read image file data.'));
      reader.readAsDataURL(readyFile);
    });

    if (onProgress) onProgress(60, 'Uploading to Cloud CDN...');

    // 3. Send to Same-Origin Serverless API (/api/upload)
    const res = await fetch(this.uploadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        image: base64Data,
        filename: readyFile.name
      })
    });

    if (onProgress) onProgress(85, 'Processing CDN delivery link...');

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.image) {
        if (onProgress) onProgress(100, 'Upload complete!');
        return data.image;
      } else if (data.error) {
        throw new Error(data.error);
      }
    }

    const errJson = await res.json().catch(() => null);
    const errMsg = errJson?.error || `Upload failed with status ${res.status}`;
    throw new Error(errMsg);
  }
}

export const cloudStorage = new CloudStorageService();
