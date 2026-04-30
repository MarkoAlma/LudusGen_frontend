<<<<<<< HEAD
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
=======
export function stripAssistantThinking(value, { hideOpenBlock = true } = {}) {
  let text = typeof value === 'string' ? value : value == null ? '' : String(value);
  if (!text) return '';

  text = text
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/<reasoning\b[^>]*>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/```(?:thinking|reasoning|thoughts?|chain[-_\s]?of[-_\s]?thought)\s*\n[\s\S]*?```/gi, '');

  if (hideOpenBlock) {
    text = text
      .replace(/<think(?:ing)?\b[^>]*>[\s\S]*$/i, '')
      .replace(/<reasoning\b[^>]*>[\s\S]*$/i, '')
      .replace(/```(?:thinking|reasoning|thoughts?|chain[-_\s]?of[-_\s]?thought)\s*\n[\s\S]*$/i, '')
      .replace(/<(?:t|th|thi|thin|think|thinki|thinkin|thinking|r|re|rea|reas|reaso|reason|reasoni|reasonin|reasoning)?$/i, '');
  }

  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
>>>>>>> 946a854dc804346fde6d3d4b8686910db85a9f33
