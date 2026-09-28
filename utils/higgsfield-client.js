const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Server-side port of the Open Higgsfield studio's generation layer (open-higgsfield-main/src/generation):
// one platform key (`id:secret`), `POST /{model path}` to submit, `GET /requests/{id}/status` to poll.
// Only the models that make sense for unattended B-roll, scene stills and thumbnails are carried over.

const DEFAULT_BASE_URL = 'https://api.higgsfield.ai';
const TERMINAL = new Set(['completed', 'failed', 'nsfw', 'canceled', 'cancelled']);

const VIDEO_ASPECT = ['16:9', '9:16', '1:1'];
const SEEDANCE_ASPECT = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'];
const SOUL_ASPECT = ['9:16', '16:9', '4:3', '3:4', '1:1', '2:3', '3:2'];
const IMAGE_ASPECT = ['1:1', '4:3', '3:4', '16:9', '9:16'];

function t2v(textPath) {
  return { text: textPath, image: textPath.replace(/\/text-to-video$/, '/image-to-video') };
}

const generic = (label, paths, extra = {}) => ({
  label, kind: 'generic', paths, minDuration: 4, maxDuration: 10,
  aspects: VIDEO_ASPECT, resolutions: ['720p', '1080p'], nativeAudio: false, ...extra
});

const VIDEO_MODELS = {
  'seedance-2.5': { label: 'Seedance 2.5', kind: 'seedance', prefix: 'bytedance/seedance-2.5', minDuration: 4, maxDuration: 30, aspects: SEEDANCE_ASPECT, resolutions: ['480p', '720p'], nativeAudio: true, lastFrame: true },
  'seedance-2': { label: 'Seedance 2.0', kind: 'seedance', prefix: 'bytedance/seedance-2.0', minDuration: 4, maxDuration: 15, aspects: SEEDANCE_ASPECT, resolutions: ['480p', '720p'], nativeAudio: true, lastFrame: true },
  'seedance-2-fast': { label: 'Seedance 2.0 Fast', kind: 'seedance', prefix: 'bytedance/seedance-2.0/fast', minDuration: 4, maxDuration: 15, aspects: SEEDANCE_ASPECT, resolutions: ['480p', '720p'], nativeAudio: true, lastFrame: true },
  'kling-3-turbo': { label: 'Kling 3.0 Turbo', kind: 'kling-turbo', prefix: 'kling-video/v3.0-turbo', minDuration: 3, maxDuration: 15, aspects: VIDEO_ASPECT, resolutions: ['720p', '1080p'], nativeAudio: false },
  'kling-3-std': { label: 'Kling 3.0 Standard', kind: 'kling3', prefix: 'kling-video/v3.0/std', minDuration: 3, maxDuration: 15, aspects: VIDEO_ASPECT, resolutions: ['1080p'], nativeAudio: true, lastFrame: true },
  'kling-3-pro': { label: 'Kling 3.0 Pro', kind: 'kling3', prefix: 'kling-video/v3.0/pro', minDuration: 3, maxDuration: 15, aspects: VIDEO_ASPECT, resolutions: ['1080p'], nativeAudio: true, lastFrame: true },
  'kling-3-4k': { label: 'Kling 3.0 4K', kind: 'kling3', prefix: 'kling-video/v3.0/4k', minDuration: 3, maxDuration: 15, aspects: VIDEO_ASPECT, resolutions: ['4k'], nativeAudio: true, lastFrame: true },
  'kling-2.6': generic('Kling 2.6 Pro', t2v('kling-video/v2.6/pro/text-to-video')),
  'minimax-h3': generic('MiniMax H3', t2v('minimax/h3/text-to-video')),
  'minimax-hailuo-2.3': generic('MiniMax Hailuo 2.3', t2v('minimax/hailuo-2.3/standard/text-to-video')),
  'wan-3': generic('Wan 3.0', t2v('alibaba/wan-3.0/text-to-video')),
  'wan-3-prime': generic('Wan 3.0 Prime', t2v('alibaba/wan-3.0-prime/text-to-video')),
  'wan-2.7': generic('Wan 2.7', t2v('wan/v2.7/text-to-video')),
  'ltx-2.5-pro': generic('LTX 2.5 Pro', { text: 'lightricks/ltx-2.5/text-to-video/pro' }),
  'ltx-2.5-fast': generic('LTX 2.5 Fast', { text: 'lightricks/ltx-2.5/text-to-video/fast' }),
  'pixverse-6': generic('PixVerse 6', t2v('pixverse/v6/text-to-video')),
  'happy-horse-1.1': generic('Happy Horse 1.1', t2v('alibaba/happy-horse/v1.1/text-to-video'))
};

