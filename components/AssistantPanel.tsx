import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Sparkles, Loader2, RefreshCw, Layers, Copy, Check, Bot, Settings, X, ExternalLink, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeContent } from '../services/geminiService';
import { extractTextFromPages, extractImagesFromPages } from '../services/pdfUtils';

interface AssistantPanelProps {
  file: File | null;
  selectedPages: Set<number>;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Balanced & Recommended)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (High Reasoning)' },
  { id: 'gemini-2.0-flash-lite-preview-02-05', name: 'Gemini 2.0 Flash Lite (Fastest)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Legacy)' },
];

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ file, selectedPages }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hello! Select chapters or pages from the outline, and I can analyze them for you.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('gemini-2.5-flash');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('pdfslice_api_key');
    const savedModel = localStorage.getItem('pdfslice_model_id');
    if (savedKey) setApiKey(savedKey);
    // Validate if saved model still exists in our list, otherwise default
    if (savedModel && AVAILABLE_MODELS.some(m => m.id === savedModel)) {
      setModelId(savedModel);
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('pdfslice_api_key', apiKey);
    localStorage.setItem('pdfslice_model_id', modelId);
    setShowSettings(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Unified send handler
  const triggerAnalysis = async (userText: string, systemPromptOverride?: string) => {
    if (!file) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "Please upload a PDF file first."
        }]);
        return;
    }

    if (selectedPages.size === 0) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "Please select at least one page or chapter from the outline on the left for me to analyze."
        }]);
        return;
    }

    if (!apiKey) {
        setShowSettings(true);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "Please configure your Gemini API Key in the settings to continue."
        }]);
        return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const pageNumbers = Array.from(selectedPages) as number[];
      
      // Parallel extraction
      const [extractedText, extractedImages] = await Promise.all([
        extractTextFromPages(file, pageNumbers),
        extractImagesFromPages(file, pageNumbers)
      ]);
      
      if (!extractedText.trim() && extractedImages.length === 0) {
         throw new Error("Could not extract content from the selected pages.");
      }

      const responseText = await analyzeContent(
          apiKey,
          modelId,
          extractedText, 
          extractedImages, 
          userMsg.text, 
          systemPromptOverride
      );

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "Failed to analyze content.";
       
       let finalErrorText = `Error: ${errorMessage}`;
       
       if (errorMessage.includes("403") || errorMessage.includes("API Key")) {
           finalErrorText = "Error: Invalid API Key. Please check your settings.";
           setShowSettings(true);
       }

       setMessages(prev => [...prev, {
         id: Date.now().toString(),
         role: 'model',
         text: finalErrorText
       }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    await triggerAnalysis(text);
  };

  const handleSummarize = async () => {
    if (loading) return;
    const summaryPrompt = "请根据选中的页面内容进行总结。";
    const summarySystemPrompt = "请你详细、耐心、有逻辑地解释这些内容，注意总结需要全面有逻辑，大段文字内容，**优先使用多级列表（有序或无序）**进行结构化梳理，在列表的**每个主要项（item）前**，必须添加一句**总结性小标题**，概括该项的核心内容。需要进行适当的总结和提炼，确保每个部分都涵盖，但不需要过分展开所有的细节";
    
    await triggerAnalysis(summaryPrompt, summarySystemPrompt);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 relative">
      <div className="p-4 border-b border-slate-200/50 bg-white/80 backdrop-blur flex justify-between items-center shrink-0 shadow-sm z-10">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <div className="p-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md text-white shadow-md shadow-indigo-200">
             <Bot size={16} />
          </div>
          AI Assistant
        </h2>
        <div className="flex gap-2">
            <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md flex items-center gap-1 font-medium">
                <Layers size={12} />
                {selectedPages.size}
            </span>
            <button 
               onClick={() => setShowSettings(!showSettings)}
               className={`text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1 border ${showSettings ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100'}`}
               title="Settings"
            >
               <Settings size={12} />
               <span className="hidden sm:inline">Config</span>
            </button>
            <button 
                onClick={() => setMessages([])} 
                className="text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1 border border-transparent hover:border-red-100"
                title="Clear Chat"
            >
                <RefreshCw size={12}/>
            </button>
        </div>
      </div>

      {/* Settings Modal Overlay */}
      {showSettings && (
        <div className="absolute top-[60px] left-2 right-2 z-30 bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Settings size={14} className="text-indigo-500"/>
              Assistant Configuration
            </h3>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Gemini API Key</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
              />
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 mt-1.5 font-medium"
              >
                Get API Key <ExternalLink size={10} />
              </a>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Model</label>
              <div className="relative">
                <select 
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full appearance-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all pr-8"
                >
                  {AVAILABLE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button 
              onClick={saveSettings}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div 
              className={`max-w-[92%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm relative group transition-all ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-blue-200' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none pb-8 shadow-slate-200/50'
              }`}
            >
              {msg.role === 'model' ? (
                <>
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-full shadow-sm hover:bg-white text-slate-500 hover:text-blue-600 transition-colors text-xs"
                      title="Copy Markdown"
                    >
                      {copiedId === msg.id ? <Check size={12} className="text-green-500"/> : <Copy size={12}/>}
                      <span className="font-medium">Copy</span>
                    </button>
                  </div>
                  <div className="text-sm overflow-hidden prose prose-sm max-w-none">
                    <ReactMarkdown 
                        components={{
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2 text-slate-700 marker:text-blue-400" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-700 marker:text-blue-500 font-medium" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1 leading-relaxed" {...props} />,
                          
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold text-slate-900 mt-6 mb-3 pb-2 border-b border-slate-100" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold text-slate-800 mt-5 mb-2.5 flex items-center gap-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-bold text-slate-800 mt-4 mb-2" {...props} />,
                          h4: ({node, ...props}) => <h4 className="text-sm font-bold text-slate-700 mt-3 mb-1" {...props} />,
                          h5: ({node, ...props}) => <h5 className="text-sm font-semibold text-slate-600 mt-2 mb-1 italic" {...props} />,
                          h6: ({node, ...props}) => <h6 className="text-xs font-bold text-slate-500 mt-2 mb-1 uppercase tracking-wider" {...props} />,
                          
                          p: ({node, ...props}) => <p className="my-2 leading-relaxed text-slate-600" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-4 border-blue-400 pl-4 py-2 my-3 bg-blue-50/50 text-slate-600 italic rounded-r-lg text-sm" {...props} />
                          ),
                          
                          table: ({node, ...props}) => <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 shadow-sm"><table className="w-full text-left border-collapse" {...props} /></div>,
                          thead: ({node, ...props}) => <thead className="bg-slate-50 text-slate-700" {...props} />,
                          tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-slate-100" {...props} />,
                          tr: ({node, ...props}) => <tr className="hover:bg-slate-50/50 transition-colors" {...props} />,
                          th: ({node, ...props}) => <th className="p-3 text-xs font-bold uppercase tracking-wider border-r border-slate-100 last:border-0" {...props} />,
                          td: ({node, ...props}) => <td className="p-3 text-sm text-slate-600 border-r border-slate-100 last:border-0" {...props} />,

                          code({node, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const content = String(children).replace(/\n$/, '');
                            const isMultiLine = content.includes('\n');
                            const isBlock = match || isMultiLine;
                            
                            return !isBlock ? (
                              <code className="bg-slate-100 text-pink-600 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-xs font-semibold" {...props}>
                                {children}
                              </code>
                            ) : (
                              <div className="relative my-4 rounded-xl overflow-hidden bg-slate-900 shadow-lg ring-1 ring-slate-900/5 group/code">
                                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                                      <span className="text-xs text-slate-400 font-mono font-medium">{match ? match[1] : 'Code'}</span>
                                      <div className="flex gap-1.5 opacity-60">
                                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                      </div>
                                  </div>
                                  <pre className="p-4 overflow-x-auto text-slate-50 text-sm font-mono leading-relaxed scrollbar-thin" {...props}>
                                    <code>{children}</code>
                                  </pre>
                              </div>
                            );
                          }
                        }}
                    >
                        {msg.text}
                    </ReactMarkdown>
                  </div>
                </>
              ) : (
                <div className="font-medium">{msg.text}</div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">
               {msg.role === 'model' ? 'AI Assistant' : 'You'}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-4 text-slate-600 text-sm shadow-sm animate-pulse">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur opacity-20 animate-ping"></div>
                  <Loader2 size={20} className="animate-spin text-blue-500 relative z-10" />
                </div>
                <div>
                    <div className="font-bold text-slate-700">Thinking...</div>
                    <div className="text-xs text-slate-400 mt-0.5">Using {AVAILABLE_MODELS.find(m => m.id === modelId)?.name || 'Gemini'}</div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200/60 shrink-0 space-y-3 z-20">
        {/* Quick Actions */}
        {selectedPages.size > 0 && !loading && (
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
             <button
                onClick={handleSummarize}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold hover:bg-indigo-100 hover:scale-105 transition-all whitespace-nowrap border border-indigo-100 shadow-sm"
             >
                <Sparkles size={12} className="text-indigo-500" />
                Smart Summary
             </button>
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all shadow-inner">
          <input
            type="text"
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none text-slate-700 placeholder:text-slate-400"
            placeholder={selectedPages.size > 0 ? "Ask a question..." : "Select pages to start..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2.5 rounded-full hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all transform hover:scale-105 active:scale-95"
          >
            <Send size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};