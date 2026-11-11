import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { formatWhatsAppUrl } from './utils';

export interface WhatsAppImageShareOptions {
  imageBase64: string;
  phone: string;
  customerName?: string;
  caption?: string;
  fileName?: string;
}

export interface ShareResult {
  success: boolean;
  message: string;
  method: 'native_share' | 'web_share' | 'clipboard_and_url' | 'download_and_url' | 'url_only';
}

/**
 * Converts a base64 data string to a Blob
 */
export function base64ToBlob(base64: string): { blob: Blob; mimeType: string } {
  try {
    const parts = base64.split(';base64,');
    const mimeType = parts[0]?.replace('data:', '') || 'image/jpeg';
    const rawData = parts[1] || parts[0];
    const byteCharacters = atob(rawData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return {
      blob: new Blob([byteArray], { type: mimeType }),
      mimeType
    };
  } catch (e) {
    console.error('Failed to convert base64 to Blob:', e);
    return {
      blob: new Blob([], { type: 'image/jpeg' }),
      mimeType: 'image/jpeg'
    };
  }
}

/**
 * Converts any image blob to PNG so clipboard write works consistently
 */
export async function convertBlobToPng(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else resolve(blob);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

/**
 * Copies an image blob to system clipboard (PNG format)
 */
export async function copyImageToClipboard(base64: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write) return false;
    const { blob } = base64ToBlob(base64);
    const pngBlob = await convertBlobToPng(blob);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);
    return true;
  } catch (err) {
    console.warn('Could not copy image to clipboard:', err);
    return false;
  }
}

/**
 * Triggers a browser download of the base64 image
 */
export function downloadImage(base64: string, filename: string = 'image.jpg') {
  try {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Error triggering download:', e);
  }
}

/**
 * Share or send image via WhatsApp across Capacitor, Web Share, or Desktop Web
 */
export async function shareImageViaWhatsApp(options: WhatsAppImageShareOptions): Promise<ShareResult> {
  const { imageBase64, phone, caption = '', fileName = `jewellery_${Date.now()}` } = options;
  if (!imageBase64) {
    return { success: false, message: 'کوئی تصویر موجود نہیں ہے', method: 'url_only' };
  }

  const { blob, mimeType } = base64ToBlob(imageBase64);
  const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullFileName = `${cleanFileName}.${ext}`;

  // 1. Capacitor Native Platform (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const savedFile = await Filesystem.writeFile({
        path: fullFileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: caption || 'تصویر',
        text: caption,
        url: savedFile.uri,
        dialogTitle: 'واٹس ایپ پر تصویر شیئر کریں'
      });

      return {
        success: true,
        message: 'تصویر شیئر کر دی گئی ہے',
        method: 'native_share'
      };
    } catch (e: any) {
      console.error('Capacitor share failed:', e);
      // Fallback: open WhatsApp link directly
      const url = formatWhatsAppUrl(phone, caption);
      if (url) window.open(url, '_blank');
      return {
        success: false,
        message: 'شیئرنگ میں مسئلہ آیا، واٹس ایپ لنک کھول دیا گیا ہے',
        method: 'url_only'
      };
    }
  }

  // 2. Web Share API with Files support (Mobile Chrome, Safari, etc.)
  if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      const file = new File([blob], fullFileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: caption || 'تصویر',
          text: caption,
        });
        return {
          success: true,
          message: 'تصویر کامیابی سے شیئر کر دی گئی ہے',
          method: 'web_share'
        };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return { success: false, message: 'شیئرنگ کینسل کر دی گئی', method: 'web_share' };
      }
      console.warn('Web share failed, proceeding with desktop fallback:', e);
    }
  }

  // 3. Desktop Web Fallback:
  // - Copy image to clipboard
  // - Download image file so it's ready to drag & drop
  // - Open WhatsApp Web with prefilled message
  let copied = false;
  try {
    copied = await copyImageToClipboard(imageBase64);
  } catch (e) {
    console.warn('Clipboard copy error:', e);
  }

  downloadImage(imageBase64, fullFileName);

  const waUrl = formatWhatsAppUrl(phone, caption);
  if (waUrl) {
    window.open(waUrl, '_blank');
  }

  return {
    success: true,
    message: copied
      ? 'تصویر کاپی ہو گئی ہے اور واٹس ایپ کھول دیا گیا ہے۔ چیٹ میں جا کر Ctrl+V (Paste) دبائیں!'
      : 'تصویر ڈاؤنلوڈ ہو گئی ہے اور واٹس ایپ کھول دیا گیا ہے۔ تصویر چیٹ میں بھیجیں۔',
    method: copied ? 'clipboard_and_url' : 'download_and_url'
  };
}