const IMAGE_MODELS = {
  'soul-cinema': { label: 'Soul Cinema', kind: 'soul', path: 'higgsfield-ai/soul/cinema', aspects: SOUL_ASPECT, resolutions: ['720p', '1080p'], defaultResolution: '1080p' },
  'soul-2': { label: 'Soul 2', kind: 'soul', path: 'higgsfield-ai/soul/v2/standard', aspects: SOUL_ASPECT, resolutions: ['720p', '1080p'], defaultResolution: '1080p' },
  'flux-2': { label: 'Flux 2', kind: 'generic', path: 'flux-2-pro', aspects: IMAGE_ASPECT, resolutions: ['1k', '2k', '4k'], defaultResolution: '2k' },
  'ideogram-4': { label: 'Ideogram 4', kind: 'generic', path: 'ideogram/v4.0', aspects: IMAGE_ASPECT, resolutions: ['1k', '2k', '4k'], defaultResolution: '2k' },
  'recraft-4.1': { label: 'Recraft 4.1', kind: 'generic', path: 'recraft/v4.1/text-to-image', aspects: IMAGE_ASPECT, resolutions: ['1k', '2k', '4k'], defaultResolution: '2k' },
  'qwen-image-3': { label: 'Qwen Image 3', kind: 'generic', path: 'alibaba/qwen-image-3/text-to-image', aspects: IMAGE_ASPECT, resolutions: ['1k', '2k', '4k'], defaultResolution: '2k' },
  'z-image-turbo': { label: 'Z-Image Turbo', kind: 'generic', path: 'z-image/turbo', aspects: IMAGE_ASPECT, resolutions: ['1k', '2k', '4k'], defaultResolution: '1k' }
};

const DEFAULT_VIDEO_MODEL = 'kling-3-std';
const DEFAULT_IMAGE_MODEL = 'soul-cinema';

class HiggsfieldError extends Error {
  constructor(status, body) {
    const detail = body && typeof body === 'object' ? body.detail : null;
    const message = typeof detail === 'string' && detail ? detail : `Higgsfield request failed (${status})`;
    super(message === 'not_enough_credits' ? 'Higgsfield account has not enough credits (not_enough_credits)' : message);
    this.name = 'HiggsfieldError';
    this.status = status;
  }
}

// Accepts HIGGSFIELD_API_KEY=id:secret, the official SDK's HF_CREDENTIALS, or the id and secret separately.
function resolveHiggsfieldKey(credentials = {}) {
  const creds = credentials.credentials || credentials;
  const direct = creds.higgsfield?.apiKey || process.env.HIGGSFIELD_API_KEY || process.env.HF_CREDENTIALS;
  if (direct) return String(direct).trim();
  const id = creds.higgsfield?.keyId || process.env.HIGGSFIELD_KEY_ID || process.env.HF_API_KEY;
  const secret = creds.higgsfield?.keySecret || process.env.HIGGSFIELD_KEY_SECRET || process.env.HF_API_SECRET;
  return id && secret ? `${String(id).trim()}:${String(secret).trim()}` : null;
}

function isValidKey(apiKey) {
  const value = String(apiKey || '');
  const colon = value.indexOf(':');
  return colon > 0 && colon < value.length - 1;
}

function pick(value, allowed, fallback) {
  const normalized = String(value || '').toLowerCase();
  return allowed.find(item => item.toLowerCase() === normalized) || fallback;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(Number(value) || min)));

// Local files become data URLs only when HIGGSFIELD_INLINE_MEDIA=true: the studio uploads media to a
// public CDN first, so inline data is opt-in until the platform is confirmed to accept it.
async function toMediaUrl(value, inlineMedia) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!inlineMedia) return null;
  if (/^data:/i.test(value)) return value;
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(value).toLowerCase()];
  if (!mime) return null;
  return `data:${mime};base64,${(await fs.readFile(value)).toString('base64')}`;
}

function mapVideoRequest(modelId, request) {
  const model = VIDEO_MODELS[modelId];
  if (!model) throw new Error(`Unknown Higgsfield video model: ${modelId}`);
  const { prompt, start, end } = request;
  const duration = clamp(request.duration, model.minDuration, model.maxDuration);
  const aspectRatio = pick(request.aspectRatio, model.aspects, model.aspects[0]);
  const resolution = pick(request.resolution, model.resolutions, model.resolutions[0]);

  if (model.kind === 'seedance') {
    const body = { prompt, resolution, duration, generate_audio: request.generateAudio === true, output_format: 'mp4' };
    if (start) return { path: `${model.prefix}/image-to-video`, body: { ...body, image_url: start, ...(end ? { end_image_url: end } : {}) } };
    return { path: `${model.prefix}/text-to-video`, body: { ...body, aspect_ratio: aspectRatio } };
  }
  if (model.kind === 'kling-turbo') {
    return start
      ? { path: `${model.prefix}/image-to-video`, body: { prompt, duration, resolution, image_url: start } }
      : { path: `${model.prefix}/text-to-video`, body: { prompt, duration, resolution, aspect_ratio: aspectRatio } };
  }
  if (model.kind === 'kling3') {
    const body = { prompt, sound: request.generateAudio ? 'on' : 'off', duration, cfg_scale: 0.5, multi_shots: false };
    if (start) return { path: `${model.prefix}/image-to-video`, body: { ...body, image_url: start, ...(end ? { last_image_url: end } : {}) } };
    return { path: `${model.prefix}/text-to-video`, body: { ...body, aspect_ratio: aspectRatio } };
  }
  const body = { prompt, aspect_ratio: aspectRatio, resolution, duration };
  if (start && model.paths.image) return { path: model.paths.image, body: { ...body, image_url: start } };
  return { path: model.paths.text, body };
}

