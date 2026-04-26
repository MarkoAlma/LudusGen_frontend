export const MULTIVIEW_UPLOAD_ORDER = [
  { id: "front", label: "Front" },
  { id: "left", label: "Left" },
  { id: "back", label: "Back" },
  { id: "right", label: "Right" },
];

export function hasTaskImagePreview(taskData) {
  return Boolean(taskData?.previewImageUrl) ||
    (Array.isArray(taskData?.previewImageUrls) && taskData.previewImageUrls.length > 0);
}

export function isUploadedMultiviewItemReady(item) {
  return Boolean(item?.tripoFile || item?.token);
}

export function getReadyMultiviewRefs(items = []) {
  return MULTIVIEW_UPLOAD_ORDER
    .map((_, index) => items?.[index])
    .filter(isUploadedMultiviewItemReady);
}

export function isMultiviewUploadReady(items = []) {
  const frontReady = isUploadedMultiviewItemReady(items?.[0]);
  return frontReady && getReadyMultiviewRefs(items).length >= 2;
}
