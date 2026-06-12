// src/services/tts/index.js
//
// Provider-agnostic Text-to-Speech abstraction.
//
// Every provider module exports a `synthesize(text, options)` function that
// returns a normalized result so the rest of the app does not care which
// backend produced the audio:
//
//   {
//     provider:        string,   // 'elevenlabs' | 'sixtydb'
//     audio:           Buffer,   // raw audio bytes
//     contentType:     string,   // e.g. 'audio/mpeg'
//     format:          string,   // e.g. 'mp3'
//     voiceId:         string,   // voice actually used
//     sampleRate?:     number,   // Hz, when the provider reports it
//     durationSeconds?: number   // length, when the provider reports it
//   }
//
// Note on parameter ranges: `speed`, `stability` and `similarity` are passed
// through to the provider untouched, and each provider uses its own native
// scale (ElevenLabs: stability/similarity 0-1; 60db: stability/similarity
// 0-100, speed 0.5-2.0). Callers should send values appropriate to the
// chosen provider.
const config = require('../../config/environment');
const elevenLabsProvider = require('./elevenLabsProvider');
const sixtyDbProvider = require('./sixtyDbProvider');

const providers = {
  elevenlabs: elevenLabsProvider,
  sixtydb: sixtyDbProvider
};

/**
 * Resolves a provider module by name, falling back to the configured default.
 *
 * @param {string} [name] - Provider name ('elevenlabs' | 'sixtydb')
 * @returns {{ name: string, synthesize: Function }} Provider module
 */
function getProvider(name) {
  const key = (name || config.tts.provider || 'elevenlabs').toLowerCase();
  const provider = providers[key];

  if (!provider) {
    throw new Error(
      `Unknown TTS provider: "${key}". Available providers: ${Object.keys(providers).join(', ')}`
    );
  }

  return provider;
}

/**
 * Synthesizes speech using the selected (or default) provider.
 *
 * @param {string} text - Text to synthesize
 * @param {Object} [options] - Synthesis options
 * @param {string} [options.provider] - Override the default provider
 * @param {string} [options.voiceId] - Voice to use (provider-specific)
 * @param {string} [options.outputFormat] - Container format (provider-specific)
 * @param {number} [options.speed] - Speaking rate (provider-native scale)
 * @param {number} [options.stability] - Voice stability (provider-native scale)
 * @param {number} [options.similarity] - Source-voice match (provider-native scale)
 * @param {boolean} [options.enhance] - Audio enhancement (60db only)
 * @returns {Promise<Object>} Normalized synthesis result (see module docs)
 */
async function synthesize(text, options = {}) {
  const provider = getProvider(options.provider);
  return provider.synthesize(text, options);
}

module.exports = {
  synthesize,
  getProvider,
  providers: Object.keys(providers)
};
