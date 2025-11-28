import React, { useState } from 'react';
import { fetchReadingExercise } from '../services/geminiService';
import { ReadingExerciseData } from '../types';

const Reading: React.FC = () => {
  const [topic, setTopic] = useState('Cultural Differences');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReadingExerciseData | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setData(null);
    setUserAnswers({});
    setShowResults(false);
    try {
      const result = await fetchReadingExercise(topic);
      setData(result);
    } catch (e) {
      console.error(e);
      alert('Failed to load reading exercise.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (qId: number, optionIdx: number) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

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

  const topics = ['Cultural Differences', 'Science', 'History', 'Education', 'Economy'];

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 pb-20">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">阅读理解</h2>
        <p className="text-slate-500 text-sm mt-1">深度阅读模拟，提升理解力</p>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">选择主题</label>
          <select 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          {loading ? '生成文章中...' : '开始阅读练习'}
        </button>
      </div>

      {/* Content Area */}
      <div>
        {loading && (
           <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
             <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
             <p className="text-sm">AI 正在撰写文章...</p>
           </div>
        )}

        {data && (
          <div className="space-y-8 animate-fade-in">
            {/* Passage */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h1 className="text-xl font-bold text-slate-900 mb-4 leading-snug">{data.title}</h1>
              <div className="prose prose-slate prose-sm sm:prose-base text-slate-700 leading-relaxed">
                {data.passage.split('\n').map((para, i) => (
                  <p key={i} className="mb-4 last:mb-0 indent-8 text-justify">{para}</p>
                ))}
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide border-b border-slate-200 pb-2">Comprehension Check</h3>
              {data.questions.map((q) => (
                <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <p className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">{q.id}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, idx) => {
                      let style = "block w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ";
                      
                      if (showResults) {
                         if (idx === q.correctAnswer) style += "bg-green-100 border-green-500 text-green-800 font-bold";
                         else if (userAnswers[q.id] === idx) style += "bg-red-50 border-red-300 text-red-700 opacity-60";
                         else style += "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
                      } else {
                        if (userAnswers[q.id] === idx) style += "bg-blue-50 border-blue-500 text-blue-700 font-medium shadow-sm";
                        else style += "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerSelect(q.id, idx)}
                          className={style}
                        >
                          <span className="font-semibold mr-2 opacity-70">{String.fromCharCode(65 + idx)}.</span> {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Block */}
                  {showResults && q.explanation && (
                    <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl text-sm leading-relaxed border border-indigo-100 animate-fade-in-up">
                      <span className="font-bold text-indigo-600 block mb-1">✅ 解析</span>
                      <span className="text-slate-700">{q.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Button */}
             <button 
              onClick={() => setShowResults(true)}
              disabled={showResults}
              className="w-full py-4 bg-green-600 text-white border-2 border-green-600 rounded-xl hover:bg-green-700 font-bold shadow-lg shadow-green-100 transition-all active:scale-95 disabled:opacity-50"
            >
              提交答案 & 查看解析
            </button>

            {/* Results Section (Score & Translation) - Moved Below Button */}
            {showResults && (
              <div className="space-y-6 animate-fade-in-up">
                {/* Score Banner */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-5 rounded-2xl shadow-lg flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">本次成绩</p>
                    <p className="text-2xl font-bold">答对 {getScore().score}/{data.questions.length}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <span className="text-3xl font-extrabold">{getScore().percentage}%</span>
                  </div>
                </div>

                {/* Translation - Sentence by Sentence */}
                {data.sentenceTranslations && data.sentenceTranslations.length > 0 && (
                  <div className="bg-amber-50 p-6 rounded-2xl shadow-sm border border-amber-100">
                    <h3 className="text-amber-800 font-bold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
                      逐句对照翻译
                    </h3>
                    <div className="space-y-4">
                      {data.sentenceTranslations.map((item, idx) => (
                        <div key={idx} className="pb-3 border-b border-amber-200/50 last:border-0 last:pb-0">
                          <p className="text-slate-800 font-medium text-sm mb-1">{item.original}</p>
                          <p className="text-amber-900/80 text-sm">{item.translation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reading;