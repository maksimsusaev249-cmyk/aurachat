/**
 * Triggers a guaranteed browser file download to computer/phone for photos or videos.
 * Routes through local /api/download proxy, handles data URIs, Canvas fallbacks, and binary Blobs.
 */
export async function downloadMediaFile(
  mediaUrl: string,
  suggestedName?: string,
  mediaType: 'image' | 'video' = 'image',
  onStatusChange?: (status: 'downloading' | 'done') => void
): Promise<void> {
  if (!mediaUrl) return;

  onStatusChange?.('downloading');

  const ext = mediaType === 'video' ? 'mp4' : 'jpg';
  const cleanName = (suggestedName || `aurachat_${mediaType}_${Date.now()}`)
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_')
    .slice(0, 50);
  const fileName = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;

  // 1. If mediaUrl is already a Data URI or Blob URL
  if (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:')) {
    try {
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onStatusChange?.('done');
      return;
    } catch {
      // fallback
    }
  }

  // 2. Guaranteed browser download via local Vite proxy (/api/download)
  // This sets Content-Disposition: attachment; filename="..." from the server,
  // which Chrome immediately passes to its native download manager.
  try {
    const proxyUrl = `/api/download?url=${encodeURIComponent(mediaUrl)}&name=${encodeURIComponent(fileName)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      onStatusChange?.('done');
      return;
    }
  } catch (err) {
    console.warn('Proxy download attempt completed, falling back:', err);
  }

  // 3. Direct fetch -> Blob -> Object URL
  try {
    const response = await fetch(mediaUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      onStatusChange?.('done');
      return;
    }
  } catch {
    // CORS or network error, proceed to fallback
  }

  // 4. Canvas fallback for images (converts cross-origin image to local DataURL download)
  if (mediaType === 'image') {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } catch {
          // Canvas tainted fallback: force download link
          const link = document.createElement('a');
          link.href = mediaUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        onStatusChange?.('done');
      };
      img.onerror = () => {
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onStatusChange?.('done');
      };
      img.src = mediaUrl;
      return;
    } catch {
      // Fallback below
    }
  }

  // 5. Final Direct Link Fallback
  try {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    // ignore
  }
  onStatusChange?.('done');
}

