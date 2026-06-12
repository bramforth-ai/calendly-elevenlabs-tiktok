// src/config/environment.js
require('dotenv').config();

// Required environment variables
const requiredEnvVars = [
    'API_KEY',
    'ADMIN_PASSWORD'
];

// Optional environment variable groups with their conditions
const optionalGroups = {
    calendly: {
        condition: true, // Core functionality
        vars: ['CALENDLY_API_TOKEN']
    },
    elevenlabs: {
        condition: true, // Voice agent functionality
        vars: ['ELEVENLABS_API_KEY']
    },
    sixtydb: {
        // Only required when 60db is selected as the active TTS provider
        condition: process.env.TTS_PROVIDER === 'sixtydb',
        vars: ['SIXTYDB_API_KEY']
    },
    github: {
        condition: true, // Prompt editing
        vars: ['GITHUB_TOKEN', 'GITHUB_REPO_OWNER', 'GITHUB_REPO_NAME']
    },
    sms: {
        condition: process.env.ENABLE_SMS === 'true',
        vars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']
    }
};

// Check required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.warn('Please set these variables in your .env file');
}

// Check optional groups based on their conditions
Object.entries(optionalGroups).forEach(([groupName, group]) => {
    if (group.condition) {
        const missingGroupVars = group.vars.filter(envVar => !process.env[envVar]);
        if (missingGroupVars.length > 0) {
            console.warn(`⚠️  ${groupName.toUpperCase()} functionality may not work correctly. Missing variables: ${missingGroupVars.join(', ')}`);
        }
    }
});

// Export configuration
module.exports = {
    // Server config
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiKey: process.env.API_KEY,
    defaultTimeZone: process.env.DEFAULT_TIMEZONE || 'UTC',
    adminPassword: process.env.ADMIN_PASSWORD,

    // Calendly config
    calendly: {
        apiToken: process.env.CALENDLY_API_TOKEN,
        baseUrl: 'https://api.calendly.com',
        userUuid: process.env.CALENDLY_USER_UUID
    },

    // TTS provider selection (shared by the src/services/tts abstraction)
    // Note: this only affects server-side speech synthesis via POST /api/tts.
    // The live ElevenLabs Conversational AI agent always speaks with ElevenLabs.
    tts: {
        provider: (process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase(),
        // Default container format for providers that accept one (60db: mp3|wav|ogg|flac)
        defaultFormat: (process.env.TTS_OUTPUT_FORMAT || 'mp3').toLowerCase()
    },

    // Elevenlabs config
    elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY,
        baseUrl: process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io',
        // Voice/model used both by the ConvAI agent builder and the /api/tts module.
        // Ranges here are ElevenLabs-native (stability/similarity 0-1).
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'cgSgspJ2msm6clMCkdW9',
        modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2',
        outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128',
        stability: process.env.ELEVENLABS_STABILITY !== undefined
            ? parseFloat(process.env.ELEVENLABS_STABILITY) : 0.5,
        speed: process.env.ELEVENLABS_SPEED !== undefined
            ? parseFloat(process.env.ELEVENLABS_SPEED) : 1.0,
        similarityBoost: process.env.ELEVENLABS_SIMILARITY_BOOST !== undefined
            ? parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST) : 0.8
    },

    // 60db (sixtydb) TTS config — used by the src/services/tts abstraction.
    // Ranges here are 60db-native (speed 0.5-2.0, stability/similarity 0-100).
    sixtydb: {
        apiKey: process.env.SIXTYDB_API_KEY,
        baseUrl: process.env.SIXTYDB_BASE_URL || 'https://api.60db.ai',
        voiceId: process.env.SIXTYDB_VOICE_ID || 'fbb75ed2-975a-40c7-9e06-38e30524a9a1'
    },

    // GitHub config
    github: {
        token: process.env.GITHUB_TOKEN,
        repoOwner: process.env.GITHUB_REPO_OWNER,
        repoName: process.env.GITHUB_REPO_NAME,
        branch: process.env.GITHUB_BRANCH || 'master'
    },

    // Twilio SMS config
    sms: {
        enabled: process.env.ENABLE_SMS === 'true',
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
    }
};