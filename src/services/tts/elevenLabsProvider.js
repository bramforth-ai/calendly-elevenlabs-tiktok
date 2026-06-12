// src/services/tts/elevenLabsProvider.js
//
// ElevenLabs adapter for the TTS abstraction. Uses the standalone
// Text-to-Speech REST endpoint (NOT Conversational AI):
//   POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
// Auth: `xi-api-key` header. Returns raw audio bytes.
const axios = require('axios');
const config = require('../../config/environment');

// Maps the leading token of an ElevenLabs output_format to a MIME type.
// ElevenLabs formats look like 'mp3_44100_128', 'pcm_16000', 'ulaw_8000'.
const FORMAT_CONTENT_TYPES = {
  mp3: 'audio/mpeg',
  pcm: 'audio/l16',
  ulaw: 'audio/basic',
  opus: 'audio/opus'
};

/**
 * Synthesizes speech with the ElevenLabs TTS REST API.
 *
 * @param {string} text - Text to synthesize
 * @param {Object} [options] - Synthesis options (see services/tts/index.js)
 * @returns {Promise<Object>} Normalized synthesis result
 */
async function synthesize(text, options = {}) {
  const { apiKey, baseUrl, voiceId, modelId, outputFormat: defaultFormat } = config.elevenlabs;

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured (set ELEVENLABS_API_KEY)');
  }
  if (!text || !text.trim()) {
    throw new Error('text is required');
  }

  const voice = options.voiceId || voiceId;
  const model = options.modelId || modelId;
  const outputFormat = options.outputFormat || defaultFormat;

  const response = await axios.post(
    `${baseUrl}/v1/text-to-speech/${voice}`,
    {
      text,
      model_id: model,
      voice_settings: {
        stability: options.stability !== undefined ? options.stability : config.elevenlabs.stability,
        similarity_boost: options.similarity !== undefined ? options.similarity : config.elevenlabs.similarityBoost,
        speed: options.speed !== undefined ? options.speed : config.elevenlabs.speed
      }
    },
    {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/*'
      },
      params: { output_format: outputFormat },
      responseType: 'arraybuffer'
    }
  );

  const formatToken = String(outputFormat).split('_')[0];

  return {
    provider: 'elevenlabs',
    audio: Buffer.from(response.data),
    contentType: response.headers['content-type'] || FORMAT_CONTENT_TYPES[formatToken] || 'audio/mpeg',
    format: formatToken,
    voiceId: voice
  };
}

module.exports = {
  name: 'elevenlabs',
  synthesize
};