function mapImageRequest(modelId, request) {
  const model = IMAGE_MODELS[modelId];
  if (!model) throw new Error(`Unknown Higgsfield image model: ${modelId}`);
  const aspectRatio = pick(request.aspectRatio, model.aspects, '16:9');
  const resolution = pick(request.resolution, model.resolutions, model.defaultResolution);
  if (model.kind === 'soul') {
    return { path: model.path, body: { prompt: request.prompt, batch_size: 1, resolution, aspect_ratio: aspectRatio, enhance_prompt: false } };
  }
  return { path: model.path, body: { prompt: request.prompt, aspect_ratio: aspectRatio, resolution } };
}

function normalizeStatus(payload = {}) {
  const raw = String(payload.status || 'unknown').toLowerCase();
  const status = raw === 'completed' ? 'succeeded'
    : raw === 'failed' || raw === 'nsfw' ? 'failed'
      : raw === 'canceled' || raw === 'cancelled' ? 'cancelled'
        : raw === 'queued' ? 'queued' : 'running';
  const images = Array.isArray(payload.images) ? payload.images.map(item => item?.url).filter(url => typeof url === 'string') : [];
  const error = raw === 'nsfw'
    ? 'Higgsfield rejected the output as NSFW'
    : payload.error ? String(typeof payload.error === 'string' ? payload.error : payload.error.message || JSON.stringify(payload.error)).slice(0, 500) : null;
  return {
    externalTaskId: payload.request_id || null,
    rawStatus: raw,
    status,
    terminal: TERMINAL.has(raw),
    outputUrl: typeof payload.video?.url === 'string' ? payload.video.url : images[0] || null,
    images,
    error
  };
}

class HiggsfieldClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.baseUrl = String(options.baseUrl || process.env.HIGGSFIELD_API_BASE_URL || process.env.HF_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.http = options.http || axios;
    this.sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  }

  isConfigured() { return isValidKey(this.apiKey); }

  async send(method, route, body) {
    if (!this.isConfigured()) throw new Error('Higgsfield API key must be id:secret');
    const response = await this.http.request({
      method,
      url: `${this.baseUrl}${route}`,
      headers: { Authorization: `Key ${this.apiKey}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { data: body } : {}),
      timeout: method === 'POST' ? 120000 : 30000,
      validateStatus: () => true
    });
    if (response.status < 200 || response.status >= 300) throw new HiggsfieldError(response.status, response.data);
    return response.data || {};
  }

  async submit(modelPath, body) {
    if (!/^[a-z0-9][a-z0-9._/-]*$/i.test(modelPath) || modelPath.includes('..')) throw new Error('Invalid Higgsfield model path');
    const data = await this.send('POST', `/${modelPath}`, body);
    if (!data.request_id) throw new HiggsfieldError(502, { detail: 'Higgsfield response missing request_id' });
    return { requestId: data.request_id, status: String(data.status || 'queued').toLowerCase() };
  }

  async status(requestId) {
    return normalizeStatus(await this.send('GET', `/requests/${encodeURIComponent(requestId)}/status`));
  }

  // Blocking wait used for images; video clips are polled by MediaGenerationService so they can resume.
  async waitFor(requestId, { intervalMs = 4000, timeoutMs = 10 * 60 * 1000 } = {}) {
    const started = Date.now();
    for (;;) {
      const result = await this.status(requestId);
      if (result.terminal) return result;
      if (Date.now() - started > timeoutMs) throw new Error('Timed out waiting for Higgsfield');
      await this.sleep(intervalMs);
    }
  }

  async generateImage(prompt, outputPath, options = {}) {
    const modelId = options.model || process.env.HIGGSFIELD_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
    const { path: modelPath, body } = mapImageRequest(modelId, { prompt, aspectRatio: options.aspectRatio, resolution: options.resolution || process.env.HIGGSFIELD_IMAGE_RESOLUTION });
    const queued = await this.submit(modelPath, body);
    const result = await this.waitFor(queued.requestId, options);
    if (result.status !== 'succeeded' || !result.images.length) {
      throw new Error(result.error || `Higgsfield image generation ${result.rawStatus}`);
    }
    const response = await this.http.get(result.images[0], { responseType: 'arraybuffer', timeout: 120000 });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from(response.data));
    return { path: outputPath, model: modelId, requestId: queued.requestId };
  }
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_IMAGE_MODEL,
  VIDEO_MODELS,
  IMAGE_MODELS,
  HiggsfieldClient,
  HiggsfieldError,
  resolveHiggsfieldKey,
  mapVideoRequest,
  mapImageRequest,
  normalizeStatus,
  toMediaUrl
};
