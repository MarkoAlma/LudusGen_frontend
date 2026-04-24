export const REFINE_DIRECT_SOURCE_TYPES = new Set([
  "text_to_model",
  "image_to_model",
  "multiview_to_model",
]);

export const UPSTREAM_SOURCE_TYPES = new Set([
  "texture_model",
  "convert_model",
  "smart_low_poly",
  "stylize_model",
  "mesh_segmentation",
  "mesh_completion",
]);

export function getHistoryTaskType(item) {
  return item?.params?.type || item?.type || item?.params?.mode || item?.mode || null;
}

export function getHistoryUpstreamTaskId(item) {
  return item?.params?.originalModelTaskId ||
    item?.params?.original_model_task_id ||
    item?.params?.draftModelTaskId ||
    item?.params?.draft_model_task_id ||
    item?.input?.original_model_task_id ||
    item?.input?.original_model_id ||
    item?.input?.draft_model_task_id ||
    null;
}

export function getHistoryModelVersion(item) {
  return item?.params?.model_version ||
    item?.params?.modelVersion ||
    item?.model_version ||
    item?.modelVersion ||
    item?.modelVer ||
    null;
}

export function hasTextureMarker(item) {
  if (!item) return false;
  const searchable = [
    item?.mode,
    item?.name,
    item?.prompt,
    item?.label,
    item?.type,
    item?.params?.mode,
    item?.params?.type,
    item?.params?.label,
  ].filter(Boolean).join(" ").toLowerCase();

  return (
    item?.mode === "upload" ||
    item?.source === "upload" ||
    item?.type === "import_model" ||
    item?.params?.type === "import_model" ||
    item?.mode === "texture" ||
    item?.texture === true ||
    item?.texture === "true" ||
    item?.pbr === true ||
    item?.pbr === "true" ||
    item?.type === "texture_model" ||
    item?.params?.mode === "texture" ||
    item?.params?.type === "texture_model" ||
    item?.params?.texture === true ||
    item?.params?.texture === "true" ||
    item?.params?.pbr === true ||
    item?.params?.pbr === "true" ||
    /\btexture\b/.test(searchable)
  );
}

export function itemHasTexture(item, findHistoryItemByTaskKey) {
  const visit = (candidate, seen = new Set(), depth = 0) => {
    if (!candidate || depth > 4) return false;
    if (hasTextureMarker(candidate)) return true;
    const key =
      candidate?.taskId ||
      candidate?.id ||
      candidate?.params?.originalModelTaskId ||
      candidate?.params?.original_model_task_id ||
      null;
    if (key) {
      if (seen.has(key)) return false;
      seen.add(key);
    }
    const upstreamId = getHistoryUpstreamTaskId(candidate);
    if (!upstreamId) return false;
    return visit(findHistoryItemByTaskKey(upstreamId), seen, depth + 1);
  };
  return visit(item);
}

export function resolveOperationSource({
  operation,
  selectedTaskId,
  selectedItem,
  fallbackItem = null,
  findHistoryItemByTaskKey,
}) {
  const selected = selectedItem || fallbackItem || null;
  const fallbackTaskId = (selectedTaskId || selected?.taskId || selected?.id || "").trim();

  const visit = (candidate, currentFallback, seen = new Set()) => {
    const fallback = (currentFallback || "").trim();
    if (!candidate) {
      return { taskId: fallback, item: null, resolvedFromUpstream: false, selectedItem: selected };
    }

    const candidateTaskId = (candidate.taskId || candidate.id || fallback || "").trim();
    const candidateType = getHistoryTaskType(candidate);
    const upstreamId = (getHistoryUpstreamTaskId(candidate) || "").trim();
    const textured = itemHasTexture(candidate, findHistoryItemByTaskKey);
    const shouldUseUpstream =
      !!upstreamId &&
      (operation === "refine"
        ? UPSTREAM_SOURCE_TYPES.has(candidateType) || (!!candidateType && !REFINE_DIRECT_SOURCE_TYPES.has(candidateType)) || textured
        : (candidateType === "convert_model" || candidateType === "smart_low_poly" || candidate?.mode === "retopo" || candidate?.params?.mode === "retopo") && !hasTextureMarker(candidate));

    if (!shouldUseUpstream) {
      return { taskId: candidateTaskId || fallback, item: candidate, resolvedFromUpstream: false, selectedItem: selected };
    }
    if (seen.has(upstreamId)) {
      return { taskId: upstreamId, item: findHistoryItemByTaskKey(upstreamId), resolvedFromUpstream: true, selectedItem: selected };
    }
    seen.add(upstreamId);

    const upstreamItem = findHistoryItemByTaskKey(upstreamId);
    if (!upstreamItem) {
      return { taskId: upstreamId, item: null, resolvedFromUpstream: true, selectedItem: selected };
    }

    const resolved = visit(upstreamItem, upstreamId, seen);
    return { ...resolved, resolvedFromUpstream: true, selectedItem: selected };
  };

  return visit(selected, fallbackTaskId);
}
