import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const marketplaceSource = readFileSync(resolve(__dirname, "../Marketplace.jsx"), "utf8");

assert(
  marketplaceSource.includes("ThreeViewer"),
  "Marketplace should import and render the shared ThreeViewer for 3D assets",
);

assert(
  marketplaceSource.includes("function MarketplaceModelPreview"),
  "Marketplace should have a dedicated 3D model preview loader",
);

assert(
  marketplaceSource.includes('/api/marketplace/assets/${asset.id}/download?inline=1'),
  "Marketplace 3D previews should load the protected asset through the inline download endpoint",
);

assert(
  marketplaceSource.includes("URL.createObjectURL(blob)"),
  "Marketplace 3D previews should turn authorized downloads into blob URLs for ThreeViewer",
);

assert(
  marketplaceSource.includes("URL.revokeObjectURL(objectUrl)"),
  "Marketplace 3D previews should revoke blob URLs on cleanup",
);

assert(
  marketplaceSource.includes("<ThreeViewer"),
  "Marketplace 3D previews should render the actual model viewer, not only an icon placeholder",
);

assert(
  marketplaceSource.includes("user={user}"),
  "Marketplace detail previews should receive the current user so owner/owned access can render models",
);

assert(
  marketplaceSource.includes("fetchMarketplacePublicJson"),
  "Marketplace public list/detail requests should retry without optional auth when a stale token returns 401/403",
);

assert(
  marketplaceSource.includes("function MarketplaceHistoryThumb"),
  "Marketplace history publishing should use the same generated thumbnail pipeline as the 3D history panel",
);

assert(
  marketplaceSource.includes("asset.modelPreviewUrl || asset.modelUrl"),
  "Marketplace 3D previews should prefer server-provided protected model URLs when available",
);

console.log("marketplace3dPreview assertions passed");
