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
  ChevronUp,
  Pin,
  PinOff,
  Trash2
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
  const [pinnedGenres, setPinnedGenres] = useState<string[]>([]);
  const [pinnedMoods, setPinnedMoods] = useState<string[]>([]);
  const [pinnedThemes, setPinnedThemes] = useState<string[]>([]);
  const [tempoEnabled, setTempoEnabled] = useState(false);
  const [minBPM, setMinBPM] = useState(60);
  const [maxBPM, setMaxBPM] = useState(140);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SongResult | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<CategoryItem | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (hoveredItem) {
      const timer = setTimeout(() => {
        setHoveredItem(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hoveredItem]);

  const toggleSelection = (id: string, category: 'genre' | 'mood' | 'theme') => {
    const setters = {
      genre: { state: selectedGenres, set: setSelectedGenres, pinned: pinnedGenres },
      mood: { state: selectedMoods, set: setSelectedMoods, pinned: pinnedMoods },
      theme: { state: selectedThemes, set: setSelectedThemes, pinned: pinnedThemes }
    };
    
    const { state, set, pinned } = setters[category];
    
    // If pinned, don't allow unselecting unless unpinned first
    if (pinned.includes(id)) return;

    if (state.includes(id)) {
      set(state.filter(i => i !== id));
    } else if (state.length < 6) {
      set([...state, id]);
    }
  };

  const togglePin = (id: string, category: 'genre' | 'mood' | 'theme') => {
    const setters = {
      genre: { pinned: pinnedGenres, setPinned: setPinnedGenres, selected: selectedGenres, setSelected: setSelectedGenres },
      mood: { pinned: pinnedMoods, setPinned: setPinnedMoods, selected: selectedMoods, setSelected: setSelectedMoods },
      theme: { pinned: pinnedThemes, setPinned: setPinnedThemes, selected: selectedThemes, setSelected: setSelectedThemes }
    };

    const { pinned, setPinned, selected, setSelected } = setters[category];
    const isPinned = pinned.includes(id);

    if (isPinned) {
      setPinned(pinned.filter(i => i !== id));
    } else {
      // When pinning, ensure it's also selected
      if (!selected.includes(id)) {
        if (selected.length < 6) {
          setSelected([...selected, id]);
          setPinned([...pinned, id]);
        }
      } else {
        setPinned([...pinned, id]);
      }
    }
  };

  const clearCategory = (category: 'genre' | 'mood' | 'theme') => {
    if (category === 'genre') setSelectedGenres(pinnedGenres);
    if (category === 'mood') setSelectedMoods(pinnedMoods);
    if (category === 'theme') setSelectedThemes(pinnedThemes);
  };

  const clearAll = () => {
    setSelectedGenres(pinnedGenres);
    setSelectedMoods(pinnedMoods);
    setSelectedThemes(pinnedThemes);
    setUserInput('');
    setResult(null);
  };

  const unpinAll = (category: 'genre' | 'mood' | 'theme') => {
    if (category === 'genre') setPinnedGenres([]);
    if (category === 'mood') setPinnedMoods([]);
    if (category === 'theme') setPinnedThemes([]);
  };

  const applyRandom = () => {
    const getRandomForCategory = (all: CategoryItem[], pinned: string[], maxTotal: number) => {
      const result = [...pinned];
      const remainingPool = all.filter(item => !pinned.includes(item.id));
      
      // Decide how many more to add (up to maxTotal)
      const currentCount = pinned.length;
      const additionalCount = Math.max(0, Math.floor(Math.random() * (maxTotal - currentCount + 1)));
      const picked = [...remainingPool].sort(() => 0.5 - Math.random()).slice(0, additionalCount);
      
      return [...result, ...picked.map(p => p.id)];
    };

    // Random button logic: Max 3 per category, total 5-10
    let g = getRandomForCategory(GENRES, pinnedGenres, 3);
    let m = getRandomForCategory(MOODS, pinnedMoods, 3);
    let t = getRandomForCategory(THEMES, pinnedThemes, 3);
    
    let total = g.length + m.length + t.length;
    
    // If total is not between 5 and 10, adjust
    if (total < 5 || total > 10) {
      const allItems = [
        ...GENRES.filter(i => !g.includes(i.id)).map(i => ({ ...i, cat: 'genre' })),
        ...MOODS.filter(i => !m.includes(i.id)).map(i => ({ ...i, cat: 'mood' })),
        ...THEMES.filter(i => !t.includes(i.id)).map(i => ({ ...i, cat: 'theme' }))
      ];
      
      if (total < 5) {
        const needed = 5 - total;
        const extra = allItems.sort(() => 0.5 - Math.random()).slice(0, needed);
        extra.forEach(p => {
          if (p.cat === 'genre') g.push(p.id);
          if (p.cat === 'mood') m.push(p.id);
          if (p.cat === 'theme') t.push(p.id);
        });
      } else if (total > 10) {
        // This shouldn't happen with max 3 per category (3*3=9), but for safety:
        const toRemove = total - 10;
        // Logic to remove if needed
      }
    }

    setSelectedGenres(g);
    setSelectedMoods(m);
    setSelectedThemes(t);

    // Random tempo logic
    if (tempoEnabled) {
      const isRange = Math.random() > 0.5;
      const baseBPM = Math.floor(Math.random() * (140 - 60 + 1)) + 60;
      if (isRange) {
        const range = Math.floor(Math.random() * 5); // 0 to 4
        const newMin = Math.max(60, baseBPM - Math.floor(range / 2));
        const newMax = Math.min(140, newMin + range);
        setMinBPM(newMin);
        setMaxBPM(newMax);
      } else {
        setMinBPM(baseBPM);
        setMaxBPM(baseBPM);
      }
    }
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
      // If nothing selected, pick random (5-10 total)
      else if (selectedCount === 0) {
        const allItems = [
          ...GENRES.map(i => ({ ...i, cat: 'genre' })),
          ...MOODS.map(i => ({ ...i, cat: 'mood' })),
          ...THEMES.map(i => ({ ...i, cat: 'theme' }))
        ];
        const count = Math.floor(Math.random() * 6) + 5; // 5-10
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
        userInput,
        tempoEnabled && (minBPM !== 60 || maxBPM !== 140) && (maxBPM - minBPM <= 10)
          ? (minBPM === maxBPM ? `Exactly ${minBPM} BPM` : `Between ${minBPM} and ${maxBPM} BPM`)
          : undefined
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
        <h1 
          className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2 font-display"
          style={{ fontFamily: 'Verdana' }}
        >
          SORIDRAW's <span className="text-studio-brown">Studio</span>
        </h1>
        <p className="text-[13px] text-gray-500 font-medium tracking-widest uppercase mb-4">
          Compose Your Atmosphere
        </p>
        <p 
          className="max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: 'Courier New', color: '#96999d', fontWeight: 'normal', fontSize: '14px' }}
        >
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
            pinned={pinnedGenres}
            onToggle={(id) => toggleSelection(id, 'genre')}
            onTogglePin={(id) => togglePin(id, 'genre')}
            onClear={() => clearCategory('genre')}
            onUnpinAll={() => unpinAll('genre')}
            onHover={setHoveredItem}
          />
          <CategorySection 
            title="분위기" 
            items={MOODS} 
            selected={selectedMoods} 
            pinned={pinnedMoods}
            onToggle={(id) => toggleSelection(id, 'mood')}
            onTogglePin={(id) => togglePin(id, 'mood')}
            onClear={() => clearCategory('mood')}
            onUnpinAll={() => unpinAll('mood')}
            onHover={setHoveredItem}
          />
          <CategorySection 
            title="주제" 
            items={THEMES} 
            selected={selectedThemes} 
            pinned={pinnedThemes}
            onToggle={(id) => toggleSelection(id, 'theme')}
            onTogglePin={(id) => togglePin(id, 'theme')}
            onClear={() => clearCategory('theme')}
            onUnpinAll={() => unpinAll('theme')}
            onHover={setHoveredItem}
          />
        </div>

        {/* Tempo Control Bar */}
        <div className="mb-10">
          <TempoControl 
            enabled={tempoEnabled}
            onEnabledChange={setTempoEnabled}
            min={minBPM}
            max={maxBPM}
            onMinChange={setMinBPM}
            onMaxChange={setMaxBPM}
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
              }}
              onFocus={() => {
                setIsInputFocused(true);
              }}
              onBlur={() => setIsInputFocused(false)}
              className="w-full bg-[#1b1b1e] border border-white/20 rounded-2xl py-5 pl-12 pr-32 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange/50 transition-all text-lg"
            />

            {/* Mobile/Desktop Guide Overlay - Looping Marquee */}
            {!userInput && (
              <div 
                className="absolute inset-0 left-12 right-32 flex items-center pointer-events-none overflow-hidden"
              >
                <div className="flex animate-marquee-right whitespace-nowrap">
                  <div 
                    className="flex-shrink-0 pr-12"
                    style={{ fontSize: '17px', color: '#999ea6' }}
                  >
                    당신의 이야기를 들려주세요 (예: 비 오는 날 창밖을 보며 느끼는 그리움, 늦은 밤 떠오르는 한 사람)
                  </div>
                  <div 
                    className="flex-shrink-0 pr-12"
                    style={{ fontSize: '17px', color: '#999ea6' }}
                  >
                    당신의 이야기를 들려주세요 (예: 비 오는 날 창밖을 보며 느끼는 그리움, 늦은 밤 떠오르는 한 사람)
                  </div>
                </div>
              </div>
            )}

            <div className="absolute inset-y-2 right-2 flex items-center gap-2 z-10">
              <button
                onClick={applyRandom}
                title="랜덤 선택"
                className="p-3 rounded-xl bg-zinc-500/50 hover:bg-zinc-500 text-gray-200 hover:text-white transition-all text-base"
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-zinc-800/50 backdrop-blur-md border border-brand-orange/30 shadow-2xl pointer-events-none max-w-xs text-center"
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
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-right {
          animation: marquee-right 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  items: CategoryItem[];
  selected: string[];
  pinned: string[];
  onToggle: (id: string) => void;
  onTogglePin: (id: string) => void;
  onClear: () => void;
  onUnpinAll: () => void;
  onHover: (item: CategoryItem | null) => void;
}

function CategorySection({ 
  title, 
  items, 
  selected, 
  pinned,
  onToggle, 
  onTogglePin,
  onClear, 
  onUnpinAll,
  onHover
}: CategorySectionProps) {
  return (
    <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[20px] font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-brand-orange rounded-full" />
          {title}
          <span className="text-[14px] font-normal text-gray-500 ml-2">({selected.length}/6)</span>
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={onUnpinAll}
            title="Unpin All"
            className="p-2 rounded-lg bg-white/5 hover:bg-brand-orange/20 text-gray-500 hover:text-brand-orange transition-all"
          >
            <PinOff className="w-4 h-4" />
          </button>
          <button 
            onClick={onClear}
            title="Clear"
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isPinned = pinned.includes(item.id);
          const isSelected = selected.includes(item.id);
          
          return (
            <div key={item.id} className="relative group/btn">
              <button
                onMouseEnter={() => onHover(item)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onToggle(item.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-medium transition-all border flex items-center gap-2",
                  isSelected
                    ? "bg-brand-orange border-orange-400 text-white shadow-lg shadow-brand-orange/20"
                    : "bg-[#19191b] border-white/5 text-gray-400 hover:border-brand-orange/30 hover:text-gray-200"
                )}
              >
                {item.label}
              </button>
              
              {/* Pin Toggle Button - Top Right Corner Only */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(item.id);
                }}
                className={cn(
                  "absolute -top-2 -right-2 p-1.5 rounded-full border transition-all z-10",
                  isPinned 
                    ? "bg-[#A0522D] border-[#8B4513] text-white opacity-100 scale-100" 
                    : "bg-zinc-800 border-white/10 text-gray-500 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 hover:text-brand-orange"
                )}
              >
                <Pin className={cn("w-3 h-3", isPinned && "fill-current")} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TempoControlProps {
  enabled: boolean;
  onEnabledChange: (val: boolean) => void;
  min: number;
  max: number;
  onMinChange: (val: number) => void;
  onMaxChange: (val: number) => void;
}

function TempoControl({ enabled, onEnabledChange, min, max, onMinChange, onMaxChange }: TempoControlProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);

  const handleMouseDown = (type: 'min' | 'max') => {
    if (!enabled) return;
    setIsDragging(type);
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const val = Math.round(60 + percent * (140 - 60));

      if (isDragging === 'min') {
        if (val <= max) onMinChange(val);
      } else {
        if (val >= min) onMaxChange(val);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, onMinChange, onMaxChange]);

  const minPos = ((min - 60) / (140 - 60)) * 100;
  const maxPos = ((max - 60) / (140 - 60)) * 100;
  const isValid = (max - min <= 10) && (min !== 60 || max !== 140);

  return (
    <div className={cn(
      "bg-zinc-900/40 rounded-3xl p-6 border border-white/5 transition-all",
      !enabled && "opacity-50 grayscale-[0.5]"
    )}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                id="tempo-toggle"
                checked={enabled}
                onChange={(e) => onEnabledChange(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-brand-orange bg-zinc-800 text-brand-orange focus:ring-brand-orange transition-all cursor-pointer appearance-none checked:bg-zinc-800 checked:border-brand-orange"
              />
              {enabled && (
                <Check className="w-3.5 h-3.5 text-brand-orange absolute left-0.5 pointer-events-none" strokeWidth={4} />
              )}
            </div>
            <label htmlFor="tempo-toggle" className="text-[18px] font-bold text-white cursor-pointer select-none">
              Tempo (BPM)
            </label>
          </div>
          
          <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/80 rounded-lg border border-white/10 shadow-inner">
            <input
              type="number"
              min={60}
              max={max}
              value={min}
              disabled={!enabled}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  const clamped = Math.max(60, Math.min(val, max));
                  onMinChange(clamped);
                }
              }}
              className="w-8 bg-transparent text-cyan-400 font-mono font-bold text-base focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-gray-600 font-bold text-sm">-</span>
            <input
              type="number"
              min={min}
              max={140}
              value={max}
              disabled={!enabled}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  const clamped = Math.max(min, Math.min(val, 140));
                  onMaxChange(clamped);
                }
              }}
              className="w-8 bg-transparent text-rose-400 font-mono font-bold text-base focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-gray-500 text-[9px] uppercase font-bold tracking-tighter">bpm</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 mb-4">
        <div 
          ref={sliderRef}
          className="relative h-2.5 bg-zinc-800 rounded-full cursor-pointer"
          onClick={(e) => {
            if (!enabled) return;
            const rect = sliderRef.current!.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            const val = Math.round(60 + percent * (140 - 60));
            
            // Snap to nearest handle but respect constraints
            if (Math.abs(val - min) < Math.abs(val - max)) {
              onMinChange(Math.min(val, max));
            } else {
              onMaxChange(Math.max(val, min));
            }
          }}
        >
          {/* Active Range Bar */}
          <div 
            className={cn(
              "absolute h-full rounded-full transition-colors",
              enabled ? (isValid ? "bg-brand-orange" : "bg-zinc-600") : "bg-zinc-700"
            )}
            style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }}
          />

          {/* Min Handle */}
          <div 
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('min'); }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center cursor-grab active:cursor-grabbing",
              enabled ? "bg-zinc-900 border-cyan-500 shadow-lg shadow-cyan-500/20 scale-110" : "bg-zinc-800 border-zinc-700 cursor-not-allowed",
              isDragging === 'min' && "scale-125 border-cyan-400"
            )}
            style={{ left: `${minPos}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          </div>

          {/* Max Handle */}
          <div 
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown('max'); }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center cursor-grab active:cursor-grabbing",
              enabled ? "bg-zinc-900 border-rose-500 shadow-lg shadow-rose-500/20 scale-110" : "bg-zinc-800 border-zinc-700 cursor-not-allowed",
              isDragging === 'max' && "scale-125 border-rose-400"
            )}
            style={{ left: `${maxPos}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          </div>
        </div>
        
        <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
          <span>60 BPM</span>
          <span>100 BPM</span>
          <span>140 BPM</span>
        </div>
      </div>

      {/* Status Guidance Text - Repositioned to Bottom Center */}
      <div className="flex justify-center mt-2">
        {enabled ? (
          isValid ? (
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
              <Check className="w-3.5 h-3.5" /> 템포 적용됨
            </span>
          ) : (
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {min === 60 && max === 140 ? "기본값 (랜덤 적용)" : "최소/최대 범위 10 이하일 때 적용"}
            </span>
          )
        ) : (
          <span className="text-gray-600 text-xs font-bold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/5">
            템포 기능 비활성화
          </span>
        )}
      </div>
    </div>
  );
}
