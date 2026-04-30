import { MULTIVIEW_UPLOAD_ORDER } from "./multiviewUtils.js";

const IMAGE_THUMB_CACHE_VERSION = "tripo-image-thumb-v1";
const IMAGE_THUMB_SIZE = 280;

const textEncoder = new TextEncoder();

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore quota and privacy mode failures.
  }
}

function writeUint16LE(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32LE(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function crc32(bytes) {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ -1) >>> 0;
}

function triggerDownload(blob, filename) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

function inferExtension(url, contentType = "") {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();
  const type = String(contentType || "").toLowerCase();
  if (type.includes("image/avif") || cleanUrl.endsWith(".avif")) return "avif";
  if (type.includes("image/webp") || cleanUrl.endsWith(".webp")) return "webp";
  if (type.includes("image/jpeg") || cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) return "jpg";
  if (type.includes("image/png") || cleanUrl.endsWith(".png")) return "png";
  return "png";
}

function sanitizeFileStem(value) {
  return String(value || "tripo_views")
    .trim()
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || /[<>:"/\\|?*]/.test(char)) return "_";
      return char;
    })
    .join("")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "tripo_views";
}

async function fetchImageEntry(url, index) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status})`);
  }
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const slot = MULTIVIEW_UPLOAD_ORDER[index];
  const ext = inferExtension(url, blob.type);
  const filename = `${String(index + 1).padStart(2, "0")}_${slot?.id || `view_${index + 1}`}.${ext}`;
  return {
    filename,
    bytes,
  };
}

function buildStoreZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBytes = textEncoder.encode(entry.filename);
    const dataBytes = entry.bytes;
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32LE(localView, 0, 0x04034b50);
    writeUint16LE(localView, 4, 20);
    writeUint16LE(localView, 6, 0);
    writeUint16LE(localView, 8, 0);
    writeUint16LE(localView, 10, 0);
    writeUint16LE(localView, 12, 0);
    writeUint32LE(localView, 14, crc32(dataBytes));
    writeUint32LE(localView, 18, dataBytes.length);
    writeUint32LE(localView, 22, dataBytes.length);
    writeUint16LE(localView, 26, nameBytes.length);
    writeUint16LE(localView, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32LE(centralView, 0, 0x02014b50);
    writeUint16LE(centralView, 4, 20);
    writeUint16LE(centralView, 6, 20);
    writeUint16LE(centralView, 8, 0);
    writeUint16LE(centralView, 10, 0);
    writeUint16LE(centralView, 12, 0);
    writeUint16LE(centralView, 14, 0);
    writeUint32LE(centralView, 16, crc32(dataBytes));
    writeUint32LE(centralView, 20, dataBytes.length);
    writeUint32LE(centralView, 24, dataBytes.length);
    writeUint16LE(centralView, 28, nameBytes.length);
    writeUint16LE(centralView, 30, 0);
    writeUint16LE(centralView, 32, 0);
    writeUint16LE(centralView, 34, 0);
    writeUint16LE(centralView, 36, 0);
    writeUint32LE(centralView, 38, 0);
    writeUint32LE(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32LE(endView, 0, 0x06054b50);
  writeUint16LE(endView, 4, 0);
  writeUint16LE(endView, 6, 0);
  writeUint16LE(endView, 8, entries.length);
  writeUint16LE(endView, 10, entries.length);
  writeUint32LE(endView, 12, centralSize);
  writeUint32LE(endView, 16, offset);
  writeUint16LE(endView, 20, 0);

  return new Blob([...localParts, ...centralParts, endRecord], { type: "application/zip" });
}

export function isImageHistoryItem(item) {
  const hasOnlyImagePreview =
    !item?.model_url &&
    (
      Array.isArray(item?.previewImageUrls) ||
      Array.isArray(item?.preview_image_urls) ||
      Boolean(item?.previewImageUrl) ||
      Boolean(item?.preview_image_url)
    );

  return Boolean(
    item?.kind === "images" ||
    item?.params?.assetKind === "images" ||
    item?.params?.type === "generate_multiview_image" ||
    item?.params?.type === "edit_multiview_image" ||
    item?.type === "generate_multiview_image" ||
    item?.type === "edit_multiview_image" ||
    Array.isArray(item?.image_urls) ||
    hasOnlyImagePreview
  );
}

export function getHistoryImageUrls(item) {
  if (!item) return [];
  const candidates = Array.isArray(item.image_urls) && item.image_urls.length > 0
    ? item.image_urls
    : Array.isArray(item.previewImageUrls) && item.previewImageUrls.length > 0
      ? item.previewImageUrls
      : Array.isArray(item.preview_image_urls) && item.preview_image_urls.length > 0
        ? item.preview_image_urls
      : item.previewImageUrl
        ? [item.previewImageUrl]
        : item.preview_image_url
          ? [item.preview_image_url]
          : [];
  return candidates.filter(Boolean);
}

function extractUrlFromNode(node) {
  if (!node) return null;
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const url = extractUrlFromNode(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof node !== "object") return null;

  return (
    node.url ??
    node.image_url ??
    node.rendered_image_url ??
    node.preview_url ??
    node.file_url ??
    node.href ??
    null
  );
}

export function extractTripoPreviewImageUrls(payload) {
  if (!payload) return [];

  const directUrls = [
    ...(Array.isArray(payload.image_urls) ? payload.image_urls : []),
    ...(Array.isArray(payload.previewImageUrls) ? payload.previewImageUrls : []),
    ...(Array.isArray(payload.preview_image_urls) ? payload.preview_image_urls : []),
    ...(payload.previewImageUrl ? [payload.previewImageUrl] : []),
    ...(payload.preview_image_url ? [payload.preview_image_url] : []),
    ...(payload.rendered_image ? [extractUrlFromNode(payload.rendered_image)].filter(Boolean) : []),
    ...(payload.rendered_images ? [extractUrlFromNode(payload.rendered_images)].filter(Boolean) : []),
    ...(payload.preview_image ? [extractUrlFromNode(payload.preview_image)].filter(Boolean) : []),
    ...(payload.preview_images ? [extractUrlFromNode(payload.preview_images)].filter(Boolean) : []),
  ].filter(Boolean);

  const out = payload.output ?? payload.rawOutput ?? {};
  const candidates = [
    out.rendered_image,
    out.rendered_images,
    out.preview_image,
    out.preview_images,
    out.image,
    out.images,
    out.generated_image,
    out.generated_images,
    out.multiview_images,
    out.views,
  ];

  const derivedUrls = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        const url = extractUrlFromNode(item);
        if (url) derivedUrls.push(url);
      });
      continue;
    }
    const url = extractUrlFromNode(candidate);
    if (url) derivedUrls.push(url);
  }

  return [...new Set([...directUrls, ...derivedUrls])];
}

export function getModelPreviewImageUrl(item) {
  if (!item) return null;
  const urls = extractTripoPreviewImageUrls(item);
  return urls[0] ?? null;
}

export function getImageHistoryThumbCacheKey(item) {
  const taskKey = item?.taskId || item?.id || getHistoryImageUrls(item).join("|");
  return taskKey ? `${taskKey}#${IMAGE_THUMB_CACHE_VERSION}` : null;
}

