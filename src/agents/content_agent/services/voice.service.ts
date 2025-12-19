/**
 * Voice Agent Service - Gemini Live API Integration
 * 
 * Architecture: Gemini handles conversation → Agent generates content
 * - Gemini Live API handles real-time voice conversation
 * - When user request is complete, calls contentStrategistChat for generation
 * - Hybrid mode: Text uses existing agent, Voice uses this service
 * 
 * @see https://ai.google.dev/gemini-api/docs/live
 */

import { GoogleGenAI, Modality, Type, type FunctionDeclaration } from '@google/genai';
import { contentStrategistChat } from './chat.service';

// Gemini Live API model for native audio
const GEMINI_LIVE_MODEL = 'gemini-3-flash-preview';

/**
 * Voice session event callbacks
 */
export interface VoiceSessionCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onAudioResponse: (audioBase64: string) => void;
  onUserTranscript: (text: string) => void;
  onAgentTranscript: (text: string) => void;
  onContentGenerated: (content: any) => void;
  onError: (error: string) => void;
  onListening: (isListening: boolean) => void;
}

/**
 * Voice session configuration
 */
export interface VoiceSessionConfig {
  userId: string;
  geminiApiKey: string;
}

/**
 * Generate content tool - called by Gemini when user request is complete
 */
