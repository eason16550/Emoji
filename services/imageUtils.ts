
import { GenerationStyle, TextPosition, TextSize } from "../types";

export interface LineImageSpec {
  width: number;
  height: number;
  name: string;
  suffix: string;
}

// Specs for "Stickers" (貼圖)
export const STICKER_SPECS = {
  MAIN: { width: 240, height: 240, name: '主要圖片', suffix: 'main' },
  STICKER: { width: 370, height: 320, name: '貼圖圖片', suffix: 'sticker' },
  TAB: { width: 96, height: 74, name: '聊天室標籤', suffix: 'tab' },
};

// Specs for "Emojis" (表情貼)
export const EMOJI_SPECS = {
  CONTENT: { width: 180, height: 180, name: '表情貼圖片', suffix: 'emoji' },
  TAB: { width: 96, height: 74, name: '聊天室標籤', suffix: 'tab' },
};

/**
 * Loads an image from a data URL
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Processes the image: resizes, removes background, AND draws text overlay if provided.
 */
export const processAndDownload = async (
  dataUrl: string, 
  spec: LineImageSpec, 
  fileNameBase: string,
  text?: string,
  style?: GenerationStyle,
  textPosition: TextPosition = 'top-right',
  textSize: TextSize = 'md'
) => {
  try {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not get canvas context');

    // 1. Calculate scaling to fit within dimensions (contain)
    const scale = Math.min(spec.width / img.width, spec.height / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const offsetX = (spec.width - drawWidth) / 2;
    const offsetY = (spec.height - drawHeight) / 2;

    // 2. Draw image centered
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // 3. Remove White Background (Simple Chroma Key)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = 240; // 0-255

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // If pixel is very light, make it transparent
      if (r > threshold && g > threshold && b > threshold) {
        data[i + 3] = 0; 
      }
    }
    
    ctx.putImageData(imageData, 0, 0);

    // 4. Draw Text Overlay (If provided)
    if (text && text.trim().length > 0) {
      ctx.save();
      
      // Default: Black Text with White Outline
      let fontFamily = "'Noto Sans TC', sans-serif";
      let fontWeight = "900";
      
      // Dynamic Font Family based on Artwork Style
      if (style) {
        if (style.includes('Pixel')) {
            fontFamily = "'DotGothic16', sans-serif";
            fontWeight = "400";
        } else if (style.includes('Sketch')) {
            fontFamily = "'Zen Maru Gothic', sans-serif";
            fontWeight = "700";
        }
      }

      // Calculate Font Size based on User Selection
      let sizeRatio = 0.22; // Default MD
      if (textSize === 'sm') sizeRatio = 0.15;
      if (textSize === 'lg') sizeRatio = 0.30;
      if (textSize === 'xl') sizeRatio = 0.40;

      const fontSize = Math.floor(spec.height * sizeRatio);
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      
      // Calculate Position
      const padding = spec.width * 0.05;
      let x = 0;
      let y = 0;
      let textAlign: CanvasTextAlign = 'center';
      let textBaseline: CanvasTextBaseline = 'middle';

      // Vertical Alignment
      if (textPosition.startsWith('top')) {
        y = padding;
        textBaseline = 'top';
      } else if (textPosition.startsWith('middle')) {
        y = spec.height / 2;
        textBaseline = 'middle';
      } else if (textPosition.startsWith('bottom')) {
        y = spec.height - padding;
        textBaseline = 'bottom';
      }

      // Horizontal Alignment
      if (textPosition.endsWith('left')) {
        x = padding;
        textAlign = 'left';
      } else if (textPosition.endsWith('center')) {
        x = spec.width / 2;
        textAlign = 'center';
      } else if (textPosition.endsWith('right')) {
        x = spec.width - padding;
        textAlign = 'right';
      }

      ctx.textAlign = textAlign;
      ctx.textBaseline = textBaseline;
      
      // Outline (White)
      ctx.strokeStyle = "white";
      ctx.lineWidth = Math.max(4, fontSize * 0.25); // Thick white border
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      
      // Fill (Black)
      ctx.fillStyle = "black";

      // Draw Stroke then Fill
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
      
      ctx.restore();
    }

    // 5. Convert to Blob and Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileNameBase}_${spec.suffix}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');

  } catch (error) {
    console.error("Error processing image", error);
    alert("圖片處理失敗");
  }
};
