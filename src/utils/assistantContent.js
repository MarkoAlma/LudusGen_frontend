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
