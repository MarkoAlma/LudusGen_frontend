export const resolveTripoUrlNode = (node) => {
  if (!node) return null;
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const value = resolveTripoUrlNode(item);
      if (value) return value;
    }
    return null;
  }
  if (typeof node !== "object") return null;

  return (
    node.url ||
    node.modelUrl ||
    node.model_url ||
    node.file_url ||
    node.download_url ||
    node.href ||
    null
  );
};

export function resolveTripoModelUrl(payload) {
  if (!payload) return null;

  const topLevel = resolveTripoUrlNode(payload.modelUrl) || resolveTripoUrlNode(payload.model_url) || resolveTripoUrlNode(payload.url);
  if (topLevel) return topLevel;

  const out = payload.output || payload.rawOutput || {};
  const animatedModel = Array.isArray(out.animated_models) ? out.animated_models[0] : out.animated_model;
  const candidates = [
    out.pbr_model,
    out.textured_model,
    out.model,
    out.model_url,
    out.base_model,
    out.rigged_model,
    animatedModel,
    out.converted_model,
    out.low_poly_model,
    out.segmented_model,
    out.stylized_model,
    out.refined_model,
  ];

  for (const candidate of candidates) {
    const value = resolveTripoUrlNode(candidate);
    if (value) return value;
  }

  return null;
}
