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
  Trash2,
  History,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GENRES, MOODS, THEMES } from './constants';
import { CategoryItem, SongResult, LyricsLength, DrumStyle } from './types';
import { generateSong } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [lyricsLength, setLyricsLength] = useState<LyricsLength>('normal');
  const [drumStyle, setDrumStyle] = useState<DrumStyle>('none');
  const [pinnedGenres, setPinnedGenres] = useState<string[]>([]);
  const [pinnedMoods, setPinnedMoods] = useState<string[]>([]);
  const [pinnedThemes, setPinnedThemes] = useState<string[]>([]);
  const [tempoEnabled, setTempoEnabled] = useState(false);
  const [minBPM, setMinBPM] = useState(70);
  const [maxBPM, setMaxBPM] = useState(90);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SongResult | null>(null);
  const [history, setHistory] = useState<SongResult[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<CategoryItem | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('soridraw_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        if (parsed.length > 0) {
          setResult(parsed[0]);
          setHistoryIndex(0);
        }
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('soridraw_history', JSON.stringify(history));
    }
  }, [history]);

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
        const range = Math.floor(Math.random() * 11); // 0 to 10
        const newMin = Math.max(40, baseBPM - Math.floor(range / 2));
        const newMax = Math.min(160, newMin + range);
        setMinBPM(newMin);
        setMaxBPM(newMax);
      } else {
        setMinBPM(baseBPM);
        setMaxBPM(baseBPM);
      }
    }
  };

  const handleGenerate = async () => {
    if (isGenerating) {
      // Cancel logic
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

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

      const tempoInfo = tempoEnabled && (minBPM !== 40 || maxBPM !== 160) && (maxBPM - minBPM <= 20)
        ? (minBPM === maxBPM ? `Exactly ${minBPM} BPM` : `Between ${minBPM} and ${maxBPM} BPM`)
        : undefined;

      const song = await generateSong(
        finalGenres.map(id => GENRES.find(g => g.id === id)?.label || id),
        finalMoods.map(id => MOODS.find(m => m.id === id)?.label || id),
        finalThemes.map(id => THEMES.find(t => t.id === id)?.label || id),
        userInput,
        lyricsLength,
        drumStyle,
        tempoInfo
      );

      // Check if aborted before updating state
      if (abortControllerRef.current?.signal.aborted) return;

      const newResult = {
        ...song,
        randomKeywords
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev].slice(0, 5)); // Keep last 5
      setHistoryIndex(0);
      setIsPromptExpanded(false);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation cancelled');
      } else {
        console.error(error);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const navigateHistory = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setResult(history[newIndex]);
      setIsPromptExpanded(false);
    } else if (direction === 'next' && historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setResult(history[newIndex]);
      setIsPromptExpanded(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const keywords = [
      `[Genres] ${result.appliedKeywords.genre.join(', ')}`,
      `[Moods] ${result.appliedKeywords.mood.join(', ')}`,
      `[Themes] ${result.appliedKeywords.theme.join(', ')}`,
      result.appliedKeywords.tempo ? `[Tempo] ${result.appliedKeywords.tempo}` : ''
    ].filter(Boolean).join('\n');

    const text = `
${keywords}

${result.title}

[Lyrics - English]
${result.lyrics.english}

[Lyrics - Korean]
${result.lyrics.korean}

[Music Prompt]
${result.prompt}
    `.trim();
    copyToClipboard(text, 'all');
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
            description="곡의 전반적인 음악 스타일을 결정합니다. (프롬프트에 영향)"
            items={GENRES} 
            selected={selectedGenres} 
            pinned={pinnedGenres}
            onToggle={(id) => toggleSelection(id, 'genre')}
            onTogglePin={(id) => togglePin(id, 'genre')}
            onClear={() => clearCategory('genre')}
            onUnpinAll={() => unpinAll('genre')}
            onHover={setHoveredItem}
            hoveredItem={hoveredItem}
          />
          <CategorySection 
            title="분위기" 
            description="곡의 멜로디와 감정선을 결정합니다. (프롬프트에 영향)"
            items={MOODS} 
            selected={selectedMoods} 
            pinned={pinnedMoods}
            onToggle={(id) => toggleSelection(id, 'mood')}
            onTogglePin={(id) => togglePin(id, 'mood')}
            onClear={() => clearCategory('mood')}
            onUnpinAll={() => unpinAll('mood')}
            onHover={setHoveredItem}
            hoveredItem={hoveredItem}
          />
          <CategorySection 
            title="주제" 
            description="가사의 내용과 핵심 메시지를 결정합니다. (가사에 영향)"
            items={THEMES} 
            selected={selectedThemes} 
            pinned={pinnedThemes}
            onToggle={(id) => toggleSelection(id, 'theme')}
            onTogglePin={(id) => togglePin(id, 'theme')}
            onClear={() => clearCategory('theme')}
            onUnpinAll={() => unpinAll('theme')}
            onHover={setHoveredItem}
            hoveredItem={hoveredItem}
          />
        </div>

        {/* Lyrics Length & Drum Style Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <LyricsLengthControl 
            value={lyricsLength}
            onChange={setLyricsLength}
          />
          <DrumStyleControl 
            lyricsLength={lyricsLength}
            value={drumStyle}
            onChange={setDrumStyle}
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
              <div className="relative">
                <button
                  onClick={applyRandom}
                  onMouseEnter={() => setHoveredItem({ id: 'random', label: '랜덤 선택', description: '키워드를 무작위로 조합합니다.' })}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="p-3 rounded-xl bg-brand-orange text-white hover:brightness-110 transition-all shadow-lg shadow-brand-orange/20"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                {hoveredItem?.id === 'random' && (
                  <div className="absolute bottom-full right-0 mb-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl w-48 pointer-events-none">
                    <p className="text-[11px] text-gray-300 leading-snug">키워드를 무작위로 조합합니다.</p>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={clearAll}
                  onMouseEnter={() => setHoveredItem({ id: 'clear-all', label: 'Clear all', description: '핀을 제외한 모든 선택 삭제' })}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="px-4 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white transition-all text-sm font-bold"
                >
                  Clear all
                </button>
                {hoveredItem?.id === 'clear-all' && (
                  <div className="absolute bottom-full right-0 mb-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl w-48 pointer-events-none">
                    <p className="text-[11px] text-gray-300 leading-snug">핀을 제외한 모든 선택 삭제</p>
                  </div>
                )}
              </div>
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
            className={cn(
              "w-full py-5 rounded-2xl text-white font-bold text-xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98]",
              isGenerating 
                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" 
                : "music-waves shadow-brand-orange/20 hover:brightness-110"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                작곡 취소하기
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
              {/* History Navigation & Copy All */}
              <div className="flex items-center justify-between bg-zinc-900/30 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-4">
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg border border-white/10 cursor-help relative group/hist"
                    onMouseEnter={() => setHoveredItem({ id: 'history-info', label: 'History', description: '최근 생성한 곡을 최대 5곡까지 다시 볼 수 있습니다.' })}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <History className="w-4 h-4 text-brand-orange" />
                    <span className="text-xs font-bold text-gray-400">History</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigateHistory('prev')}
                      disabled={historyIndex >= history.length - 1}
                      onMouseEnter={() => setHoveredItem({ id: 'hist-prev', label: '이전 곡', description: '이전에 생성한 곡으로 이동합니다.' })}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="p-2 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-mono text-gray-500">
                      {historyIndex + 1} / {history.length}
                    </span>
                    <button
                      onClick={() => navigateHistory('next')}
                      disabled={historyIndex <= 0}
                      onMouseEnter={() => setHoveredItem({ id: 'hist-next', label: '다음 곡', description: '다음에 생성한 곡으로 이동합니다.' })}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="p-2 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={copyAll}
                  onMouseEnter={() => setHoveredItem({ id: 'copy-all', label: '전체 복사', description: '키워드, 제목, 가사, 프롬프트를 한 번에 복사합니다.' })}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange text-sm font-bold transition-all border border-brand-orange/20"
                >
                  {copiedType === 'all' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied All!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy All Details
                    </>
                  )}
                </button>
              </div>

              {/* Applied Keywords After Generation */}
              <div className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-orange" />
                    적용된 키워드 (Applied Keywords)
                  </h3>
                  <button
                    onClick={() => {
                      const kwText = [
                        `[Genres] ${result.appliedKeywords.genre.join(', ')}`,
                        `[Moods] ${result.appliedKeywords.mood.join(', ')}`,
                        `[Themes] ${result.appliedKeywords.theme.join(', ')}`,
                        result.appliedKeywords.tempo ? `[Tempo] ${result.appliedKeywords.tempo}` : ''
                      ].filter(Boolean).join('\n');
                      copyToClipboard(kwText, 'keywords');
                    }}
                    onMouseEnter={() => setHoveredItem({ id: 'copy-keywords', label: '키워드 복사', description: '적용된 모든 키워드를 복사합니다.' })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                  >
                    {copiedType === 'keywords' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(['genre', 'mood', 'theme'] as const).map((cat) => (
                    <div key={cat} className="space-y-1.5 group/cat">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{cat}</p>
                        <button
                          onClick={() => copyToClipboard(result.appliedKeywords[cat].join(', '), `kw-${cat}`)}
                          className="opacity-0 group-hover/cat:opacity-100 transition-opacity p-1 rounded hover:bg-white/5 text-gray-600 hover:text-gray-400"
                        >
                          {copiedType === `kw-${cat}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.appliedKeywords[cat].map((kw, idx) => {
                          const isRandom = result.randomKeywords?.includes(kw);
                          return (
                            <span 
                              key={idx} 
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[11px] transition-all",
                                isRandom 
                                  ? "bg-brand-orange/20 text-brand-orange font-bold border border-brand-orange/30" 
                                  : "bg-zinc-800 text-gray-400 border border-white/5"
                              )}
                            >
                              {kw}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {result.appliedKeywords.tempo && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">tempo</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-zinc-800 text-gray-400 border border-white/5">
                          {result.appliedKeywords.tempo}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Card */}
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  <button
                    onClick={() => copyToClipboard(result.title, 'title')}
                    onMouseEnter={() => setHoveredItem({ id: 'copy-title', label: '제목 복사', description: '곡의 제목을 복사합니다.' })}
                    onMouseLeave={() => setHoveredItem(null)}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* English Lyrics Section */}
                <div className="aspect-square bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden flex flex-col group/lyrics">
                  <div className="p-5 border-b border-white/5 flex items-center justify-between bg-zinc-800/30">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                      <Music className="w-4 h-4 text-brand-orange" />
                      English Lyrics
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.lyrics.english, 'lyrics-en')}
                      onMouseEnter={() => setHoveredItem({ id: 'copy-lyrics-en', label: '영어 가사 복사', description: '영어 가사 전체를 복사합니다.' })}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      {copiedType === 'lyrics-en' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center">
                    <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed text-[13px] md:text-sm w-full text-center">
                      {result.lyrics.english}
                    </pre>
                  </div>
                </div>

                {/* Korean Lyrics Section */}
                <div className="aspect-square bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden flex flex-col group/lyrics">
                  <div className="p-5 border-b border-white/5 flex items-center justify-between bg-zinc-800/30">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                      <Music className="w-4 h-4 text-brand-orange" />
                      Korean Lyrics
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.lyrics.korean, 'lyrics-ko')}
                      onMouseEnter={() => setHoveredItem({ id: 'copy-lyrics-ko', label: '한국어 가사 복사', description: '한국어 가사 전체를 복사합니다.' })}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      {copiedType === 'lyrics-ko' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center">
                    <pre className="whitespace-pre-wrap font-sans text-gray-400 leading-relaxed text-[13px] md:text-sm w-full text-center">
                      {result.lyrics.korean}
                    </pre>
                  </div>
                </div>

                {/* Prompt Section */}
                <div className="bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden flex flex-col lg:aspect-square">
                  <div className="p-5 border-b border-white/5 flex items-center justify-between bg-zinc-800/30">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-brand-orange" />
                      음악 프롬프트 (Prompt)
                    </h3>
                    <button
                      onClick={() => copyToClipboard(result.prompt, 'prompt')}
                      onMouseEnter={() => setHoveredItem({ id: 'copy-prompt', label: '프롬프트 복사', description: '음악 생성 프롬프트를 복사합니다.' })}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      {copiedType === 'prompt' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-8 flex-1 flex flex-col justify-center">
                    <div className="bg-black/30 rounded-2xl p-6 border border-white/5 relative">
                      <p className={cn(
                        "text-gray-400 leading-relaxed text-sm font-mono transition-all duration-300",
                        !isPromptExpanded && "line-clamp-4 lg:line-clamp-6"
                      )}>
                        {result.prompt}
                      </p>
                      <button
                        onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                        onMouseEnter={() => setHoveredItem({ id: 'expand-prompt', label: isPromptExpanded ? '접기' : '전체 보기', description: isPromptExpanded ? '프롬프트를 줄입니다.' : '프롬프트 전체 내용을 확인합니다.' })}
                        onMouseLeave={() => setHoveredItem(null)}
                        className="mt-4 flex items-center gap-2 text-xs font-bold text-brand-orange hover:text-orange-400 transition-colors"
                      >
                        {isPromptExpanded ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                        {isPromptExpanded ? 'Show Less' : 'Show Full Prompt'}
                      </button>
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
  description: string;
  items: CategoryItem[];
  selected: string[];
  pinned: string[];
  onToggle: (id: string) => void;
  onTogglePin: (id: string) => void;
  onClear: () => void;
  onUnpinAll: () => void;
  onHover: (item: CategoryItem | null) => void;
  hoveredItem: CategoryItem | null;
}

function CategorySection({ 
  title, 
  description,
  items, 
  selected, 
  pinned,
  onToggle, 
  onTogglePin,
  onClear, 
  onUnpinAll,
  onHover,
  hoveredItem
}: CategorySectionProps) {
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 flex flex-col h-full relative group">
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <h3 
            onMouseEnter={() => setShowTitleTooltip(true)}
            onMouseLeave={() => setShowTitleTooltip(false)}
            className="text-[20px] font-bold text-white flex items-center gap-2 cursor-help"
          >
            <span className="w-1.5 h-6 bg-brand-orange rounded-full" />
            {title}
            <span className="text-[14px] font-normal text-gray-500 ml-2">({selected.length}/6)</span>
          </h3>
          <AnimatePresence>
            {showTitleTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl w-48 pointer-events-none"
              >
                <p className="text-[11px] text-gray-300 leading-snug">{description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
            onMouseEnter={() => onHover({ id: 'clear', label: 'Clear all', description: '핀을 제외한 모든 선택 삭제' })}
            onMouseLeave={() => onHover(null)}
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className={cn(
        "flex flex-wrap gap-2 transition-all duration-500 overflow-hidden",
        !isExpanded ? "max-h-[120px]" : "max-h-[1000px]"
      )}>
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
              
              {/* Floating Description Tooltip */}
              <AnimatePresence>
                {hoveredItem?.id === item.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl w-40 pointer-events-none"
                  >
                    <p className="text-[10px] text-gray-300 text-center leading-tight">{item.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              
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

      {/* Expand/Collapse Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-brand-orange transition-all border border-white/5 hover:border-brand-orange/30 group/expand"
        >
          <span className="text-[11px] font-bold uppercase tracking-widest">{isExpanded ? '접기' : '펼쳐보기'}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-brand-orange group-hover/expand:scale-125 transition-transform" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-orange group-hover/expand:scale-125 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
}

interface LyricsLengthControlProps {
  value: LyricsLength;
  onChange: (val: LyricsLength) => void;
}

function LyricsLengthControl({ value, onChange }: LyricsLengthControlProps) {
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const options = [
    { id: 'normal', label: '기본', description: '일반적인 팝 스타일의 가사 분량' },
    { id: 'short', label: '짧게', description: '함축적이고 간결한 가사 (째즈/발라드 추천)' },
    { id: 'long', label: '길게', description: '상세하고 많은 양의 가사 (랩/힙합/댄스 추천)' }
  ];

  return (
    <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5">
      <div className="relative mb-6">
        <h3 
          onMouseEnter={() => setShowTitleTooltip(true)}
          onMouseLeave={() => setShowTitleTooltip(false)}
          className="text-[18px] font-bold text-white flex items-center gap-2 cursor-help"
        >
          <span className="w-1.5 h-5 bg-brand-orange rounded-full" />
          가사 길이 (Lyrics Length)
        </h3>
        <AnimatePresence>
          {showTitleTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl w-48 pointer-events-none"
            >
              <p className="text-[11px] text-gray-300 leading-snug">가사의 전체적인 분량을 조절합니다.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={cn(
        "transition-all duration-500 overflow-hidden",
        !isExpanded ? "max-h-[60px]" : "max-h-[200px]"
      )}>
        <div className="flex gap-2">
          {options.map((opt) => (
            <div key={opt.id} className="relative flex-1">
              <button
                onClick={() => onChange(opt.id as LyricsLength)}
                onMouseEnter={() => setHoveredOption(opt.id)}
                onMouseLeave={() => setHoveredOption(null)}
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-bold transition-all border",
                  value === opt.id
                    ? "bg-brand-orange border-orange-400 text-white shadow-lg shadow-brand-orange/20"
                    : "bg-[#19191b] border-white/5 text-gray-500 hover:border-brand-orange/30 hover:text-gray-200"
                )}
              >
                {opt.label}
              </button>
              <AnimatePresence>
                {hoveredOption === opt.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl pointer-events-none"
                  >
                    <p className="text-[10px] text-gray-300 text-center">{opt.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-brand-orange transition-all border border-white/5 hover:border-brand-orange/30 group/expand"
        >
          <span className="text-[11px] font-bold uppercase tracking-widest">{isExpanded ? '접기' : '펼쳐보기'}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-brand-orange group-hover/expand:scale-125 transition-transform" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-orange group-hover/expand:scale-125 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
}

interface DrumStyleControlProps {
  lyricsLength: LyricsLength;
  value: DrumStyle;
  onChange: (val: DrumStyle) => void;
}

function DrumStyleControl({ lyricsLength, value, onChange }: DrumStyleControlProps) {
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const options = [
    { id: 'none', label: '기본', description: '표준 드럼 비트를 사용합니다.', recommendation: '모든 가사 길이에 적합' },
    { id: 'half-time', label: 'Half Time', description: '드럼 비트를 절반 속도로 연주하여 여유로운 느낌을 줍니다.', recommendation: '빠른템포' },
    { id: 'double-time', label: 'Double Time', description: '드럼 비트를 2배 빠르게 연주하여 긴박감을 줍니다.', recommendation: '느린템포' }
  ];

  return (
    <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5">
      <div className="relative mb-6">
        <h3 
          onMouseEnter={() => setShowTitleTooltip(true)}
          onMouseLeave={() => setShowTitleTooltip(false)}
          className="text-[18px] font-bold text-white flex items-center gap-2 cursor-help"
        >
          <span className="w-1.5 h-5 bg-brand-orange rounded-full" />
          드럼 스타일 (Drum Style)
        </h3>
        <AnimatePresence>
          {showTitleTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl w-48 pointer-events-none"
            >
              <p className="text-[11px] text-gray-300 leading-snug">드럼의 연주 방식을 선택합니다.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-2">
        {options.map((opt) => (
          <div key={opt.id} className="relative flex-1">
            <button
              onClick={() => onChange(opt.id as DrumStyle)}
              onMouseEnter={() => setHoveredOption(opt.id)}
              onMouseLeave={() => setHoveredOption(null)}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-bold transition-all border",
                value === opt.id
                  ? "bg-brand-orange border-orange-400 text-white shadow-lg shadow-brand-orange/20"
                  : "bg-[#19191b] border-white/5 text-gray-500 hover:border-brand-orange/30 hover:text-gray-200"
              )}
            >
              {opt.label}
            </button>
            <AnimatePresence>
              {hoveredOption === opt.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl pointer-events-none"
                >
                  <p className="text-[10px] text-gray-300 text-center mb-1">{opt.description}</p>
                  <p className="text-[9px] text-brand-orange text-center font-bold">추천: {opt.recommendation}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
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
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);

  const handleStart = (type: 'min' | 'max') => {
    if (!enabled) return;
    setIsDragging(type);
    document.body.style.userSelect = 'none';
    document.body.style.overflow = 'hidden';
  };

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const val = Math.round(40 + percent * (160 - 40));

      if (isDragging === 'min') {
        if (val <= max) onMinChange(val);
      } else {
        if (val >= min) onMaxChange(val);
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsDragging(null);
      document.body.style.userSelect = '';
      document.body.style.overflow = '';
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, min, max, onMinChange, onMaxChange]);

  const minPos = ((min - 40) / (160 - 40)) * 100;
  const maxPos = ((max - 40) / (160 - 40)) * 100;
  const isValid = (max - min <= 20) && (min !== 40 || max !== 160);

  return (
    <div className={cn(
      "bg-zinc-900/40 rounded-3xl px-6 py-4 border border-white/5 transition-all",
      !enabled && "opacity-50 grayscale-[0.5]"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex items-center gap-3">
          <h3 
            onMouseEnter={() => setShowTitleTooltip(true)}
            onMouseLeave={() => setShowTitleTooltip(false)}
            className="text-[18px] font-bold text-white flex items-center gap-2 cursor-help"
          >
            <span className="w-1.5 h-5 bg-brand-orange rounded-full" />
            템포 (Tempo BPM)
          </h3>
          <div className="relative flex items-center justify-center">
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
          <AnimatePresence>
            {showTitleTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 z-50 px-3 py-2 rounded-xl bg-zinc-800 border border-brand-orange/30 shadow-2xl w-48 pointer-events-none"
              >
                <p className="text-[11px] text-gray-300 leading-snug">곡의 빠르기를 BPM 단위로 조절합니다.</p>
              </motion.div>
            )}
          </AnimatePresence>
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
                const clamped = Math.max(40, Math.min(val, max));
                onMinChange(clamped);
              }
            }}
            className="w-8 bg-transparent text-cyan-400 font-mono font-bold text-base focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-gray-600 font-bold text-sm">-</span>
          <input
            type="number"
            min={min}
            max={160}
            value={max}
            disabled={!enabled}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) {
                const clamped = Math.max(min, Math.min(val, 160));
                onMaxChange(clamped);
              }
            }}
            className="w-8 bg-transparent text-rose-400 font-mono font-bold text-base focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-gray-500 text-[9px] uppercase font-bold tracking-tighter">bpm</span>
        </div>
      </div>

      <div className="px-4 py-2">
        <div 
          ref={sliderRef}
          className="relative h-2 bg-zinc-800 rounded-full cursor-pointer"
          onClick={(e) => {
            if (!enabled) return;
            const rect = sliderRef.current!.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            const val = Math.round(40 + percent * (160 - 40));
            
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
            onMouseDown={(e) => { e.stopPropagation(); handleStart('min'); }}
            onTouchStart={(e) => { e.stopPropagation(); handleStart('min'); }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center cursor-grab active:cursor-grabbing touch-none",
              enabled ? "bg-zinc-900 border-cyan-500 shadow-lg shadow-cyan-500/20 scale-110" : "bg-zinc-800 border-zinc-700 cursor-not-allowed",
              isDragging === 'min' && "scale-125 border-cyan-400"
            )}
            style={{ left: `${minPos}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          </div>

          {/* Max Handle */}
          <div 
            onMouseDown={(e) => { e.stopPropagation(); handleStart('max'); }}
            onTouchStart={(e) => { e.stopPropagation(); handleStart('max'); }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center cursor-grab active:cursor-grabbing touch-none",
              enabled ? "bg-zinc-900 border-rose-500 shadow-lg shadow-rose-500/20 scale-110" : "bg-zinc-800 border-zinc-700 cursor-not-allowed",
              isDragging === 'max' && "scale-125 border-rose-400"
            )}
            style={{ left: `${maxPos}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          </div>
        </div>
        
        <div className="flex justify-between mt-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
          <span>40 BPM</span>
          <span>100 BPM</span>
          <span>160 BPM</span>
        </div>
      </div>

      {/* Status Guidance Text - Repositioned to Bottom Center */}
      <div className="flex justify-center mt-2">
        {enabled ? (
          isValid ? (
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-400/10 px-3 py-0.5 rounded-full border border-emerald-400/20">
              <Check className="w-3 h-3" /> 템포 적용됨
            </span>
          ) : (
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider bg-white/5 px-3 py-0.5 rounded-full border border-white/5">
              {min === 40 && max === 160 ? "기본값 (랜덤 적용)" : "범위 20 이하일 때 적용"}
            </span>
          )
        ) : (
          <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider bg-white/5 px-3 py-0.5 rounded-full border border-white/5">
            템포 기능 비활성화
          </span>
        )}
      </div>
    </div>
  );
}
