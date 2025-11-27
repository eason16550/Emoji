
export interface Emoji {
  id: string;
  dataUrl: string; // Base64 image
  prompt: string;
  emotion: string;
  text?: string; // The caption text to be overlaid
  style: GenerationStyle; // The art style used
}

export enum GenerationStyle {
  Anime = 'Anime Style, vibrant colors, thick outlines',
  Pixel = 'Pixel Art, 8-bit, retro game style',
  ThreeD = '3D Render, claymation style, cute, soft lighting',
  Flat = 'Flat Vector, minimalism, simple shapes, corporate memphis',
  Sketch = 'Hand drawn sketch, pencil texture, doodle'
}

export type LineMode = 'STICKER' | 'EMOJI';

export type TextPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type TextSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ChatMessage {
  id: string;
  type: 'text' | 'image';
  content: string;
  textOverlay?: string; // Store the overlay text for display in chat
  style?: GenerationStyle; // Store style for preview rendering
  isUser: boolean;
  timestamp: string;
}

// Minimal type definition for global LIFF
declare global {
  interface Window {
    liff: any;
  }
}
