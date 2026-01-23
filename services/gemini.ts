
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Message } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Utils ---
export function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Content Generation ---
export const generateResponse = async (
  prompt: string,
  history: Message[],
  systemInstruction: string,
  imageData?: string
) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [
          ...(imageData ? [{ inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] } }] : []),
          { text: prompt || "Analyze this image" }
        ]
      }
    ] as any,
    config: {
      systemInstruction: systemInstruction + " You have access to real-time information via Google Search. Keep responses concise and suitable for a mobile chat app. If using search results, summarize them naturally.",
      tools: [{ googleSearch: {} }] as any,
      temperature: 0.7,
    }
  });

  return response.text || '';
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("The AI did not provide a response. This could be due to a network error or API limit.");
  }

  if (candidate.finishReason === 'SAFETY') {
    throw new Error("The image generation was blocked by safety filters. Please try a different description.");
  }

  const parts = candidate.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  // If no image but text is returned, it's likely an error explanation
  const textFeedback = parts.find(p => p.text)?.text;
  if (textFeedback) {
    throw new Error(textFeedback);
  }

  throw new Error("No image was generated. Please refine your prompt and try again.");
};

// --- Live API ---
export const connectToLive = (
  systemInstruction: string,
  callbacks: {
    onopen: () => void;
    onmessage: (msg: LiveServerMessage) => void;
    onerror: (e: any) => void;
    onclose: (e: any) => void;
  }
) => {
  const ai = getAI();
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction,
    },
    callbacks
  });
};
