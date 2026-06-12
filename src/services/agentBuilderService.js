// src/services/agentBuilderService.js
const axios = require('axios');
const config = require('../config/environment');

/**
 * Creates a complete Elevenlabs agent configuration with all required
 * webhooks, functions, and personalization settings.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.agentName - Name for the agent
 * @param {string} options.serverUrl - URL where this server is hosted
 * @param {string} options.serverApiKey - API key for server authentication
 * @param {Array} options.eventTypes - List of available Calendly events
 * @returns {Object} Elevenlabs agent configuration
 */
async function createAgentConfig(options) {
  const {
    agentName = "Calendly Booking Assistant",
    serverUrl,
    serverApiKey,
    eventTypes = [],
    agentGreeting = "Hi there! I'm your Calendly booking assistant. How can I help you schedule an appointment today?"
  } = options;
  
  // Validate required parameters
  if (!serverUrl) {
    throw new Error('Server URL is required');
  }
  
  if (!serverApiKey) {
    throw new Error('Server API Key is required');
  }
  
  if (eventTypes.length === 0) {
    throw new Error('At least one event type is required');
  }

  // Get hostname from server URL for allowlist
  const hostname = new URL(serverUrl).hostname;
  
  // Generate event type descriptions
  let eventTypeDescription = "IMPORTANT: Use the EXACT URI without abbreviation.";
  if (eventTypes.length >= 1) {
    eventTypeDescription += ` For 30-minute AI Automation Discovery Call: ${eventTypes[0]?.id || eventTypes[0]}`;
  }
  if (eventTypes.length >= 2) {
    eventTypeDescription += ` -- For 15-minute AI Automation Quick Consultation: ${eventTypes[1]?.id || eventTypes[1]}`;
  }
  
  // Create the complete agent configuration object
  return {
    name: agentName,
    conversation_config: {
      asr: {
        quality: "high",
        provider: "elevenlabs",
        user_input_audio_format: "pcm_16000",
        keywords: []
      },
      turn: {
        turn_timeout: 7.0,
        silence_end_call_timeout: 20.0,  
        mode: "turn"
      },
      // The live Conversational AI agent always speaks with ElevenLabs (ConvAI
      // cannot use third-party voices such as 60db). These defaults are now
      // sourced from config so the voice/model can be tuned via env vars and
      // stay consistent with the standalone /api/tts ElevenLabs provider.
      tts: {
        model_id: config.elevenlabs.modelId,
        voice_id: config.elevenlabs.voiceId,
        agent_output_audio_format: "pcm_16000",
        optimize_streaming_latency: 3,
        stability: config.elevenlabs.stability,
        speed: config.elevenlabs.speed,
        similarity_boost: config.elevenlabs.similarityBoost,
        pronunciation_dictionary_locators: []
      },
      conversation: {
        max_duration_seconds: 600, 
        client_events: [
          "audio",
          "interruption",
          "user_transcript",
          "agent_response",
          "agent_response_correction"
        ]
      },
      language_presets: {},
      agent: {
        first_message: agentGreeting,
        language: "en",
        dynamic_variables: {
          dynamic_variable_placeholders: {
            current_date: "Friday, May 10, 2025",
            current_time: "2:30 PM",
            caller_number: "+1234567890"
          }
        },
        prompt: {
          prompt: "Prompt is configured through prompts.js file on the server.", 
          llm: "gpt-4.1-mini",  
          temperature: 0.35,    
          max_tokens: -1,
          tools: [
            {
              id: "ynkWMyhMnGlLHAv7o5XI", 
              name: "sendBookingSMS",
              description: "Use this function to send an SMS confirmation to the caller after they have selected a specific appointment time. This provides them with a link to complete their booking through Calendly. Always call this function at the end of the booking process.",
              type: "webhook",
              api_schema: {
                url: `${serverUrl}/api/elevenlabs/function-handler`,
                method: "POST",
                path_params_schema: {},
                query_params_schema: null,
                request_body_schema: {
                  type: "object",
                  required: [
                    "eventTime",
                    "function_name",
                    "phoneNumber",
                    "eventDuration",
                    "schedulingUrl",
                    "name"
                  ],
                  description: "Parameters for sending booking confirmation SMS",
                  properties: {
                    eventTime: {
                      type: "string",
                      description: "A human-readable description of the event time, formatted like 'Wednesday, May 15 at 2:30 PM'",
                      dynamic_variable: "",
                      constant_value: ""
                    },
                    function_name: {
                      type: "string",
                      description: "",
                      dynamic_variable: "",
                      constant_value: "sendBookingSMS"
                    },
                    phoneNumber: {
                      type: "string",
                      description: "",
                      dynamic_variable: "system__caller_id", 
                      constant_value: ""
                    },
                    eventDuration: {
                      type: "string",
                      description: "The duration of the appointment in minutes (use '15' for Quick Consultation or '30' for Discovery Call)",
                      dynamic_variable: "",
                      constant_value: ""
                    },
                    schedulingUrl: {
                      type: "string",
                      description: "The Calendly scheduling URL that will be sent to the caller (use the URL from the time slot's scheduling_url property)",
                      dynamic_variable: "",
                      constant_value: ""
                    },
                    name: {
                      type: "string",
                      description: "The caller's full name that you collected during the booking process",
                      dynamic_variable: "",
                      constant_value: ""
                    }
                  }
                },
                request_headers: {
                  "X-API-Key": serverApiKey,
                  "Content-Type": "application/json"
                }
              },
              dynamic_variables: {
                dynamic_variable_placeholders: {}
              }
            },
            {
              id: "OWO956TMCS1s6dN1jgp9", 
              name: "checkTimes",
              description: "Use this function after the caller has selected a specific day from the availability summary. It provides detailed time slots for a single day, filtered by morning or afternoon preference. Helps the caller select a specific time for their appointment.",
              type: "webhook",
              api_schema: {
                url: `${serverUrl}/api/elevenlabs/function-handler`,
                method: "POST",
                path_params_schema: {},
                query_params_schema: null,
                request_body_schema: {
                  type: "object",
                  required: [
                    "function_name",
                    "parameters"
                  ],
                  description: "Parameters for checking specific time slots on a day",
                  properties: {
                    function_name: {
                      type: "string",
                      description: "",
                      dynamic_variable: "",
                      constant_value: "checkTimes"
                    },
                    parameters: {
                      type: "object",
                      required: [
                        "eventTypeUrl",
                        "date",
                        "period"
                      ],
                      description: "body object parameters",
                      properties: {
                        eventTypeUrl: {
                          type: "string",
                          description: eventTypeDescription,
                          dynamic_variable: "",
                          constant_value: ""
                        },
                        date: {
                          type: "string",
                          description: "The specific date to check, in YYYY-MM-DD format (e.g., '2025-05-15')",
                          dynamic_variable: "",
                          constant_value: ""
                        },
                        period: {
                          type: "string",
                          description: "Time of day preference: 'morning' (before noon) or 'afternoon' (after noon)",
                          dynamic_variable: "",
                          constant_value: ""
                        }
                      }
                    }
                  }
                },
                request_headers: {
                  "X-API-Key": serverApiKey,
                  "Content-Type": "application/json"
                }
              },
              dynamic_variables: {
                dynamic_variable_placeholders: {}
              }
            },
            {
              id: "yzW6vNfJybNSU8Q8YJeo", 
              name: "checkAvailability",
              description: "Use this function to find which days of the week have available appointment slots. This should be called first to help the caller identify available days before checking specific times. Shows morning and afternoon availability for each day of the week.",
              type: "webhook",
              api_schema: {
                url: `${serverUrl}/api/elevenlabs/function-handler`,
                method: "POST",
                path_params_schema: {},
                query_params_schema: null,
                request_body_schema: {
                  type: "object",
                  required: [
                    "function_name",
                    "parameters"
                  ],
                  description: "Parameters for checking weekly availability",
                  properties: {
                    function_name: {
                      type: "string",
                      description: "",
                      dynamic_variable: "",
                      constant_value: "checkAvailability"
                    },
                    parameters: {
                      type: "object",
                      required: [
                        "eventTypeUrl"
                      ],
                      description: "body object parameters for function",
                      properties: {
                        eventTypeUrl: {
                          type: "string",
                          description: eventTypeDescription,
                          dynamic_variable: "",
                          constant_value: ""
                        },
                        weekOffset: {
                          type: "integer",
                          description: "Week offset from current week: 0 = current week, 1 = next week, 2 = two weeks from now",
                          dynamic_variable: "",
                          constant_value: ""
                        }
                      }
                    }
                  }
                },
                request_headers: {
                  "X-API-Key": serverApiKey,
                  "Content-Type": "application/json"
                }
              },
              dynamic_variables: {
                dynamic_variable_placeholders: {}
              }
            },
            {
              id: "4llGAKqlunOuAWS1pfBv", 
              name: "end_call", 
              description: "",
              type: "system",
              params: {
                system_tool_type: "end_call"
              }
            }
          ],
          tool_ids: [
            "ynkWMyhMnGlLHAv7o5XI", 
            "OWO956TMCS1s6dN1jgp9", 
            "yzW6vNfJybNSU8Q8YJeo",
            "4llGAKqlunOuAWS1pfBv"  
          ],
          mcp_server_ids: [],
          knowledge_base: [],
          custom_llm: null,
          ignore_default_personality: false,
          rag: {
            enabled: false,
            embedding_model: "e5_mistral_7b_instruct",
            max_vector_distance: 0.6,
            max_documents_length: 50000
          }
        }
      }
    },
    platform_settings: {
      auth: {
        enable_auth: false,
        allowlist: [
          {
            hostname: hostname  
          }
        ],
        shareable_token: null
      },
      evaluation: {
        criteria: []
      },
      widget: {
        variant: "full",
        expandable: "never",
        avatar: {
          type: "orb",
          color_1: "#6DB035", 
          color_2: "#F5CABB"
        },
        feedback_mode: "during",
        bg_color: "#ffffff",
        text_color: "#000000",
        btn_color: "#000000",
        btn_text_color: "#ffffff",
        border_color: "#e1e1e1",
        focus_color: "#000000",
        border_radius: null,
        btn_radius: null,
        action_text: null,
        start_call_text: null,
        end_call_text: null,
        expand_text: null,
        listening_text: null,
        speaking_text: null,
        shareable_page_text: null,
        shareable_page_show_terms: true,
        terms_text: "#### Terms and conditions\n\nBy clicking \"Agree,\" and each time I interact with this AI agent, I consent to the recording, storage, and sharing of my communications with third-party service providers, and as described in the Privacy Policy.\nIf you do not wish to have your conversations recorded, please refrain from using this service.",
        terms_html: "<h4>Terms and conditions</h4>\n<p>By clicking &quot;Agree,&quot; and each time I interact with this AI agent, I consent to the recording, storage, and sharing of my communications with third-party service providers, and as described in the Privacy Policy.\nIf you do not wish to have your conversations recorded, please refrain from using this service.</p>\n",
        terms_key: null,
        show_avatar_when_collapsed: true,
        disable_banner: false,
        mic_muting_enabled: false,
        language_selector: false,
        custom_avatar_path: null
      },
      data_collection: {},
      overrides: {
        conversation_config_override: {
          agent: {
            prompt: {
              prompt: true
            },
            first_message: true,
            language: true
          },
          tts: {
            voice_id: true
          }
        },
        custom_llm_extra_body: false,
        enable_conversation_initiation_client_data_from_webhook: true
      },
      call_limits: {
        agent_concurrency_limit: -1,
        daily_limit: 100000
      },
      ban: null,
      privacy: {
        record_voice: true,
        retention_days: 730,          
        delete_transcript_and_pii: true, 
        delete_audio: true,         
        apply_to_existing_conversations: false
      },
      workspace_overrides: {
        conversation_initiation_client_data_webhook: {
          url: `${serverUrl}/api/elevenlabs/twilio-personalization`,
          request_headers: {
            "X-API-Key": serverApiKey
          }
        },
        webhooks: {
          post_call_webhook_id: null
        }
      },
      safety: {
        is_blocked_ivc: false,
        is_blocked_non_ivc: false,
        ignore_safety_evaluation: false
      }
    }
  };
}

/**
 * Uploads agent configuration to Elevenlabs API.
 * 
 * @param {Object} config - Agent configuration
 * @param {String} elevenlabsApiKey - Elevenlabs API key
 * @returns {Object} Elevenlabs response with agent ID
 */
async function uploadAgentToElevenlabs(config, elevenlabsApiKey) {
  try {
    console.log('Sending request to Elevenlabs API');
    
    const response = await axios.post(
      'https://api.elevenlabs.io/v1/convai/agents/create',
      config,
      {
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error uploading agent to Elevenlabs:', error.response?.status);
    console.error('Error details:', error.response?.data?.detail || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to upload agent to Elevenlabs');
  }
}

module.exports = {
  createAgentConfig,
  uploadAgentToElevenlabs
};