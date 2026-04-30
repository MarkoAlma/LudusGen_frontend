const THINKING_BLOCK_PATTERNS = [
  /<think\b[^>]*>[\s\S]*?<\/think>/gi,
  /<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi,
  /```thinking[\s\S]*?```/gi,
  /```reasoning[\s\S]*?```/gi,
];

export function stripAssistantThinking(value) {
  if (typeof value !== 'string') return '';

  let normalized = value;
  for (const pattern of THINKING_BLOCK_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  return normalized
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default stripAssistantThinking;
