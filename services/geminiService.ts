
import { GoogleGenAI } from "@google/genai";
import { Emoji, GenerationStyle, LineMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We will generate 4 variations based on common emotions
const EMOTIONS = [
  { name: 'Happy', suffix: 'laughing, joy, happy face, smile', defaultText: 'OK' },
  { name: 'Sad', suffix: 'crying, sad face, tears, upset', defaultText: 'No...' },
  { name: 'Angry', suffix: 'angry, mad, rage, fury, red face', defaultText: 'Bububu' },
  { name: 'Love', suffix: 'heart eyes, love, blowing kiss, romantic', defaultText: 'Love' },
];

export const generateEmojiSet = async (
  basePrompt: string,
  style: GenerationStyle,
  referenceImage: string | null, // Base64 Data URL
  includeText: boolean,
  customText: string,
  mode: LineMode,
  onEmojiGenerated: (emoji: Emoji) => void
): Promise<void> => {
  
  const promises = EMOTIONS.map(async (emotion) => {
    try {
      const parts: any[] = [];
      let fullPrompt = "";
      
      // LOGIC CHANGE: We no longer ask AI to generate text inside the image.
      // We process the text intention here to attach it later.
      let textToUse = undefined;
      if (includeText) {
        textToUse = customText.trim() ? customText : emotion.defaultText;
      }

      // Mode specific instructions
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

      // Handle Image Input
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

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          
          const newEmoji: Emoji = {
            id: Date.now().toString() + Math.random().toString(),
            dataUrl,
            prompt: fullPrompt,
            emotion: emotion.name,
            text: textToUse, // Attach the text intention to the object
            style: style // Save style for post-processing
          };
          
          onEmojiGenerated(newEmoji);
        }
      }
    } catch (error) {
      console.error(`Error generating ${emotion.name} emoji:`, error);
    }
  });

  await Promise.all(promises);
};