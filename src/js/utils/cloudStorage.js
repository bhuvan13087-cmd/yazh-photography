// Persistent Cloud Image Storage & Cloud Manifest Service for Yazh Photography
// Uses global Cloud CDN for image files & Same-Origin Serverless API Proxy (/api/upload)

const CLOUD_MANIFEST_BIN_ID = 'fbfcdba';
const CLOUD_MANIFEST_URL = `https://extendsclass.com/api/json-storage/bin/${CLOUD_MANIFEST_BIN_ID}`;

// FreeImage Public API Key for permanent Cloudflare-backed CDN image hosting
const FREEIMAGE_API_KEY = '6d207e02198a847aa98d0a2a901485a5';
const FREEIMAGE_UPLOAD_URL = 'https://freeimage.host/api/1/upload';
const PRIMARY_UPLOAD_ENDPOINT = '/api/upload';

// Max file size: 15 MB
export const MAX_IMAGE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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

    // Convert file to base64 string
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
      reader.readAsDataURL(file);
    });

    if (onProgress) onProgress(35, 'Uploading image to Cloud CDN...');

    // 1. Try Primary Same-Origin Serverless API (/api/upload)
    try {
      const res = await fetch(this.uploadEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          image: base64Data,
          filename: file.name
        })
      });

      if (onProgress) onProgress(80, 'Processing CDN delivery URL...');

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.image) {
          if (onProgress) onProgress(100, 'Upload complete!');
          return data.image;
        } else if (data.error) {
          throw new Error(data.error);
        }
      }
    } catch (err) {
      console.warn('[CloudStorage] /api/upload error, attempting direct fallback:', err.message);
    }

    // 2. Direct Upload Fallback via FormData
    if (onProgress) onProgress(50, 'Retrying cloud image upload...');

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('key', FREEIMAGE_API_KEY);
      formData.append('action', 'upload');
      formData.append('source', base64Data);
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
              if (onProgress) onProgress(100, 'Upload complete!');
              
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

      xhr.timeout = 60000;
      xhr.send(formData);
    });
  }
}

export const cloudStorage = new CloudStorageService();
