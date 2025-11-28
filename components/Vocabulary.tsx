import React, { useState, useRef, useEffect } from 'react';
import { fetchVocabulary, streamSpeech } from '../services/geminiService';
import { StreamAudioPlayer } from '../services/audioUtils';
import { VocabularyData } from '../types';

const Vocabulary: React.FC = () => {
  const [inputWord, setInputWord] = useState('');
  const [data, setData] = useState<VocabularyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRead, setAutoRead] = useState(false); // Default to auto-read disabled
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  // Keep track of recently shown random words to avoid repetition
  const recentWordsRef = useRef<string[]>([]);
  // Audio context for playing words
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Browser native TTS for instant word pronunciation
  const playNative = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const playText = async (text: string) => {
    try {
      setAudioPlaying(true);
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      // CRITICAL: Resume context to prevent browser blocking
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const player = new StreamAudioPlayer(ctx, 24000);
      
      // Consume the stream with isDialogue = false
      for await (const chunk of streamSpeech(text, false)) {
        player.addChunk(chunk);
      }
      
      // In a real stream, we don't have an easy "onEnded" for the whole sequence from the context perspective
      // unless we track the schedule. For short vocab words, we can just reset state after a short delay
      // or calculate total duration. 
      // For simplicity in Vocabulary, we just unset playing state after a bit or when loop finishes.
      // Since it's gapless, playback finishes when ctx.currentTime > nextStartTime.
      
      // Simple timeout fallback to reset state, as exact tracking requires the player to emit events.
      // But since user can click other buttons, we unset loading immediately after stream generation is done.
      setAudioPlaying(false);

    } catch (e) {
      console.error("Failed to play audio", e);
      setAudioPlaying(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, overrideWord?: string) => {
    if (e) e.preventDefault();
    
    // Use override word if provided (e.g. from Random button), otherwise use input state
    const wordToSearch = overrideWord || inputWord;
    
    if (!wordToSearch.trim()) return;
    
    // If override is provided, sync the input box
    if (overrideWord) {
      setInputWord(overrideWord);
    }
    
    setLoading(true);
    setError('');
    setData(null);

    try {
      const result = await fetchVocabulary(wordToSearch);
      setData(result);
      
      if (autoRead) {
         // Read Word, Definition, and Example
         const textToRead = `${result.word}. ${result.definition}. Example: ${result.exampleSentence}`;
         await playText(textToRead);
      }
    } catch (err) {
      setError('无法获取单词详情，请稍后再试。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRandomWord = () => {
     const words = [
       "abandon", "benefit", "candidate", "debate", "efficient", "factor", "gap", "habit", "identify", "jealous",
       "keen", "label", "maintain", "native", "obscure", "pace", "qualify", "radical", "sacrifice", "tackle",
       "ultimate", "vacant", "wages", "yield", "zone", "abroad", "background", "calculate", "deadline", "editor"
     ];
     
     let random = "";
     let attempts = 0;
     
     // Find a word that hasn't been shown in the last 5 turns
     do {
       random = words[Math.floor(Math.random() * words.length)];
       attempts++;
     } while (recentWordsRef.current.includes(random) && attempts < 10);

     // Update history
     recentWordsRef.current = [random, ...recentWordsRef.current].slice(0, 5);
     
     // Update input but DO NOT trigger search/analysis automatically
     setInputWord(random);
     // Clear previous data so the UI doesn't show the old word's card
     setData(null); 
     
     // If auto-read is on, play the word using native browser TTS
     if (autoRead) {
         playNative(random);
     }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8 pb-24">
      <div className="text-center pt-4 relative">
        <h2 className="text-2xl font-bold text-slate-800">单词助记大师</h2>
        <p className="text-slate-400 text-sm mt-1">AI 赋能，让记忆更简单</p>
        
        {/* Toggle Switch - Made Larger */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 sm:top-4 sm:translate-y-0">
          <button 
             onClick={() => setAutoRead(!autoRead)}
             className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm active:scale-95 ${autoRead ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'}`}
          >
            {autoRead ? '🔊 朗读开启' : '🔇 朗读关闭'}
          </button>
        </div>
      </div>

      {/* Control Card Container */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-5">
        {/* Input Box with 3D Effect */}
        <div className="relative group">
          <input
            type="text"
            value={inputWord}
            onChange={(e) => setInputWord(e.target.value)}
            placeholder="输入 CET-4 单词..."
            className="w-full h-14 pl-5 pr-20 rounded-2xl bg-slate-50 text-slate-800 text-lg border-none shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] focus:ring-0 outline-none transition-all placeholder:text-sm placeholder:text-slate-400"
          />
        </div>

        {/* Buttons separated to avoid miss-clicks */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={getRandomWord}
            disabled={audioPlaying || loading}
            className="flex-1 py-3 bg-white text-slate-600 font-medium rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
             随机一词
          </button>
          <button
            type="button"
            onClick={(e) => handleSearch(e)}
            disabled={loading || !inputWord || audioPlaying}
            className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
          >
            {loading ? 'Thinking...' : audioPlaying ? 'Playing...' : '立即解析'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-500 rounded-xl text-sm text-center border border-red-100 animate-pulse">
          {error}
        </div>
      )}

      {data && (
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-50 animate-fade-in-up">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-wide mb-1">{data.word}</h1>
            <div className="flex items-center gap-3">
              <span className="text-lg text-slate-500 font-serif italic">/{data.phonetic}/</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">CET-4</span>
              <button onClick={() => playNative(data.word)} className="p-1 text-blue-500 hover:bg-blue-50 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
              </button>
            </div>
          </div>
          
          <div className="text-center mb-6">
             <span className="text-xl font-medium text-slate-700 block mb-1">
              {data.chineseTranslation}
            </span>
            <span className="text-sm text-slate-400">
              {data.definition}
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl">💡</div>
              <h3 className="text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                Memory Aid
              </h3>
              <p className="text-amber-900 font-medium leading-relaxed">
                {data.mnemonic}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <h3 className="text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
                Example
              </h3>
              <p className="text-slate-700 italic text-sm">
                "{data.exampleSentence}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vocabulary;