
import React, { useState, useEffect, useRef } from 'react';
import { Emoji, ChatMessage, GenerationStyle, TextPosition, TextSize } from '../types';

interface ChatPreviewProps {
  selectedEmojis: Emoji[];
  textPosition: TextPosition;
  textSize: TextSize;
}

export const ChatPreview: React.FC<ChatPreviewProps> = ({ selectedEmojis, textPosition, textSize }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'text',
      content: '嗨！看看我新做的表情貼！',
      isUser: true,
      timestamp: '10:00'
    },
    {
      id: '2',
      type: 'text',
      content: '哇！這是用 AI 做的嗎？看起來很讚耶！',
      isUser: false,
      timestamp: '10:01'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendEmoji = (emoji: Emoji) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'image',
      content: emoji.dataUrl,
      textOverlay: emoji.text, 
      style: emoji.style,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);

    // Simulate auto-reply
    setTimeout(() => {
        const replies = [
            "太可愛了吧！ 😍",
            "我也想要這組貼圖！",
            "那個表情好生動 😂",
            "這風格很適合做成正式貼圖耶"
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        
        setMessages(prev => [...prev, {
            id: Date.now().toString() + 'reply',
            type: 'text',
            content: randomReply,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    }, 1500);
  };

  const getTextStyle = (style?: GenerationStyle) => {
      const baseStyle = {
        color: '#000000', // Black Text
        textShadow: '2px 0 #fff, -2px 0 #fff, 0 2px #fff, 0 -2px #fff, 1px 1px #fff, -1px -1px #fff, 1px -1px #fff, -1px 1px #fff',
      };

      if (style === GenerationStyle.Pixel) {
          return { ...baseStyle, fontFamily: '"DotGothic16", sans-serif', fontWeight: 400 };
      }
      if (style === GenerationStyle.Sketch) {
          return { ...baseStyle, fontFamily: '"Zen Maru Gothic", sans-serif', fontWeight: 700 };
      }
      return { ...baseStyle, fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 900 };
  };

  // Helper to map TextPosition to CSS styles
  const getPositionStyle = (pos: TextPosition): React.CSSProperties => {
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

  // Helper to map TextSize to CSS percentage (relative to container)
  const getSizeStyle = (size: TextSize) => {
    switch(size) {
      case 'sm': return '15%';
      case 'md': return '22%';
      case 'lg': return '30%';
      case 'xl': return '40%';
      default: return '22%';
    }
  };

  // Helper to render sticker with optional text overlay
  const StickerWithText = ({ src, text, style, className = "" }: { src: string, text?: string, style?: GenerationStyle, className?: string }) => (
    <div className={`relative inline-block ${className}`}>
        <img 
            src={src} 
            alt="Sticker" 
            className="w-full h-full object-contain" 
        />
        {text && (
            <div 
                className="absolute w-max max-w-[90%] pointer-events-none whitespace-nowrap leading-none z-10"
                style={{ 
                    ...getTextStyle(style),
                    ...getPositionStyle(textPosition),
                    fontSize: getSizeStyle(textSize),
                }}
            >
                {text}
            </div>
        )}
    </div>
  );

  return (
    <div className="w-full max-w-sm mx-auto bg-[#8c9da9] h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col border-8 border-gray-800 relative">
        {/* Notch/Top Bar Simulation */}
        <div className="bg-[#2a3847] text-white p-3 flex items-center justify-between text-xs px-6">
            <span>9:41</span>
            <div className="flex gap-1">
                <div className="w-3 h-3 bg-white rounded-full opacity-80"></div>
                <div className="w-3 h-3 bg-white rounded-full opacity-80"></div>
            </div>
        </div>

        {/* Header */}
        <div className="bg-[#242d38] text-white p-4 flex items-center shadow-md z-10">
            <div className="w-8 h-8 rounded-full bg-gray-400 mr-3 flex items-center justify-center text-sm font-bold">
                好友
            </div>
            <div>
                <h3 className="font-bold text-sm">LINE 好友</h3>
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                    {!msg.isUser && (
                         <div className="w-8 h-8 rounded-full bg-gray-400 mr-2 flex-shrink-0 self-start mt-1"></div>
                    )}
                    <div className="flex flex-col max-w-[70%]">
                        {msg.type === 'text' ? (
                            <div 
                                className={`px-4 py-2 rounded-2xl text-sm break-words relative 
                                ${msg.isUser 
                                    ? 'bg-[#06C755] text-white rounded-tr-none' 
                                    : 'bg-white text-gray-800 rounded-tl-none'}`}
                            >
                                {msg.content}
                            </div>
                        ) : (
                            <StickerWithText 
                                src={msg.content} 
                                text={msg.textOverlay}
                                style={msg.style}
                                className="w-32 h-32 hover:scale-105 transition-transform"
                            />
                        )}
                        <span className={`text-[10px] text-gray-600 mt-1 ${msg.isUser ? 'text-right' : 'text-left'}`}>
                            {msg.timestamp}
                        </span>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Keyboard/Sticker Input Simulation */}
        <div className="bg-white p-2 border-t border-gray-200">
            {selectedEmojis.length > 0 ? (
                 <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-2">
                    {selectedEmojis.map((emoji) => (
                        <button 
                            key={emoji.id}
                            onClick={() => handleSendEmoji(emoji)}
                            className="flex-shrink-0 w-16 h-16 border rounded-lg p-1 hover:bg-gray-100 transition-colors relative"
                        >
                             <div className="w-full h-full relative">
                                <img src={emoji.dataUrl} className="w-full h-full object-contain" alt={emoji.emotion} />
                                {emoji.text && (
                                    <div 
                                        className="absolute w-max max-w-full pointer-events-none whitespace-nowrap leading-none"
                                        style={{ 
                                            ...getTextStyle(emoji.style),
                                            ...getPositionStyle(textPosition),
                                            fontSize: '10px' // Fixed small size for thumbnails
                                        }}
                                    >
                                        {emoji.text}
                                    </div>
                                )}
                             </div>
                        </button>
                    ))}
                 </div>
            ) : (
                <div className="text-center text-xs text-gray-400 py-2">
                    產生表情貼後，點擊這裡試用
                </div>
            )}
            
            <div className="flex items-center gap-2">
                <div className="p-2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-8"></div>
                <div className="p-2 text-[#06C755]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </div>
            </div>
        </div>
    </div>
  );
};
