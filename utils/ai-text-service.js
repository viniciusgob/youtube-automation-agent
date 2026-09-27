const OpenAI = require('openai');
const { Logger } = require('./logger');
const { languageInstruction } = require('./content-language');

const GEMINI_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash-lite',
];
const GEMINI_DEFAULT_MODEL = GEMINI_MODELS[0];

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.6',
    models: ['gpt-5.6', 'gpt-5.6-terra', 'gpt-5.6-luna'],
    envKey: 'OPENAI_API_KEY',
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-5.6-sol',
    models: ['openai/gpt-5.6-sol', 'anthropic/claude-fable-5', 'google/gemini-3.7-flash', 'moonshotai/kimi-k3', 'z-ai/glm-5.3'],
    envKey: 'OPENROUTER_API_KEY',
  },
  kimi: {
    name: 'Kimi (Moonshot AI)',
    baseURL: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k3',
    models: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2.6'],
    envKey: 'MOONSHOT_API_KEY',
  },
  mimo: {
    name: 'MiMo (Xiaomi)',
    baseURL: 'https://api.xiaomimimo.com/v1',
    defaultModel: 'mimo-v2.5-pro',
    models: ['mimo-v2.5-pro', 'mimo-v2.5'],
    envKey: 'MIMO_API_KEY',
  },
  glm: {
    name: 'GLM (Zhipu AI)',
    baseURL: 'https://api.z.ai/api/paas/v4/',
    defaultModel: 'glm-5.3',
    models: ['glm-5.3', 'glm-5.2', 'glm-5.1'],
    envKey: 'GLM_API_KEY',
  },
};

class AITextService {
  constructor(credentials = {}) {
    this.logger = new Logger('AITextService');
    this.client = null;
    this.gemini = null;
    this.model = null;
    this.providerName = null;

    this._init(credentials);
  }

  _init(credentials) {
    const provider = credentials.aiProvider?.provider;
    const apiKey = credentials.aiProvider?.apiKey;
    const model = credentials.aiProvider?.model;

    if (provider && PROVIDERS[provider] && apiKey) {
      return this._initOpenAICompatible(PROVIDERS[provider], apiKey, model);
    }

    for (const [, preset] of Object.entries(PROVIDERS)) {
      const key = process.env[preset.envKey];
      if (key) {
        return this._initOpenAICompatible(preset, key);
      }
    }

    const geminiKey = credentials.gemini?.apiKey || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      return this._initGemini(geminiKey, credentials.gemini?.model);
    }

