
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './components/Button';
import { ChatPreview } from './components/ChatPreview';
import { generateEmojiSet } from './services/geminiService';
import { processAndDownload, STICKER_SPECS, EMOJI_SPECS } from './services/imageUtils';
import { Emoji, GenerationStyle, LineMode, TextPosition, TextSize } from './types';

// Placeholder for your LINE LIFF ID
const LIFF_ID = "2008580210-7A4NgXJz"; 

function App() {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<GenerationStyle>(GenerationStyle.Anime);
  const [mode, setMode] = useState<LineMode>('STICKER');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmojis, setGeneratedEmojis] = useState<Emoji[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Text options
  const [includeText, setIncludeText] = useState(false);
  const [customText, setCustomText] = useState('');
  const [textPosition, setTextPosition] = useState<TextPosition>('top-right');
  const [textSize, setTextSize] = useState<TextSize>('md');

  // LINE LIFF State
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [lineProfile, setLineProfile] = useState<{ displayName: string, pictureUrl?: string } | null>(null);
  const [isInClient, setIsInClient] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize LIFF
  useEffect(() => {
    const initLiff = async () => {
      try {
        if (window.liff) {
            console.log("Initializing LIFF with ID:", LIFF_ID);
            // Attempt to initialize LIFF
            await window.liff.init({ liffId: LIFF_ID });
            
            setIsLiffInit(true);
            
            if (window.liff.isInClient()) {
                setIsInClient(true);
                const profile = await window.liff.getProfile().catch((e: any) => {
                    console.warn("Failed to get profile:", e);
                    return null;
                });
                if (profile) {
                    setLineProfile(profile);
                }
            }
        } else {
            // Fallback for regular browser if script didn't load (unlikely but possible)
            console.warn("LIFF SDK not found on window");
        }
      } catch (error: any) {
        console.error("LIFF Init Error:", error);
        // Set error state to show the debug screen instead of a white screen
        setLiffError(error.message || JSON.stringify(error));
      }
    };
    initLiff();
  }, []);
  
  // Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("圖片大小請小於 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage && !prompt.trim()) {
        alert("請輸入描述或是上傳一張參考照片");
        return;
    }
    
    setIsGenerating(true);
    setGeneratedEmojis([]);

    try {
      await generateEmojiSet(
        prompt, 
        selectedStyle, 
        uploadedImage, 
        includeText, 
        customText, 
        mode,
        (newEmoji) => {
          setGeneratedEmojis(prev => [...prev, newEmoji]);
        }
      );
    } catch (e: any) {
      console.error("Main generation error:", e);
      alert(e.message || "產生過程中發生錯誤，請稍後再試。");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadStickerFormat = (emoji: Emoji, type: keyof typeof STICKER_SPECS) => {
    const spec = STICKER_SPECS[type];
    processAndDownload(emoji.dataUrl, spec, `LINE_Sticker_${emoji.emotion}`, emoji.text, emoji.style, textPosition, textSize);
  };

  const downloadEmojiFormat = (emoji: Emoji, type: keyof typeof EMOJI_SPECS) => {
    const spec = EMOJI_SPECS[type];
    processAndDownload(emoji.dataUrl, spec, `LINE_Emoji_${emoji.emotion}`, emoji.text, emoji.style, textPosition, textSize);
  };

  const getPreviewPositionStyle = (pos: TextPosition): React.CSSProperties => {
    const padding = '5%';
    switch (pos) {
      case 'top-left': return { top: padding, left: padding };
      case 'top-center': return { top: padding, left: '50%', transform: 'translateX(-50%)' };
      case 'top-right': return { top: padding, right: padding, textAlign: 'right' };
      case 'middle-left': return { top: '50%', left: padding, transform: 'translateY(-50%)' };
      case 'middle-center': return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' };
      case 'middle-right': return { top: '50%', right: padding, transform: 'translateY(-50%)', textAlign: 'right' };
      case 'bottom-left': return { bottom: padding, left: padding };
      case 'bottom-center': return { bottom: padding, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right': return { bottom: padding, right: padding, textAlign: 'right' };
      default: return { top: padding, right: padding };
    }
  };

  const getPreviewSizeStyle = (size: TextSize) => {
    switch(size) {
      case 'sm': return 'clamp(0.8rem, 15cqi, 2rem)';
      case 'md': return 'clamp(1rem, 22cqi, 3rem)';
      case 'lg': return 'clamp(1.2rem, 30cqi, 4rem)';
      case 'xl': return 'clamp(1.5rem, 40cqi, 5rem)';
      default: return 'clamp(1rem, 22cqi, 3rem)';
    }
  };

  const getPreviewTextStyle = (style: GenerationStyle) => {
    const baseStyle = {
        color: '#000000',
        textShadow: '2px 0 #fff, -2px 0 #fff, 0 2px #fff, 0 -2px #fff, 1px 1px #fff, -1px -1px #fff, 1px -1px #fff, -1px 1px #fff',
    };
    if (style === GenerationStyle.Pixel) return { ...baseStyle, fontFamily: '"DotGothic16", sans-serif', fontWeight: 400 };
    if (style === GenerationStyle.Sketch) return { ...baseStyle, fontFamily: '"Zen Maru Gothic", sans-serif', fontWeight: 700 };
    return { ...baseStyle, fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 900 };
  };

  const styleOptions = [
    { label: '動漫風格', value: GenerationStyle.Anime, icon: '🎨' },
    { label: '可愛 3D', value: GenerationStyle.ThreeD, icon: '🧊' },
    { label: '像素風', value: GenerationStyle.Pixel, icon: '👾' },
    { label: '手繪風', value: GenerationStyle.Sketch, icon: '✏️' },
    { label: '扁平設計', value: GenerationStyle.Flat, icon: '🔷' },
  ];

  // --- DEBUG SCREEN FOR LIFF ERRORS ---
  if (liffError) {
    return (
      <div className="min-h-screen bg-red-50 p-6 flex flex-col items-center justify-center text-red-900">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-red-200">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
             🚫 LIFF 連線失敗
          </h2>
          <p className="mb-4 text-sm text-gray-700">
            請將下方的網址複製，並貼到 LINE Developers Console 的 <strong>Endpoint URL</strong> 欄位中。
          </p>
          
          <div className="bg-gray-100 p-3 rounded-lg font-mono text-xs break-all border border-gray-300 mb-4 select-all">
            {window.location.href}
          </div>

          <div className="text-xs text-red-600 font-mono bg-red-50 p-3 rounded mb-4">
             Error: {liffError}
          </div>

          <div className="text-xs text-gray-500">
             目前的 LIFF ID: {LIFF_ID}
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
          >
            重新整理
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      {/* Header */}
      {!isInClient && (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#06C755] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                L
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                EmojiMaker <span className="text-[#06C755]">AI</span>
                </h1>
            </div>
            </div>
        </header>
      )}

      {/* LIFF Header */}
      {isInClient && (
         <div className="bg-[#242d38] text-white px-4 py-3 sticky top-0 z-50 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
                {lineProfile?.pictureUrl && (
                    <img src={lineProfile.pictureUrl} alt="Profile" className="w-8 h-8 rounded-full border border-white/20" />
                )}
                <div>
                    <div className="text-xs text-gray-300">歡迎回來</div>
                    <div className="font-bold text-sm">{lineProfile?.displayName || 'LINE 用戶'}</div>
                </div>
            </div>
            <div className="text-xs font-mono bg-white/10 px-2 py-1 rounded">
                AI 貼圖產生器
            </div>
         </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 flex">
              <button 
                onClick={() => setMode('STICKER')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  mode === 'STICKER' ? 'bg-[#06C755] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                製作貼圖 (Sticker)
              </button>
              <button 
                onClick={() => setMode('EMOJI')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  mode === 'EMOJI' ? 'bg-[#06C755] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                製作表情貼 (Emoji)
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1. 參考照片 <span className="text-gray-400 font-normal">(可選)</span>
                </label>
                {!uploadedImage ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#06C755] hover:bg-[#06C755]/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-white text-gray-500 group-hover:text-[#06C755]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">點擊上傳照片</p>
                    <p className="text-xs text-gray-400 mt-1">支援 JPG, PNG (Max 5MB)</p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                      <img src={uploadedImage} alt="Uploaded reference" className="w-full h-48 object-cover opacity-90" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={clearImage} className="bg-white text-red-500 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50">
                            移除照片
                          </button>
                      </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  2. {uploadedImage ? '補充描述 (可選)' : '主角 / 主題描述'}
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={uploadedImage ? "例如：讓他戴上墨鏡，穿著太空裝..." : "例如：一隻戴著墨鏡的藍色柴犬..."}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  3. 選擇藝術風格
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {styleOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStyle(option.value)}
                      className={`
                        p-3 rounded-xl text-left text-sm transition-all border
                        ${selectedStyle === option.value 
                          ? 'border-[#06C755] bg-[#06C755]/5 text-[#06C755] font-medium shadow-sm' 
                          : 'border-gray-100 hover:bg-gray-50 text-gray-600'}
                      `}
                    >
                      <span className="mr-2">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                 <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center cursor-pointer select-none">
                        <div className="relative">
                            <input 
                              type="checkbox" 
                              className="sr-only" 
                              checked={includeText}
                              onChange={(e) => setIncludeText(e.target.checked)}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${includeText ? 'bg-[#06C755]' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${includeText ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-sm font-medium text-gray-700">
                          加上文字
                        </div>
                    </label>
                 </div>

                 {includeText && (
                   <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">文字內容</label>
                        <input
                          type="text"
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          placeholder="輸入文字 (留空則自動配詞)"
                          maxLength={10}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#06C755] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">位置</label>
                        <div className="grid grid-cols-3 gap-1 w-24">
                          {[
                            'top-left', 'top-center', 'top-right',
                            'middle-left', 'middle-center', 'middle-right',
                            'bottom-left', 'bottom-center', 'bottom-right'
                          ].map((pos) => (
                             <button
                                key={pos}
                                onClick={() => setTextPosition(pos as TextPosition)}
                                className={`w-7 h-7 rounded border flex items-center justify-center transition-colors ${
                                   textPosition === pos 
                                   ? 'bg-[#06C755] border-[#06C755] text-white' 
                                   : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-100'
                                }`}
                                title={pos}
                             >
                                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                             </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">大小</label>
                        <div className="flex gap-2">
                           {(['sm', 'md', 'lg', 'xl'] as TextSize[]).map((size) => (
                              <button
                                key={size}
                                onClick={() => setTextSize(size)}
                                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                                   textSize === size
                                   ? 'bg-[#06C755] border-[#06C755] text-white'
                                   : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {size === 'sm' ? '小' : size === 'md' ? '中' : size === 'lg' ? '大' : '特大'}
                              </button>
                           ))}
                        </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={!prompt.trim() && !uploadedImage} 
                  isLoading={isGenerating}
                  className="w-full py-3 text-lg"
                >
                  {isGenerating ? `正在繪製${mode === 'STICKER' ? '貼圖' : '表情貼'}...` : `開始生成${mode === 'STICKER' ? '貼圖' : '表情貼'}`}
                </Button>
              </div>
            </div>

            {/* Generated Results Grid */}
            {generatedEmojis.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">生成結果 ({mode === 'STICKER' ? '貼圖' : '表情貼'})</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {generatedEmojis.map((emoji) => (
                      <div key={emoji.id} className="flex flex-col gap-3">
                        <div className="bg-[url('https://media.istockphoto.com/id/1145610816/vector/checkered-flag-chequered-flag.jpg?s=612x612&w=0&k=20&c=guF9Kk0uWqX855ZqWk0jGq0_Gq0.jpg')] bg-contain bg-gray-100 rounded-xl p-2 border border-gray-200 aspect-square flex items-center justify-center relative overflow-hidden group">
                          <img 
                            src={emoji.dataUrl} 
                            alt={emoji.emotion} 
                            className="w-full h-full object-contain drop-shadow-sm z-0" 
                          />
                          {emoji.text && (
                              <div 
                                className="absolute w-max max-w-[90%] z-10 pointer-events-none whitespace-nowrap leading-none"
                                style={{
                                    ...getPreviewTextStyle(emoji.style),
                                    ...getPreviewPositionStyle(textPosition),
                                    fontSize: getPreviewSizeStyle(textSize),
                                }}
                              >
                                {emoji.text}
                              </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                           <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{emoji.emotion}</div>
                           {mode === 'STICKER' ? (
                             <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => downloadStickerFormat(emoji, 'STICKER')} className="bg-gray-100 hover:bg-[#06C755] hover:text-white text-gray-700 px-2 py-2 rounded-lg text-xs font-medium transition-colors">貼圖用</button>
                                <button onClick={() => downloadStickerFormat(emoji, 'MAIN')} className="bg-gray-100 hover:bg-gray-800 hover:text-white text-gray-700 px-2 py-2 rounded-lg text-xs font-medium transition-colors">封面用</button>
                                <button onClick={() => downloadStickerFormat(emoji, 'TAB')} className="bg-gray-100 hover:bg-gray-800 hover:text-white text-gray-700 px-2 py-2 rounded-lg text-xs font-medium transition-colors">標籤用</button>
                             </div>
                           ) : (
                             <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => downloadEmojiFormat(emoji, 'CONTENT')} className="bg-gray-100 hover:bg-[#06C755] hover:text-white text-gray-700 px-2 py-2 rounded-lg text-xs font-medium transition-colors">表情貼用</button>
                                <button onClick={() => downloadEmojiFormat(emoji, 'TAB')} className="bg-gray-100 hover:bg-gray-800 hover:text-white text-gray-700 px-2 py-2 rounded-lg text-xs font-medium transition-colors">標籤用</button>
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-start pt-4 lg:pt-0">
             <div className="sticky top-24 w-full flex flex-col items-center">
                {!isInClient && (
                    <div className="mb-4 flex items-center gap-2 text-gray-500 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>聊天室預覽模式</span>
                    </div>
                )}
                <ChatPreview selectedEmojis={generatedEmojis} textPosition={textPosition} textSize={textSize} />
                <p className="mt-8 text-center text-sm text-gray-400 max-w-md">
                   注意：此工具會嘗試自動去除白色背景並調整圖片尺寸，但複雜的背景可能無法完美去背。
                </p>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
