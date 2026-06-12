// src/services/tts/sixtyDbProvider.js
//
// 60db (sixtydb) adapter for the TTS abstraction. Uses the simple HTTP
// synthesis endpoint:
//   POST https://api.60db.ai/tts-synthesize
// Auth: `Authorization: Bearer <key>`. Returns JSON with base64 audio.
//
// Docs: https://docs.60db.ai/api-reference/tts/text-to-speech
const axios = require('axios');
const config = require('../../config/environment');

const MAX_CHARS = 5000; // 60db hard limit per request

const VALID_FORMATS = ['mp3', 'wav', 'ogg', 'flac'];

const FORMAT_CONTENT_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac'
};

/**
 * Synthesizes speech with the 60db simple HTTP TTS API.
 *
 * @param {string} text - Text to synthesize (max 5000 chars)
 * @param {Object} [options] - Synthesis options (see services/tts/index.js).
 *   60db-native ranges: speed 0.5-2.0, stability 0-100, similarity 0-100.
 * @returns {Promise<Object>} Normalized synthesis result
 */
async function synthesize(text, options = {}) {
  const { apiKey, baseUrl, voiceId } = config.sixtydb;

  if (!apiKey) {
    throw new Error('60db API key not configured (set SIXTYDB_API_KEY)');
  }
  if (!text || !text.trim()) {
    throw new Error('text is required');
  }
  if (text.length > MAX_CHARS) {
    throw new Error(`text exceeds the 60db limit of ${MAX_CHARS} characters (got ${text.length})`);
  }

  const outputFormat = (options.outputFormat || config.tts.defaultFormat || 'mp3').toLowerCase();
  if (!VALID_FORMATS.includes(outputFormat)) {
    throw new Error(`Invalid 60db output_format "${outputFormat}". Valid: ${VALID_FORMATS.join(', ')}`);
  }

  // Build request body. Only send optional tuning params when provided so the
  // 60db service applies its own documented defaults otherwise.
  const body = {
    text,
    voice_id: options.voiceId || voiceId,
    output_format: outputFormat
  };
  if (options.enhance !== undefined) body.enhance = options.enhance;
  if (options.speed !== undefined) body.speed = options.speed;
  if (options.stability !== undefined) body.stability = options.stability;
  if (options.similarity !== undefined) body.similarity = options.similarity;

  const response = await axios.post(`${baseUrl}/tts-synthesize`, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const data = response.data;
  if (!data || data.success === false || !data.audio_base64) {
    throw new Error(`60db TTS request failed: ${data?.message || 'no audio returned'}`);
  }

  const format = (data.output_format || outputFormat).toLowerCase();

  return {
    provider: 'sixtydb',
    audio: Buffer.from(data.audio_base64, 'base64'),
    contentType: FORMAT_CONTENT_TYPES[format] || 'application/octet-stream',
    format,
    voiceId: body.voice_id,
    sampleRate: data.sample_rate,
    durationSeconds: data.duration_seconds
  };
}

module.exports = {
  name: 'sixtydb',
  synthesize
};