    this.logger.warn('No AI text provider configured — text generation unavailable');
  }

  _initOpenAICompatible(preset, apiKey, model) {
    this.client = new OpenAI({ apiKey, baseURL: preset.baseURL });
    this.model = model || preset.defaultModel;
    this.providerName = preset.name;
    this.logger.info(`${preset.name} initialized (model: ${this.model})`);
  }

  _initGemini(apiKey, model) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      this.gemini = new GoogleGenAI({ apiKey });
      this.model = model || process.env.GEMINI_TEXT_MODEL || GEMINI_DEFAULT_MODEL;
      this.providerName = 'Google Gemini';
      this.logger.info(`Gemini initialized (model: ${this.model})`);
    } catch (error) {
      this.logger.error('Failed to initialize Gemini:', error.message);
    }
  }

  async generateText(prompt, options = {}) {
    if (options.language !== false) prompt += languageInstruction();
    const attempts = Math.max(1, Number(process.env.AI_TEXT_MAX_ATTEMPTS || 3));
    const models = [options.model || this.model, ...(options.model ? [] : this._fallbackModels())];
    let lastError;
    for (const [index, model] of models.entries()) {
      if (index > 0) this.logger.warn(`${this.providerName} model ${models[index - 1]} is unavailable; falling back to ${model}`);
      let maxTokens = options.maxTokens || 2048;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await this._generateOnce(prompt, { ...options, model, maxTokens });
        } catch (error) {
          lastError = error;
          if (error.truncated && attempt < attempts) {
            maxTokens *= 2;
            this.logger.warn(`${this.providerName} response was cut off at the token limit; retrying with maxTokens=${maxTokens}`);
            continue;
          }
          // A per-model quota (429) or overload won't clear by retrying the same model; try the next one.
          if (this._isQuotaError(error)) break;
          if (!this._isTransientError(error)) throw error;
          if (attempt >= attempts) break;
          const delay = 2000 * attempt;
          this.logger.warn(`${this.providerName} is temporarily unavailable; retrying in ${delay / 1000}s (attempt ${attempt + 1}/${attempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  // Gemini only: alternative models tried when the primary is overloaded or out of quota.
  // Override with GEMINI_FALLBACK_MODELS (comma-separated); set it to "none" to disable.
  _fallbackModels() {
    if (!this.gemini) return [];
    const configured = process.env.GEMINI_FALLBACK_MODELS;
    if (String(configured).trim().toLowerCase() === 'none') return [];
    const list = configured ? configured.split(',') : ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
    return [...new Set(list.map(model => model.trim()).filter(model => model && model !== this.model))];
  }

  _isQuotaError(error) {
    const status = Number(error?.status || error?.code || error?.error?.code);
    return status === 429 || /\b429\b|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(String(error?.message || ''));
  }

  // Provider overload / server errors (e.g. Gemini 503 "high demand") usually clear within seconds.
  _isTransientError(error) {
    const status = Number(error?.status || error?.code || error?.error?.code);
    if ([500, 502, 503, 504].includes(status)) return true;
    return /\b(503|502|500|504)\b|UNAVAILABLE|high demand|overloaded|temporarily/i.test(String(error?.message || ''));
  }

  async _generateOnce(prompt, options = {}) {
    const model = options.model || this.model;
    const maxTokens = options.maxTokens || 2048;
    const temperature = options.temperature ?? 0.7;

    if (this.gemini) {
      // Gemini "thinking" tokens count against maxOutputTokens, so reserve headroom on top of
      // the answer budget; otherwise long answers (e.g. pt-BR descriptions) get cut mid-JSON.
      const thinkingHeadroom = Math.max(0, Number(process.env.GEMINI_THINKING_HEADROOM ?? 6144));
      const config = { maxOutputTokens: maxTokens + thinkingHeadroom };
      if (options.json ?? /return only valid json/i.test(prompt)) config.responseMimeType = 'application/json';
      if (!/^gemini-3\.(?:[5-9]|\d{2,})-/.test(model)) config.temperature = temperature;
      const response = await this.gemini.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      if (response?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw this._truncatedError(model);
      }
      const text = response && response.text;
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error(
          `${this.providerName} returned an empty response. Check the API key and model quota — free-tier Gemini keys are rate-limited and can return empty output.`
        );
      }
      return text;
    }

    if (!this.client) {
      throw new Error('No AI text provider configured');
    }

    const params = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
    };

    try {
      // Newer OpenAI models (gpt-5.x and later) reject the legacy max_tokens
      // parameter with a 400 error and require max_completion_tokens instead.
      const response = await this.client.chat.completions.create({
        ...params,
        max_completion_tokens: maxTokens,
      });
      return this._extractContent(response);
    } catch (error) {
      // Older models and some providers reject max_completion_tokens with a 400;
      // retry the same request using the legacy max_tokens spelling.
      if (
        error &&
        error.status === 400 &&
        /max(_completion)?_tokens/i.test(error.message || '')
      ) {
        const response = await this.client.chat.completions.create({
          ...params,
          max_tokens: maxTokens,
        });
        return this._extractContent(response);
      }
      throw error;
    }
  }

  _truncatedError(model) {
    const error = new Error(`${this.providerName} (${model}) stopped at the token limit before finishing the response`);
    error.truncated = true;
    return error;
  }

  _extractContent(response) {
    if (response?.choices?.[0]?.finish_reason === 'length') throw this._truncatedError(this.model);
    const content =
      response &&
      response.choices &&
      response.choices[0] &&
      response.choices[0].message
        ? response.choices[0].message.content
        : null;

    if (typeof content !== 'string' || !content.trim()) {
      // A null/empty body used to surface as cryptic "Unexpected end of JSON input"
      // in the agents' JSON parsers. Report the real cause instead.
      throw new Error(
        `${this.providerName} returned an empty response. Check the API key and model quota.`
      );
    }
    return content;
  }

  isAvailable() {
    return !!(this.client || this.gemini);
  }
}

module.exports = { AITextService, PROVIDERS, GEMINI_MODELS, GEMINI_DEFAULT_MODEL };
