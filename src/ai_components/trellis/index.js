// ────────────────────────────────────────────────────────────────────────────
// Trellis module barrel export
// ────────────────────────────────────────────────────────────────────────────

// Design tokens
export { T } from './tokens';

// Constants & system prompts
export {
  VIEW_MODES,
  BG_OPTIONS,
  EXAMPLE_PROMPTS,
  STYLE_OPTIONS,
  TRELLIS_PRESETS,
  ENHANCE_SYSTEM,
  DECHANTER_SYSTEM,
  TRELLIS_COLLECTION,
} from './Constants';

// Helper utilities
export {
  stripStylePrefix,
  applyStylePrefix,
  fmtDate,
  defaultParams,
  fetchGlbAsBlob,
  streamChat,
  // BUG FIX: saveHistoryToFirestore a utils.js-ből jön (ts mezőt is menti),
  // nem a firestore.js-ből (elavult, ts nélküli verzió)
  saveHistoryToFirestore,
  loadHistoryPageFromFirestore,
} from './utils';

// Firestore operations (csak a deleteHistoryFromFirestore maradt itt, az nincs utils-ban)
export {
  loadHistoryFromFirestore,
  deleteHistoryFromFirestore,
} from './firestore';

// Common UI primitives
export {
  SectionLabel,
  Pill,
  Card,
  MiniSlider,
  NumInput,
  ToggleRow,
} from './UIComponents';

// Specialized components
export { WireframeControl } from './WireframeControl';
export { RigControl } from './RigControl';
export { BgColorPicker } from './BgColorPicker';
export { default as HistoryCard } from '../shared/HistoryCard';
export { default as StylePicker } from './StylePicker';
export { default as PromptInput } from './PromptInput';
export { default as ConfirmModal } from './ConfirmModal';