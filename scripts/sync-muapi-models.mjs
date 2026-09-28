// Regenerates utils/muapi-models.json from local Open Generative AI checkouts.
// Usage: node scripts/sync-muapi-models.mjs [newest-checkout] [older-checkout ...]
// Defaults to ../Open-Generative-AI-main and ../Open-Generative-AI-2.0.0 next to this repository.
// The newest checkout wins for shared ids; older ones only contribute models that were dropped since.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = process.argv.slice(2).length
  ? process.argv.slice(2).map(dir => path.resolve(dir))
  : ['Open-Generative-AI-main', 'Open-Generative-AI-2.0.0'].map(dir => path.resolve(root, '..', dir));

// Unfiltered variants are left out: they are not suitable for a monetised YouTube channel.
const allowed = model => !/spicy|nsfw|uncensored/i.test(`${model.id} ${model.name || ''}`);

function slim(model, source) {
  const inputs = {};
  for (const [key, spec] of Object.entries(model.inputs || {})) {
    if (key === 'prompt') continue;
    const entry = {};
    if (spec.enum) entry.enum = spec.enum;
    if (spec.minValue !== undefined) entry.min = spec.minValue;
    if (spec.maxValue !== undefined) entry.max = spec.maxValue;
    if (spec.default !== undefined) entry.default = spec.default;
    if (spec.type) entry.type = spec.type;
    inputs[key] = entry;
  }
  return {
    id: model.id,
    name: model.name,
    endpoint: model.endpoint || model.id,
    ...(model.imageField ? { imageField: model.imageField } : {}),
    ...(model.lastImageField ? { lastImageField: model.lastImageField } : {}),
    ...(source ? { source } : {}),
    inputs
  };
}

const families = { textToVideo: 't2vModels', imageToVideo: 'i2vModels', textToImage: 't2iModels' };
const catalog = { sources: [], generatedAt: new Date().toISOString().slice(0, 10) };
for (const key of Object.keys(families)) catalog[key] = [];

for (const [index, dir] of sources.entries()) {
  const file = path.join(dir, 'packages', 'studio', 'src', 'models.js');
  if (!fs.existsSync(file)) {
    console.warn(`skipped ${dir}: packages/studio/src/models.js not found`);
    continue;
  }
  const models = await import(pathToFileURL(file).href);
  const label = path.basename(dir);
  catalog.sources.push(label);
  for (const [key, exportName] of Object.entries(families)) {
    const seen = new Set(catalog[key].map(model => model.id));
    const added = (models[exportName] || []).filter(allowed).filter(model => !seen.has(model.id))
      .map(model => slim(model, index === 0 ? null : label));
    catalog[key].push(...added);
    console.log(`${label} ${key}: +${added.length}`);
  }
}

if (!catalog.sources.length) throw new Error('No Open Generative AI checkout found');
fs.writeFileSync(path.join(root, 'utils', 'muapi-models.json'), JSON.stringify(catalog));
console.log(`wrote utils/muapi-models.json (${catalog.textToVideo.length} t2v, ${catalog.imageToVideo.length} i2v, ${catalog.textToImage.length} t2i)`);
