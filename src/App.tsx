import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  Search, 
  X, 
  Info,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GENRES, MOODS, THEMES } from './constants';
import { CategoryItem, SongResult } from './types';
import { generateSong } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SongResult | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<CategoryItem | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    if (hoveredItem) {
      const timer = setTimeout(() => {
        setHoveredItem(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [hoveredItem]);

  const toggleSelection = (id: string, category: 'genre' | 'mood' | 'theme') => {
    const setters = {
      genre: { state: selectedGenres, set: setSelectedGenres },
      mood: { state: selectedMoods, set: setSelectedMoods },
      theme: { state: selectedThemes, set: setSelectedThemes }
    };
    
    const { state, set } = setters[category];
    if (state.includes(id)) {
      set(state.filter(i => i !== id));
    } else if (state.length < 5) {
      set([...state, id]);
    }
  };

  const clearCategory = (category: 'genre' | 'mood' | 'theme') => {
    if (category === 'genre') setSelectedGenres([]);
    if (category === 'mood') setSelectedMoods([]);
    if (category === 'theme') setSelectedThemes([]);
  };

  const clearAll = () => {
    setSelectedGenres([]);
    setSelectedMoods([]);
    setSelectedThemes([]);
    setUserInput('');
    setResult(null);
  };

  const applyRandom = () => {
    const getRandom = (items: CategoryItem[], max: number) => {
      const count = Math.floor(Math.random() * max) + 1;
      return [...items].sort(() => 0.5 - Math.random()).slice(0, count).map(i => i.id);
    };

    // Random button logic: max 3 per cat, total 4-8
    let g = getRandom(GENRES, 3);
    let m = getRandom(MOODS, 3);
    let t = getRandom(THEMES, 3);
    
    let total = g.length + m.length + t.length;
    while (total < 4 || total > 8) {
       g = getRandom(GENRES, 3);
       m = getRandom(MOODS, 3);
       t = getRandom(THEMES, 3);
       total = g.length + m.length + t.length;
    }

    setSelectedGenres(g);
    setSelectedMoods(m);
    setSelectedThemes(t);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let finalGenres = [...selectedGenres];
      let finalMoods = [...selectedMoods];
      let finalThemes = [...selectedThemes];
      let randomKeywords: string[] = [];

      const hasGenre = finalGenres.length > 0;
      const hasMood = finalMoods.length > 0;
      const hasTheme = finalThemes.length > 0;

      // If exactly two are selected, pick one random for the third
      const selectedCount = [hasGenre, hasMood, hasTheme].filter(Boolean).length;

      if (selectedCount === 2) {
        if (!hasGenre) {
          const random = GENRES[Math.floor(Math.random() * GENRES.length)];
          finalGenres = [random.id];
          randomKeywords.push(random.label);
        } else if (!hasMood) {
          const random = MOODS[Math.floor(Math.random() * MOODS.length)];
          finalMoods = [random.id];
          randomKeywords.push(random.label);
        } else if (!hasTheme) {
          const random = THEMES[Math.floor(Math.random() * THEMES.length)];
          finalThemes = [random.id];
          randomKeywords.push(random.label);
        }
      } 
      // If nothing selected, pick random (4-8 total)
      else if (selectedCount === 0) {
        const allItems = [
          ...GENRES.map(i => ({ ...i, cat: 'genre' })),
          ...MOODS.map(i => ({ ...i, cat: 'mood' })),
          ...THEMES.map(i => ({ ...i, cat: 'theme' }))
        ];
        const count = Math.floor(Math.random() * 5) + 4; // 4-8
        const picked = allItems.sort(() => 0.5 - Math.random()).slice(0, count);
        
        picked.forEach(p => {
          if (p.cat === 'genre') finalGenres.push(p.id);
          if (p.cat === 'mood') finalMoods.push(p.id);
          if (p.cat === 'theme') finalThemes.push(p.id);
          randomKeywords.push(p.label);
        });
      }

      const song = await generateSong(
        finalGenres.map(id => GENRES.find(g => g.id === id)?.label || id),
        finalMoods.map(id => MOODS.find(m => m.id === id)?.label || id),
        finalThemes.map(id => THEMES.find(t => t.id === id)?.label || id),
        userInput
      );

      const allApplied = [
        ...finalGenres.map(id => GENRES.find(g => g.id === id)?.label || id),
        ...finalMoods.map(id => MOODS.find(m => m.id === id)?.label || id),
        ...finalThemes.map(id => THEMES.find(t => t.id === id)?.label || id)
      ];

      setResult({
        ...song,
        appliedKeywords: allApplied,
        randomKeywords
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-brand-orange/30">
      {/* Header */}
      <header className="py-12 px-6 text-center border-b border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center mb-6"
        >
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-orange/10">
            <Music className="w-8 h-8 text-brand-orange" />
          </div>
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2 font-display">
          SORIDRAW's <span className="text-studio-brown">Studio</span>
        </h1>
        <p className="text-sm text-gray-500 font-medium tracking-widest uppercase mb-4">
          Compose Your Atmosphere
        </p>
        <p className="max-w-2xl mx-auto text-gray-400 leading-relaxed">
          '당신의 이야기를 음악으로'<br />
          키워드를 선택하여 세상에 단 하나 뿐인 당신만의 감성적인 곡을 만들어보세요.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* Selection Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <CategorySection 
            title="장르" 
            items={GENRES} 
            selected={selectedGenres} 
            onToggle={(id) => toggleSelection(id, 'genre')}
            onClear={() => clearCategory('genre')}
            onHover={setHoveredItem}
          />
          <CategorySection 
            title="분위기" 
            items={MOODS} 
            selected={selectedMoods} 
            onToggle={(id) => toggleSelection(id, 'mood')}
            onClear={() => clearCategory('mood')}
            onHover={setHoveredItem}
          />
          <CategorySection 
            title="주제" 
            items={THEMES} 
            selected={selectedThemes} 
            onToggle={(id) => toggleSelection(id, 'theme')}
            onClear={() => clearCategory('theme')}
            onHover={setHoveredItem}
          />
        </div>

        {/* Search & Actions */}
        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
              <Search className="w-5 h-5 text-gray-400 group-focus-within:text-brand-orange transition-colors" />
            </div>
            
            <input
              type="text"
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
                if (e.target.value) setShowGuide(false);
              }}
              onFocus={() => {
                setIsInputFocused(true);
                setShowGuide(false);
              }}
              onBlur={() => setIsInputFocused(false)}
              className="w-full bg-zinc-600/40 border border-white/20 rounded-2xl py-5 pl-12 pr-32 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange/50 transition-all text-lg"
            />

            {/* Mobile/Desktop Guide Overlay */}
            {showGuide && !userInput && !isInputFocused && (
              <div 
                onClick={() => {
                  setIsInputFocused(true);
                  setShowGuide(false);
                }}
                className="absolute inset-0 left-12 right-32 flex items-center cursor-text overflow-x-auto custom-scrollbar-hidden"
              >
                <div className="whitespace-nowrap text-gray-400 text-lg pr-4 animate-scroll-hint md:animate-none">
                  당신의 이야기를 들려주세요 (예: 비 오는 날 창밖을 보며 느끼는 그리움)
                </div>
              </div>
            )}

            <div className="absolute inset-y-2 right-2 flex items-center gap-2 z-10">
              <button
                onClick={applyRandom}
                title="랜덤 선택"
                className="p-3 rounded-xl bg-zinc-500/50 hover:bg-zinc-500 text-gray-200 hover:text-white transition-all"
              >
                <Sparkles className="w-5 h-5" />
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-3 rounded-xl bg-zinc-500/50 hover:bg-zinc-500 text-gray-200 hover:text-white transition-all text-sm font-medium"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Applied Keywords Display */}
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            <AnimatePresence>
              {[...selectedGenres, ...selectedMoods, ...selectedThemes].map((id) => {
                const item = [...GENRES, ...MOODS, ...THEMES].find(i => i.id === id);
                return (
                  <motion.span
                    key={id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="px-3 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-medium flex items-center gap-1"
                  >
                    {item?.label}
                    <button onClick={() => {
                      if (selectedGenres.includes(id)) toggleSelection(id, 'genre');
                      else if (selectedMoods.includes(id)) toggleSelection(id, 'mood');
                      else if (selectedThemes.includes(id)) toggleSelection(id, 'theme');
                    }}>
                      <X className="w-3 h-3 hover:text-brand-orange" />
                    </button>
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              "w-full py-5 rounded-2xl text-white font-bold text-xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98]",
              isGenerating 
                ? "bg-zinc-800 text-gray-600" 
                : "music-waves shadow-brand-orange/20 hover:brightness-110"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                작곡 중...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                곡 생성하기
              </>
            )}
          </button>
        </div>

        {/* Result Area */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pt-12 border-t border-white/5"
            >
              {/* Applied Keywords After Generation */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-orange" />
                  적용된 키워드
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.appliedKeywords.map((kw, idx) => {
                    const isRandom = result.randomKeywords?.includes(kw);
                    return (
                      <span 
                        key={idx} 
                        className={cn(
                          "px-3 py-1 rounded-lg text-sm",
                          isRandom ? "bg-brand-orange/20 text-brand-orange font-bold" : "bg-zinc-800 text-gray-300"
                        )}
                      >
                        {kw}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Title Card */}
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  <button
                    onClick={() => copyToClipboard(result.title, 'title')}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                  >
                    {copiedType === 'title' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <div className="space-y-2">
                  <span className="text-brand-orange font-mono text-sm tracking-widest uppercase">Generated Song</span>
                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                    {result.title}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lyrics Section */}
                <div className="bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-800/30">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Music className="w-5 h-5 text-brand-orange" />
                      가사 (Lyrics)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(result.lyrics.english, 'lyrics-en')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-all flex items-center gap-2"
                      >
                        {copiedType === 'lyrics-en' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        ENG
                      </button>
                      <button
                        onClick={() => copyToClipboard(result.lyrics.korean, 'lyrics-ko')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-all flex items-center gap-2"
                      >
                        {copiedType === 'lyrics-ko' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        KOR
                      </button>
                    </div>
                  </div>
                  <div className="p-8 grid grid-cols-2 gap-4 md:gap-8 max-h-[600px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                      <p className="text-[10px] md:text-xs font-bold text-brand-orange/50 uppercase tracking-widest">English</p>
                      <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed text-[11px] md:text-sm">
                        {result.lyrics.english}
                      </pre>
                    </div>
                    <div className="space-y-6 border-l border-white/5 pl-4 md:pl-8">
                      <p className="text-[10px] md:text-xs font-bold text-brand-orange/50 uppercase tracking-widest">Korean</p>
                      <pre className="whitespace-pre-wrap font-sans text-gray-400 leading-relaxed text-[11px] md:text-sm">
                        {result.lyrics.korean}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Prompt Section */}
                <div className="bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-800/30">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-brand-orange" />
                      음악 프롬프트 (Prompt)
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.prompt, 'prompt')}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      {copiedType === 'prompt' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="p-8 flex-1">
                    <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                      <p className="text-gray-400 leading-relaxed text-sm font-mono">
                        {result.prompt}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Tooltip / Description Overlay */}
      <AnimatePresence>
        {hoveredItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-zinc-800 border border-brand-orange/30 shadow-2xl pointer-events-none max-w-xs text-center"
          >
            <p className="text-brand-orange font-bold mb-1">{hoveredItem.label}</p>
            <p className="text-xs text-gray-400">{hoveredItem.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-12 px-6 text-center border-t border-white/5 text-gray-600 text-sm">
        <p>© 2026 SORIDRAW's Studio. All rights reserved.</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 130, 0, 0.3);
        }
        .custom-scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes scroll-hint {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-10px); }
        }
        .animate-scroll-hint {
          animation: scroll-hint 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  items: CategoryItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onHover: (item: CategoryItem | null) => void;
}

function CategorySection({ 
  title, 
  items, 
  selected, 
  onToggle, 
  onClear, 
  onHover
}: CategorySectionProps) {
  return (
    <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-brand-orange rounded-full" />
          {title}
          <span className="text-xs font-normal text-gray-500 ml-2">({selected.length}/5)</span>
        </h3>
        <button 
          onClick={onClear}
          className="text-xs font-medium text-gray-500 hover:text-brand-orange transition-colors uppercase tracking-wider"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onMouseEnter={() => onHover(item)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onToggle(item.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
              selected.includes(item.id)
                ? "bg-brand-orange border-orange-400 text-white shadow-lg shadow-brand-orange/20"
                : "bg-zinc-800/50 border-white/5 text-gray-400 hover:border-brand-orange/30 hover:text-gray-200"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
