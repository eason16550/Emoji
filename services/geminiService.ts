
import { GoogleGenAI } from "@google/genai";
import { Emoji, GenerationStyle, LineMode, EmotionConfig } from "../types";

// Expanded list of common LINE sticker scenarios
export const PRESET_EMOTIONS: EmotionConfig[] = [
  { id: 'happy', name: '開心', suffix: 'laughing, joy, happy face, smile', defaultText: 'OK' },
  { id: 'sad', name: '難過', suffix: 'crying, sad face, tears, upset', defaultText: 'No...' },
  { id: 'angry', name: '生氣', suffix: 'angry, mad, rage, fury, red face', defaultText: 'Bububu' },
  { id: 'love', name: '喜愛', suffix: 'heart eyes, love, blowing kiss, romantic', defaultText: 'Love' },
  { id: 'thanks', name: '感謝', suffix: 'bowing, thank you gesture, gratitude, sparkling', defaultText: 'Thanks' },
  { id: 'question', name: '疑問', suffix: 'confused, question mark, thinking, head tilt', defaultText: '???' },
  { id: 'shock', name: '驚訝', suffix: 'shocked face, wide eyes, open mouth, gasp', defaultText: '!!' },
  { id: 'sleep', name: '睡覺', suffix: 'sleeping, zzz, drooling, closed eyes, peaceful', defaultText: 'Zzz' },
];

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateEmojiSet = async (
  basePrompt: string,
  style: GenerationStyle,
  referenceImage: string | null, // Base64 Data URL
  includeText: boolean,
  customText: string,
  mode: LineMode,
  targetEmotions: EmotionConfig[], // Dynamic list of emotions to generate
  onEmojiGenerated: (emoji: Emoji) => void
): Promise<void> => {
  
  // Robust API Key retrieval for Vite/Vercel environments
  let apiKey = '';
  try {
    // 1. Try Vite standard (import.meta.env)
    // @ts-ignore - Ignore TS error if types are not set for import.meta
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || '';
    }
    
    // 2. Fallback to process.env (Node/Webpack/CRA)
    if (!apiKey && typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Error reading environment variables:", e);
  }

  if (!apiKey) {
    console.error("API Key is missing.");
    const errorMsg = "API Key 設定錯誤。\n\n請至 Vercel 後台 > Settings > Environment Variables\n變數名稱：VITE_API_KEY\n變數值：您的 Gemini API Key\n\n設定完後請記得 Redeploy！";
    throw new Error(errorMsg);
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  let successCount = 0;
  const errors: string[] = [];

  // Execute requests sequentially to avoid Rate Limiting (429)
  for (const emotion of targetEmotions) {
    try {
      const parts: any[] = [];
      let fullPrompt = "";
      
      let textToUse = undefined;
      if (includeText) {
        // If user provided a specific custom text for ALL stickers, use it.
        // Otherwise use the default text associated with the emotion.
        textToUse = customText.trim() ? customText : emotion.defaultText;
      }

      const modeInstruction = mode === 'EMOJI' 
        ? `
          - TASK: Create a LINE Emoji (表情貼).
          - CRITICAL: These are displayed very small (inline with text). 
          - Design must be SIMPLE, BOLD, and ICON-LIKE.
          - Focus on the facial expression.
          - Aspect Ratio: Strictly Square (1:1).
        ` 
        : `
          - TASK: Create a LINE Sticker (貼圖).
          - These are displayed larger in chat.
          - Can be more detailed and expressive.
          - Aspect Ratio: Strictly Square (1:1).
        `;

      if (referenceImage) {
        const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            const mimeType = matches[1];
            const data = matches[2];
            
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: data
                }
            });
        }

        fullPrompt = `
          ${modeInstruction}
          Based on the provided reference image, create a character in the style of: ${style}.
          
          Target Emotion: ${emotion.name} (${emotion.suffix}).
          ${basePrompt ? `Additional Context: ${basePrompt}` : ''}

          Design Requirements:
          - Maintain the key recognizable features of the subject.
          - **IMPORTANT: BACKGROUND MUST BE SOLID PURE WHITE (#FFFFFF).**
          - High contrast.
          - White border around the character (sticker style).
          - **NEGATIVE PROMPT: DO NOT INCLUDE ANY TEXT, LETTERS, OR CHARACTERS IN THE IMAGE. PURE ILLUSTRATION ONLY.**
        `;
      } else {
        fullPrompt = `
          ${modeInstruction}
          Create a character/object based on description: ${basePrompt}.
          Emotion: ${emotion.name} (${emotion.suffix}).
          Style: ${style}.
          
          Design Requirements: 
          - **IMPORTANT: BACKGROUND MUST BE SOLID PURE WHITE (#FFFFFF).**
          - High contrast.
          - White border around the character.
          - **NEGATIVE PROMPT: DO NOT INCLUDE ANY TEXT, LETTERS, OR CHARACTERS IN THE IMAGE. PURE ILLUSTRATION ONLY.**
        `;
      }

      parts.push({ text: fullPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts,
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        },
      });

      if (!response.candidates?.[0]?.content?.parts) {
          throw new Error("API returned no content (Possible Safety Filter)");
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          
          const newEmoji: Emoji = {
            id: Date.now().toString() + Math.random().toString(),
            dataUrl,
            prompt: fullPrompt,
            emotion: emotion.name,
            text: textToUse,
            style: style
          };
          
          onEmojiGenerated(newEmoji);
          successCount++;
        }
      }

      // Add a small delay between requests to be nice to the rate limiter
      await wait(1500); // Wait 1.5 seconds

    } catch (error: any) {
      console.error(`Error generating ${emotion.name} emoji:`, error);
      let msg = error.message || JSON.stringify(error);
      if (msg.includes('403')) msg = "API Key 權限不足或無效 (403)";
      if (msg.includes('429')) msg = "請求過於頻繁 (429)，請稍候再試";
      if (msg.includes('SAFETY')) msg = "內容被 AI 安全機制攔截";
      if (msg.includes('503')) msg = "伺服器忙碌中，請稍後再試";
      errors.push(`${emotion.name}: ${msg}`);
      
      // If we hit a rate limit, wait a bit longer before the next one
      if (msg.includes('429')) {
          await wait(5000);
      }
    }
  }

  if (successCount === 0 && errors.length > 0) {
      // If NOTHING was generated, we must alert the user
      throw new Error(`生成失敗。原因:\n${errors.join('\n')}`);
  }
};