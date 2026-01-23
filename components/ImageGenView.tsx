
import React, { useState } from 'react';
import { Sparkles, Loader2, Image as ImageIcon, Download, RefreshCw, AlertCircle, X } from 'lucide-react';
import { generateImage } from '../services/gemini';

const ImageGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMobile = window.innerWidth < 768;

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setResult(null);
    setError(null);
    try {
      const imageUrl = await generateImage(prompt);
      setResult(imageUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "A cosmic ripple disrupted the manifestation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-[#0b141a]">
      <div className={`max-w-5xl mx-auto w-full p-6 md:p-12 ${isMobile ? 'safe-top pt-10' : ''}`}>
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-[#00a884]/10 rounded-[28px] text-[#00a884] shadow-xl">
              <Sparkles size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold font-outfit text-white">Zen Space</h1>
              <p className="text-[#8696a0] font-medium">Manifest visions into digital art</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start pb-20">
          {/* Controls */}
          <div className="space-y-8 order-2 lg:order-1">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#00a884] uppercase tracking-widest px-1">Visions description</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="A tranquil floating garden in the clouds, soft emerald lighting, 8k resolution..."
                  className={`w-full h-44 bg-[#111b21] border rounded-[40px] p-8 text-white placeholder-[#3b4a54] focus:ring-4 transition-all resize-none text-lg leading-relaxed shadow-2xl ${
                    error ? 'border-rose-500/50 focus:ring-rose-500/10' : 'border-white/5 focus:ring-[#00a884]/10 focus:border-[#00a884]/40'
                  }`}
                ></textarea>
                
                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                      <p className="text-rose-200 text-sm font-medium">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-400">
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className="flex-1 flex items-center justify-center gap-3 bg-[#00a884] hover:bg-[#06cf9c] text-black font-bold py-5 rounded-[32px] shadow-2xl shadow-[#00a884]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={24} strokeWidth={3} />
                      <span>Manifesting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} />
                      <span>Generate</span>
                    </>
                  )}
                </button>
                {(result || error) && (
                  <button 
                    type="button"
                    onClick={() => handleGenerate()}
                    className="p-5 bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] rounded-[32px] transition-all border border-white/5"
                  >
                    <RefreshCw size={26} />
                  </button>
                )}
              </div>
            </form>

            <div className="p-8 rounded-[48px] bg-[#111b21] border border-white/5 shadow-2xl">
              <h4 className="font-bold text-[#00a884] mb-6 flex items-center gap-3 uppercase text-xs tracking-widest">
                <ImageIcon size={18} /> Inspiration 
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <button 
                    key={i}
                    onClick={() => {
                      setPrompt(`Minimalist zen garden ${i}, cinematic lighting, atmospheric`);
                      setError(null);
                    }}
                    className="aspect-square rounded-[24px] overflow-hidden grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100 border-2 border-transparent hover:border-[#00a884] active:scale-95"
                  >
                    <img src={`https://picsum.photos/seed/${i+100}/300`} alt="Inspiration" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result Area */}
          <div className="aspect-square w-full relative group order-1 lg:order-2">
            <div className={`absolute inset-0 rounded-[64px] blur-[100px] animate-pulse ${error ? 'bg-rose-500/10' : 'bg-[#00a884]/10'}`}></div>
            <div className={`relative h-full w-full rounded-[64px] border-4 flex items-center justify-center overflow-hidden bg-[#111b21] shadow-2xl group transition-all duration-700 ${
              error ? 'border-rose-500/20' : 'border-[#202c33]'
            }`}>
              {result ? (
                <>
                  <img src={result} alt="Generated result" className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center gap-6 backdrop-blur-sm">
                    <a 
                      href={result} 
                      download="zenj-manifestation.png"
                      className="p-6 bg-[#00a884] text-black rounded-full hover:scale-110 active:scale-90 transition-transform shadow-2xl"
                    >
                      <Download size={32} strokeWidth={3} />
                    </a>
                    <button 
                      onClick={() => handleGenerate()}
                      className="p-6 bg-white text-black rounded-full hover:scale-110 active:scale-90 transition-transform shadow-2xl"
                    >
                      <RefreshCw size={32} strokeWidth={3} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center px-10">
                  <div className={`w-24 h-24 bg-[#202c33] rounded-[40px] flex items-center justify-center mx-auto mb-8 text-[#3b4a54] transition-all duration-1000 ${
                    isGenerating ? 'animate-bounce text-[#00a884]' : error ? 'text-rose-500' : ''
                  }`}>
                    {error ? <AlertCircle size={48} strokeWidth={1} /> : <ImageIcon size={48} strokeWidth={1} />}
                  </div>
                  <h3 className="text-2xl font-bold text-[#8696a0] mb-4 font-outfit">
                    {error ? "Manifestation Failed" : "Void Awaits"}
                  </h3>
                  <p className="text-[#3b4a54] font-medium leading-relaxed">
                    {error ? "Refine your description to try again." : "Enter a vision prompt to manifest digital reality."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenView;
