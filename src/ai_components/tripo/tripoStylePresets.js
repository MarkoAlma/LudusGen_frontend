export const STYLE_PREFIX = [
  {
    id: "photo",
    label: "Photo",
    icon: "📷",
    prefix: "photorealistic, high detail photography, professional 3D render, cinematic lighting, 8k resolution, ultra-detailed textures, realistic materials, ",
    draftPrefix: "photorealistic, high detail shape study, realistic proportions, clean silhouette, high-fidelity geometry, fine surface detail, ",
  },
  { id: "voxel", label: "Voxel", icon: "🧊", prefix: "precise voxel art style, cubic voxel grid construction, blocky 3D modular design, clean voxel geometry, isometric voxel aesthetic, " },
  { id: "pixel", label: "Pixel", icon: "👾", prefix: "retro 32-bit pixel art style, conversion of 2D sprite to 3D volume, stylized jagged edges, vibrant limited palette, nostalgic game aesthetic, " },
  { id: "clay", label: "Clay", icon: "🏺", prefix: "claymation style, authentic clay surface with fingerprints, hand-sculpted plasticine texture, soft rounded organic forms, stop-motion aesthetic, " },
  { id: "cartoon", label: "Cartoon", icon: "🎨", prefix: "stylized 3D cartoon, expressive proportions, clean toon shaded surfaces, vibrant saturated colors, high-quality animation style, " },
  { id: "anime", label: "Anime", icon: "✨", prefix: "high-quality anime 3D model, cel-shaded aesthetics, crisp outlines, vibrant anime palette, Japanese studio animation style, " },
  { id: "chibi", label: "Chibi", icon: "🧸", prefix: "adorable chibi style, stylized super-deformed proportions, large expressive eyes, small cute body, toy-like aesthetic, kawaii character design, " },
  { id: "sculpt", label: "Sculpt", icon: "🗿", prefix: "masterpiece marble sculpture, high-detail museum quality stonework, realistic chiseled surfaces, classical art aesthetic, white marble texture, " },
  { id: "mini", label: "Mini", icon: "🎲", prefix: "highly detailed tabletop miniature, custom 3D printed figurine style, hand-painted gaming piece scale, macro photography of a scale model, " },
];

export function getTripoStylePreset(styleId) {
  return STYLE_PREFIX.find((style) => style.id === styleId) || null;
}

export function stripTripoStylePrefix(prompt, styleId) {
  const rawPrompt = typeof prompt === "string" ? prompt : "";
  if (!rawPrompt) return "";
  const style = getTripoStylePreset(styleId);
  if (!style?.prefix) return rawPrompt;
  return rawPrompt.startsWith(style.prefix) ? rawPrompt.slice(style.prefix.length) : rawPrompt;
}
