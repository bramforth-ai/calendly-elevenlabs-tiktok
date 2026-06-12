// src/routes/tts.js
const express = require('express');
const router = express.Router();
const tts = require('../services/tts');
const config = require('../config/environment');
const { authenticateApiKey } = require('../middleware/auth');

/**
 * Lists available TTS providers and the configured default.
 *
 * @route   GET /api/tts/providers
 * @desc    Discover which TTS providers are wired in
 * @access  Protected
 */
router.get('/providers', authenticateApiKey, (req, res) => {
  res.json({
    success: true,
    default: config.tts.provider,
    providers: tts.providers
  });
});

/**
 * Synthesizes speech from text using the selected (or default) provider and
 * returns the raw audio bytes. The provider is interchangeable: ElevenLabs or
 * 60db, chosen via the `provider` field or the TTS_PROVIDER env var.
 *
 * @route   POST /api/tts
 * @desc    Text-to-speech synthesis
 * @access  Protected
 */
router.post('/', authenticateApiKey, async (req, res) => {
  try {
    const {
      text,
      provider,
      voiceId,
      voice_id,
      format,
      output_format,
      speed,
      stability,
      similarity,
      enhance
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required parameter: text'
      });
    }

    const result = await tts.synthesize(text, {
      provider,
      voiceId: voiceId || voice_id,
      outputFormat: format || output_format,
      speed,
      stability,
      similarity,
      enhance
    });

    res.set('Content-Type', result.contentType);
    res.set('X-TTS-Provider', result.provider);
    res.set('X-TTS-Voice-Id', result.voiceId || '');
    if (result.durationSeconds !== undefined) {
      res.set('X-TTS-Duration-Seconds', String(result.durationSeconds));
    }
    res.send(result.audio);
  } catch (error) {
    console.error('Error in TTS synthesis:', error.message);

    // Surface an upstream HTTP status when the provider returned one
    const upstreamStatus = error.response?.status;
    res.status(upstreamStatus && upstreamStatus >= 400 ? 502 : 500).json({
      success: false,
      error: 'Failed to synthesize speech',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message
    });
  }
});

module.exports = router;
