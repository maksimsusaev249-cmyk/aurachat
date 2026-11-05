/**
 * Media detection, webcam frame capture, and persistent file-to-DataURL conversion utilities.
 * Prevents dead blob: URLs and mismatched <video> vs <img> tags (which cause black squares).
 */

export function isImageMediaUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (clean.startsWith('data:image/')) return true;
  if (
    clean.includes('images.unsplash.com') ||
    clean.includes('api.dicebear.com') ||
    clean.includes('media.giphy.com')
  ) {
    return true;
  }
  return /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(clean);
}

export function isVideoMedia(url?: string, mediaType?: string): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (!clean) return false;

  // Never treat known image URLs as video, even if mediaType was mistakenly set to 'video'
  if (isImageMediaUrl(clean)) {
    return false;
  }

  if (
    clean.startsWith('data:video/') ||
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(clean)
  ) {
    return true;
  }

  return mediaType === 'video';
}

/**
 * Converts an uploaded image or video File into a persistent Data URL
 * so that it survives page reloads and localStorage/Cloud sync (unlike temporary blob: URLs).
 */
export function fileToPersistentUrl(file: File): Promise<{ url: string; mediaType: 'image' | 'video' }> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);

  if (isVideo) {
    return new Promise((resolve) => {
      // If video is reasonably sized (<= 18MB), store as Data URL so it persists across reloads
      if (file.size <= 18 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string' && reader.result.length > 0) {
            resolve({ url: reader.result, mediaType: 'video' });
          } else {
            resolve({ url: URL.createObjectURL(file), mediaType: 'video' });
          }
        };
        reader.onerror = () => {
          resolve({ url: URL.createObjectURL(file), mediaType: 'video' });
        };
        reader.readAsDataURL(file);
      } else {
        resolve({ url: URL.createObjectURL(file), mediaType: 'video' });
      }
    });
  }

  // Image file: compress & normalize via HTML5 canvas so large phone photos fit in storage
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        resolve({ url: URL.createObjectURL(file), mediaType: 'image' });
        return;
      }

      // Keep GIFs untouched so animation is preserved
      if (file.type === 'image/gif') {
        resolve({ url: dataUrl, mediaType: 'image' });
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1280;
          let width = img.naturalWidth || img.width || 800;
          let height = img.naturalHeight || img.height || 800;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ url: compressed, mediaType: 'image' });
            return;
          }
        } catch {}
        resolve({ url: dataUrl, mediaType: 'image' });
      };
      img.onerror = () => {
        resolve({ url: dataUrl, mediaType: 'image' });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      resolve({ url: URL.createObjectURL(file), mediaType: 'image' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Captures the current frame from a live <video> element into a JPEG Data URL.
 */
export function captureVideoFrameToDataUrl(videoEl: HTMLVideoElement | null, mirror = false): string | null {
  if (!videoEl || videoEl.readyState < 2) return null;
  try {
    const width = videoEl.videoWidth || 720;
    const height = videoEl.videoHeight || 1280;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return null;
  }
}
