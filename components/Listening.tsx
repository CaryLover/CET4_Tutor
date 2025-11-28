import React, { useState, useRef, useEffect } from 'react';
import { fetchListeningScript, streamSpeech } from '../services/geminiService';
import { StreamAudioPlayer } from '../services/audioUtils';
import { ListeningExerciseData } from '../types';

const Listening: React.FC = () => {
  const [topic, setTopic] = useState('Campus Life');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ListeningExerciseData | null>(null);
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Audio Engine Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0); 
  const pausedAtRef = useRef<number>(0); 
  const animationFrameRef = useRef<number>(0);
  const isStreamingRef = useRef(false); // Ref to track streaming state inside animation loop
  const durationRef = useRef(0); // Ref to track duration inside animation loop to avoid stale closures
  
  // Stream Player for initial load
  const streamPlayerRef = useRef<StreamAudioPlayer | null>(null);

  // Initialize AudioContext
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass({ sampleRate: 24000 });
    audioContextRef.current = ctx;
    return () => {
      ctx.close();
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setData(null);
    setShowResults(false);
    setUserAnswers({});
    
    // Reset Audio State
    stopAudio(true); // Stop everything and reset
    audioBufferRef.current = null;
    setDuration(0);
    durationRef.current = 0;
    setCurrentTime(0);
    pausedAtRef.current = 0;
    
    // Clean up old stream player
    if (streamPlayerRef.current) {
        streamPlayerRef.current.stop();
        streamPlayerRef.current = null;
    }

    setIsStreaming(true);
    isStreamingRef.current = true;

    try {
      // 1. Fetch text script
      const scriptData = await fetchListeningScript(topic);
      setData(scriptData);
      setLoading(false); // Stop "Loading..." spinner, now we show "Streaming..." in audio bar

      // 2. Start Streaming Audio
      if (audioContextRef.current) {
        // CRITICAL: Ensure context is running, otherwise browser blocks audio
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        streamPlayerRef.current = new StreamAudioPlayer(audioContextRef.current, 24000);
        setIsPlaying(true); // Show play icon immediately
        
        // Start the UI timer loop immediately for streaming
        // NOTE: startTimeRef is just a placeholder here; the tick loop will use streamPlayer's start time
        startTimeRef.current = audioContextRef.current.currentTime; 
        requestAnimationFrame(tick);

        // ENABLE MULTI-SPEAKER DIALOGUE MODE
        for await (const chunk of streamSpeech(scriptData.script, true)) {
          if (streamPlayerRef.current) {
            streamPlayerRef.current.addChunk(chunk);
          }
        }
        
        // 3. Streaming done, build full buffer for Seeking functionality
        if (streamPlayerRef.current) {
            const fullBuffer = streamPlayerRef.current.getFullBuffer();
            audioBufferRef.current = fullBuffer;
            setDuration(fullBuffer.duration);
            durationRef.current = fullBuffer.duration;
            
            // Sync the startTimeRef to the stream's actual start time.
            // This ensures that when we switch from 'isStreaming' mode to 'normal' mode in the tick loop,
            // the calculation (now - startTimeRef) yields the correct continuous time.
            startTimeRef.current = streamPlayerRef.current.getStartTime();

            setIsStreaming(false);
            isStreamingRef.current = false;
        }
      }

    } catch (err) {
      console.error(err);
      alert('Generating listening exercise failed.');
      setLoading(false);
      setIsStreaming(false);
      isStreamingRef.current = false;
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const tick = () => {
      if (!audioContextRef.current) return;
      const now = audioContextRef.current.currentTime;
      
      let current = 0;

      // Logic for time calculation depends on mode
      // CRITICAL: Use ref because state might be stale in closure
      if (isStreamingRef.current && streamPlayerRef.current) {
         // During stream, use the player's start time
         const start = streamPlayerRef.current.getStartTime();
         // Only start counting if the player has actually started playing a chunk
         if (start > 0) {
             current = now - start;
         } else {
             current = 0;
         }
      } else {
         // During standard playback or after stream finishes
         current = now - startTimeRef.current;
      }

      // Clamp time
      if (current < 0) current = 0;
      
      // Stop condition
      // CRITICAL: Use durationRef.current to avoid stale closure (state 'duration' is often 0 here)
      if (durationRef.current > 0 && current >= durationRef.current && !isStreamingRef.current) {
         stopAudio(true);
         return;
      }

      setCurrentTime(current);
      animationFrameRef.current = requestAnimationFrame(tick);
  };

  const playAudio = (offset: number) => {
    const ctx = audioContextRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;

    // Ensure everything is stopped before starting new source
    stopAudio(false);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    // Start playback
    source.start(0, offset);
    sourceNodeRef.current = source;
    
    // State updates
    startTimeRef.current = ctx.currentTime - offset;
    pausedAtRef.current = offset;
    setIsPlaying(true);
    
    // Start UI loop
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const stopAudio = (resetToStart = false) => {
    // 1. Stop standard buffer source
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    
    // 2. Stop streaming source (the tail)
    if (streamPlayerRef.current) {
        streamPlayerRef.current.stop();
        // We don't nullify it because we might need data from it, 
        // but stopping it prevents ghost audio.
    }

    cancelAnimationFrame(animationFrameRef.current);
    setIsPlaying(false);
    
    if (resetToStart) {
      pausedAtRef.current = 0;
      setCurrentTime(0);
    } else {
       // Save pause position
       // If we were streaming, the currentTime state is already updated by tick()
       // so we just trust currentTime as the pause point.
       pausedAtRef.current = currentTime;
    }
  };

  const togglePlay = () => {
    // We allow toggling even if isStreaming is true, 
    // because user might want to pause the 'tail' of the stream.
    
    if (isPlaying) {
      stopAudio();
    } else {
      // If we are resuming, we should have a buffer by now OR we are in middle of stream?
      // If stream loop is running, toggling Play (Resume) is hard because loop is async.
      // But toggling Pause (Stop) is easy.
      
      // If user paused mid-stream, 'isStreaming' might still be true if the loop hasn't finished,
      // but we stopped the audio. 
      // Re-starting mid-stream is complex. 
      // Simple fix: If we are isStreaming, we only allow PAUSE. 
      // Resume only works if we have audioBuffer (i.e. we treat it as fully loaded).
      
      if (isStreaming && !audioBufferRef.current) {
          // If paused during initial load, we can't easily resume the stream logic 
          // without complex buffering logic.
          // For now, we will assume user waits for stream to finish buffering.
          return; 
      }
      
      playAudio(pausedAtRef.current);
    }
  };

  const seek = (seconds: number) => {
    if (isStreaming && !audioBufferRef.current) return; // Disable seek if we don't have buffer yet
    
    const bufDuration = duration || (audioBufferRef.current?.duration ?? 0);
    if (bufDuration === 0) return;

    let newTime = currentTime + seconds;
    if (newTime < 0) newTime = 0;
    if (newTime > bufDuration) newTime = bufDuration;

    setCurrentTime(newTime);
    pausedAtRef.current = newTime;

    if (isPlaying) {
      playAudio(newTime);
    }
  };

  const formatTime = (t: number) => {
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const [showScript, setShowScript] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  
  const topics = ['Campus Life', 'Technology', 'Environment', 'Job Interview'];

  const getScore = () => {
    if (!data) return { score: 0, percentage: 0 };
    let correct = 0;
    data.questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) correct++;
    });
    return {
      score: correct,
      percentage: Math.round((correct / data.questions.length) * 100)
    };
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 pb-20">
       <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">听力特训</h2>
        <p className="text-slate-500 text-sm mt-1">模拟真实语境，磨耳朵</p>
      </div>

      {/* Config Card */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">选择话题</label>
            <select 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
            >
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={loading || (isStreaming && !audioBufferRef.current)}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
        >
          {loading ? '生成文本中...' : isStreaming ? '正在接收音频流...' : '开始新练习'}
        </button>
      </div>

      {data && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Custom Player UI */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-400/20 relative overflow-hidden">
             {/* Background decoration */}
             <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500 rounded-full blur-2xl opacity-20"></div>
             <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>

             <div className="relative z-10 flex flex-col items-center gap-4">
               <div className="text-slate-300 text-xs font-mono tracking-widest uppercase">
                  {/* Status Text Logic */}
                  {loading ? 'Generating Script...' : 
                    (isStreaming && currentTime === 0) ? 'Receiving Audio...' : 
                    isStreaming ? 'Streaming...' : 'Now Playing'}
               </div>
               
               {/* Time Display */}
               <div className="text-3xl font-bold font-mono tracking-tight">
                 {loading ? (
                     <span className="animate-pulse">Loading...</span>
                 ) : (
                    <>
                    {formatTime(currentTime)} 
                    {/* Only show duration if buffer is ready (duration > 0) */}
                    {duration > 0 && <span className="text-slate-500 text-lg"> / {formatTime(duration)}</span>}
                    </>
                 )}
               </div>

               {/* Controls */}
               <div className="flex items-center gap-6 mt-2">
                 <button onClick={() => seek(-5)} disabled={!audioBufferRef.current} className="p-2 text-slate-400 hover:text-white transition-colors active:scale-90 disabled:opacity-30">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
                    <span className="sr-only">Rewind 5s</span>
                 </button>

                 <button
                    onClick={togglePlay}
                    // Disable Play button if we are streaming but NO buffer yet (initial load phase)
                    disabled={isStreaming && !audioBufferRef.current && !isPlaying} 
                    className={`w-16 h-16 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isPlaying ? (
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                 </button>

                 <button onClick={() => seek(5)} disabled={!audioBufferRef.current} className="p-2 text-slate-400 hover:text-white transition-colors active:scale-90 disabled:opacity-30">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                    <span className="sr-only">Forward 5s</span>
                 </button>
               </div>
             </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {data.questions.map((q) => (
              <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-4 text-base">{q.id}. {q.question}</h4>
                <div className="space-y-2.5">
                  {q.options.map((opt, idx) => {
                    let btnClass = "w-full text-left p-3.5 rounded-xl border text-sm transition-all ";
                    
                    if (showResults) {
                      if (idx === q.correctAnswer) btnClass += "bg-green-100 border-green-500 text-green-800 font-bold";
                      else if (userAnswers[q.id] === idx) btnClass += "bg-red-50 border-red-300 text-red-800";
                      else btnClass += "bg-white border-slate-100 opacity-50";
                    } else {
                      if (userAnswers[q.id] === idx) btnClass += "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm";
                      else btnClass += "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => !showResults && setUserAnswers(prev => ({ ...prev, [q.id]: idx }))}
                        className={btnClass}
                      >
                        <span className="inline-block w-6 font-semibold opacity-70">{String.fromCharCode(65 + idx)}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Actions & Results */}
          <div className="space-y-4">
            <div className="flex gap-3 pt-2">
               <button 
                onClick={() => setShowScript(!showScript)}
                className="flex-1 py-3 text-slate-500 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                {showScript ? '收起原文' : '查看原文'}
              </button>
              <button 
                onClick={() => setShowResults(true)}
                disabled={showResults}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200 transition-transform active:scale-95"
              >
                提交答案
              </button>
            </div>

            {/* Result Banner - Moved Below Submit Button */}
            {showResults && (
               <div className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white p-5 rounded-2xl shadow-lg flex justify-between items-center animate-fade-in-up">
                 <div>
                   <p className="text-xs font-bold uppercase tracking-wider opacity-80">本次成绩</p>
                   <p className="text-2xl font-bold">答对 {getScore().score}/{data.questions.length}</p>
                 </div>
                 <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                   <span className="text-3xl font-extrabold">{getScore().percentage}%</span>
                 </div>
               </div>
            )}
          </div>

          {showScript && (
            <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 text-yellow-900 text-sm leading-relaxed animate-fade-in-up">
              <h4 className="font-bold mb-2 text-xs uppercase tracking-wider text-yellow-600">Audio Script</h4>
              {(() => {
                  let cleanScript = data.script;
                  
                  // Basic formatting check: Ensure newlines before speakers if missing
                  // Looks for sentence end followed by "Name:"
                  // Heuristic: if very few newlines, try to add them
                  if (cleanScript.split('\n').length < 3) {
                     cleanScript = cleanScript.replace(/([.!?])\s+([A-Z][a-zA-Z\s]+):/g, "$1\n$2:");
                  }

                  return cleanScript.split('\n').map((line, idx) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      
                      // Match "Name:" at start
                      const match = trimmed.match(/^([A-Za-z0-9\s\.]+):(.*)/);
                      if (match && match[1].length < 20) {
                           return (
                             <p key={idx} className="mb-3">
                               <strong className="text-slate-900">{match[1]}:</strong>
                               <span>{match[2]}</span>
                             </p>
                           );
                      }
                      return <p key={idx} className="mb-3">{trimmed}</p>;
                  });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Listening;