export function getCachedImageHistoryThumb(item) {
  const key = getImageHistoryThumbCacheKey(item);
  return key ? safeStorageGet(key) : null;
}

export async function ensureImageHistoryThumb(item) {
  const cached = getCachedImageHistoryThumb(item);
  if (cached) return cached;

  const urls = getHistoryImageUrls(item).slice(0, 4);
  if (!urls.length) return null;

  const imageBitmaps = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Thumbnail source failed (${response.status})`);
      }
      const blob = await response.blob();
      return createImageBitmap(blob);
    })
  );

  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_THUMB_SIZE;
  canvas.height = IMAGE_THUMB_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#090312";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gap = 8;
  const inner = canvas.width - gap * 3;
  const cellSize = inner / 2;

  imageBitmaps.forEach((bitmap, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const x = gap + col * (cellSize + gap);
    const y = gap + row * (cellSize + gap);
    const scale = Math.min(cellSize / bitmap.width, cellSize / bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    const dx = x + (cellSize - drawWidth) / 2;
    const dy = y + (cellSize - drawHeight) / 2;

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(x, y, cellSize, cellSize, 16);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cellSize, cellSize, 16);
    ctx.clip();
    ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);
    ctx.restore();
  });

  const dataUrl = canvas.toDataURL("image/webp", 0.82);
  const key = getImageHistoryThumbCacheKey(item);
  if (key) safeStorageSet(key, dataUrl);
  imageBitmaps.forEach((bitmap) => bitmap.close());
  return dataUrl;
}

export async function downloadImageHistoryZip(item, filenameBase) {
  const urls = getHistoryImageUrls(item);
  if (!urls.length) {
    throw new Error("No image views available to download.");
  }

  const entries = await Promise.all(urls.map((url, index) => fetchImageEntry(url, index)));
  const zipBlob = buildStoreZip(entries);
  triggerDownload(zipBlob, `${sanitizeFileStem(filenameBase)}.zip`);
}