const generateContentTool: FunctionDeclaration = {
  name: 'generate_content',
  description: `Generate social media content for the user. Call this ONLY when you have gathered ALL required information through conversation:
- Product/topic and its key features
- Target platform(s): instagram, tiktok, youtube, facebook, linkedin, twitter
- Style/tone preferences

IMPORTANT: Do NOT call this during Q&A. First have a natural conversation to understand what the user needs, then call this when ready to generate.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      platforms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Target platforms: instagram, tiktok, youtube, facebook, linkedin, twitter',
      },
      productDescription: {
        type: Type.STRING,
        description: 'Complete product/topic description with type, features, and style details',
      },
      tone: {
        type: Type.STRING,
        description: 'Content tone: energetic, professional, casual, luxury, educational, entertaining',
      },
      additionalInstructions: {
        type: Type.STRING,
        description: 'Any specific creative direction or requirements from the user',
      },
    },
    required: ['platforms', 'productDescription', 'tone'],
  },
};

/**
 * Voice-optimized system instruction for Gemini Live
 */
const VOICE_SYSTEM_INSTRUCTION = `You are a friendly and expert social media content consultant having a voice conversation.

## Your Personality
- Warm, helpful, and quick
- Sound like a knowledgeable friend, not a robot
- Keep responses SHORT - 1-2 sentences max
- Be conversational and natural

## Your Job
1. Understand what content the user wants to create
2. Gather key details through natural conversation:
   - What product/topic?
   - Any special features to highlight?
   - Which platforms? (if not stated, suggest based on their content)
   - What vibe/style?
3. When you have enough info, say "Perfect, creating your content now!" and call generate_content

## Conversation Tips
- Ask ONE question at a time
- Make smart assumptions based on your expertise
- If user is vague, suggest options: "Want me to go with an energetic street vibe, or more luxury premium?"
- Don't over-ask - use your content expertise to fill gaps

## Voice Rules
- NO markdown, NO bullet points, NO special characters
- Don't say "asterisk" or describe formatting
- Speak naturally like in a phone call
- Keep sentences short and punchy

## Example Flow
User: "I need content for my shoes"
You: "Cool! What type of shoes - running, luxury, or casual street style?"

User: "Performance running with neon accents"
You: "Nice! Which platforms - Instagram, TikTok, YouTube?"

User: "Instagram and TikTok"
You: "Perfect, creating your content now!"
[Call generate_content tool]

You: "Done! I created an Instagram Reel and TikTok video featuring your running shoes with that urban energy vibe."`;

/**
 * Content Voice Session - manages real-time voice interaction with Gemini
 */
export class ContentVoiceSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private callbacks: VoiceSessionCallbacks;
  private config: VoiceSessionConfig;
  private isConnected = false;

  constructor(config: VoiceSessionConfig, callbacks: VoiceSessionCallbacks) {
    this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey, httpOptions: { apiVersion: 'v1alpha' } });
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(): Promise<void> {
    try {
      const liveConfig = {
        responseModalities: [Modality.AUDIO],
        systemInstruction: VOICE_SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [generateContentTool] }],
        enableAffectiveDialog: true,
      };

      this.session = await this.ai.live.connect({
        model: GEMINI_LIVE_MODEL,
        config: liveConfig,
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this.callbacks.onConnected();
          },
          onmessage: (message: any) => this.handleMessage(message),
          onerror: (e: ErrorEvent) => {
            this.callbacks.onError(e.message || 'Connection error');
          },
          onclose: () => {
            this.isConnected = false;
            this.callbacks.onDisconnected();
          },
        },
      });
    } catch (error) {
      this.callbacks.onError((error as Error).message || 'Failed to connect');
      throw error;
    }
  }

  /**
   * Handle incoming messages from Gemini Live API
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      // Handle tool calls (generate_content)
      if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
          if (fc.name === 'generate_content') {
            await this.handleGenerateContent(fc);
          }
        }
      }

      // Handle audio output from Gemini
      if (message.serverContent?.modelTurn?.parts) {
        for (const part of message.serverContent.modelTurn.parts) {
          // Audio data
          if (part.inlineData?.data) {
            this.callbacks.onAudioResponse(part.inlineData.data);
          }
          // Text transcript (agent's words)
          if (part.text) {
            this.callbacks.onAgentTranscript(part.text);
          }
        }
      }

      // Handle user speech transcript
      if (message.serverContent?.inputTranscript) {
        this.callbacks.onUserTranscript(message.serverContent.inputTranscript);
      }

      // Handle interruption (user barged in)
      if (message.serverContent?.interrupted) {
        this.callbacks.onListening(true);
      }

      // Handle turn complete
      if (message.serverContent?.turnComplete) {
        this.callbacks.onListening(true);
      }
    } catch (error) {
      this.callbacks.onError((error as Error).message || 'Error processing message');
    }
  }

  /**
   * Handle generate_content tool call - delegates to contentStrategistChat
   */
  private async handleGenerateContent(functionCall: any): Promise<void> {
    const { platforms, productDescription, tone, additionalInstructions } = functionCall.args;

    try {
      // Build comprehensive message for the content agent
      const agentMessage = `Generate content for the following platforms: ${platforms.join(', ')}

Product/Topic: ${productDescription}
Tone: ${tone}
${additionalInstructions ? `Additional Instructions: ${additionalInstructions}` : ''}

Please generate the content now. The user has already approved this request through our voice conversation.`;

      // Call the existing content strategist agent
      const result = await contentStrategistChat({
        message: agentMessage,
        userId: this.config.userId,
      });

      // Send generated content to UI
      if (result.contentGenerated && result.generatedContent) {
        this.callbacks.onContentGenerated(result.generatedContent);
      }

      // Count generated content items
      const generatedContent = result.generatedContent as { contents?: any[] } | undefined;
      const contentCount = generatedContent?.contents?.length || 0;

      // Send success response back to Gemini so it can speak confirmation
      this.session.sendToolResponse({
        functionResponses: [{
          id: functionCall.id,
          name: functionCall.name,
          response: {
            success: true,
            platforms: platforms,
            contentCount,
            message: `Successfully created ${contentCount} content pieces for ${platforms.join(' and ')}.`,
          },
        }],
      });
    } catch (error) {
      // Send error response to Gemini
      this.session.sendToolResponse({
        functionResponses: [{
          id: functionCall.id,
          name: functionCall.name,
          response: {
            success: false,
            error: (error as Error).message,
          },
        }],
      });
      this.callbacks.onError((error as Error).message || 'Failed to generate content');
    }
  }

  /**
   * Send audio input to Gemini (from user's microphone)
   * @param audioBase64 - Base64 encoded PCM audio at 16kHz mono
   */
  sendAudio(audioBase64: string): void {
    if (!this.session || !this.isConnected) return;

    this.session.sendRealtimeInput({
      audio: {
        data: audioBase64,
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  }

  /**
   * Send text input (for hybrid voice+text mode)
   */
  sendText(text: string): void {
    if (!this.session || !this.isConnected) return;

    this.session.sendClientContent({ turns: text });
  }

  /**
   * Check if session is connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Close the voice session
   */
  close(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.isConnected = false;
  }
}

/**
 * Create a new voice session instance
 */
export function createVoiceSession(
  config: VoiceSessionConfig,
  callbacks: VoiceSessionCallbacks
): ContentVoiceSession {
  return new ContentVoiceSession(config, callbacks);
}
