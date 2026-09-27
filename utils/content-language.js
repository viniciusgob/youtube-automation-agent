// Channel content language (BCP-47), e.g. CONTENT_LANGUAGE=pt-BR. Defaults to English.
const LANGUAGE_NAMES = {
  en: 'English',
  'pt-BR': 'Brazilian Portuguese',
  pt: 'Portuguese',
  'pt-PT': 'European Portuguese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian'
};

function getContentLanguage() {
  const value = String(process.env.CONTENT_LANGUAGE || 'en').trim();
  return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value) ? value : 'en';
}

function getContentLanguageName(code = getContentLanguage()) {
  return LANGUAGE_NAMES[code] || LANGUAGE_NAMES[code.split('-')[0]] || code;
}

function isEnglish(code = getContentLanguage()) {
  return code.split('-')[0].toLowerCase() === 'en';
}

// Appended to AI prompts so every human-readable field is written in the channel language.
function languageInstruction(code = getContentLanguage()) {
  if (isEnglish(code)) return '';
  const name = getContentLanguageName(code);
  return `\n\nLanguage requirement: write every human-readable value (titles, hooks, narration, descriptions, tags, replies, rationales) in ${name} (${code}), natural for a native audience. Keep JSON keys, enum values, and URLs exactly as specified.`;
}

module.exports = { getContentLanguage, getContentLanguageName, isEnglish, languageInstruction };
