import React from 'react';
import { Globe } from 'lucide-react';

export default function LanguageToggle({ lang, onToggle }) {
  return (
    <button 
      onClick={() => onToggle(lang === 'en' ? 'hi' : 'en')}
      className="flex items-center gap-2 px-3 py-1.5 bg-[#f0f0ee] hover:bg-[#e6e6e2] border border-black/5 rounded-lg transition-all duration-300 group"
      title="Switch Language / भाषा बदलें"
    >
      < Globe className={`w-3.5 h-3.5 transition-colors ${lang === 'hi' ? 'text-[#ff8c3c]' : 'text-black/40 group-hover:text-black'}`} />
      <span className="text-[10px] font-black uppercase tracking-widest text-black/60">
        {lang === 'en' ? 'EN' : 'हिं'}
      </span>
      <div className="flex h-3 w-6 bg-black/5 rounded-full p-0.5 relative overflow-hidden">
        <div className={`absolute top-0.5 bottom-0.5 w-2 bg-[#ff8c3c] rounded-full transition-all duration-300 shadow-[0_0_5px_rgba(255,140,60,0.5)] ${lang === 'hi' ? 'left-[calc(100%-10px)]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
