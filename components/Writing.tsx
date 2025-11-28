import React, { useState } from 'react';
import { gradeWriting, fetchWritingTopic } from '../services/geminiService';
import { WritingFeedbackData } from '../types';

const Writing: React.FC = () => {
  const [topicTitle, setTopicTitle] = useState('Writing Task');
  const [topicRequirements, setTopicRequirements] = useState('Click "Generate Random Topic" to start a new CET-4 writing practice.');
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedbackData | null>(null);

  const handleGenerateTopic = async () => {
    setLoadingTopic(true);
    setFeedback(null);
    setEssay('');
    try {
      const result = await fetchWritingTopic();
      setTopicTitle(result.title);
      setTopicRequirements(result.requirements);
    } catch (e) {
      console.error(e);
      alert('Failed to generate topic');
    } finally {
      setLoadingTopic(false);
    }
  }

  const handleGrade = async () => {
    if (!essay.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      // Combine title and requirements for the prompt
      const fullPrompt = `Title: ${topicTitle}\nRequirements: ${topicRequirements}`;
      const result = await gradeWriting(fullPrompt, essay);
      setFeedback(result);
    } catch (e) {
      console.error(e);
      alert('Error grading essay.');
    } finally {
      setLoading(false);
    }
  };

  // Function to render highlighted corrections
  const renderHighlightedCorrection = (text: string) => {
    // Splits by ==text== markers
    const parts = text.split(/(==.*?==)/g);
    return parts.map((part, index) => {
      if (part.startsWith('==') && part.endsWith('==')) {
        return (
          <span key={index} className="bg-yellow-200 text-yellow-900 font-bold px-1 rounded mx-0.5 box-decoration-clone">
            {part.slice(2, -2)}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
      {/* Container adapts to column on mobile, allowing score to appear below input/submit */}
      <div className="flex flex-col gap-8">
        
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">写作批改</h2>
            <p className="text-slate-500 text-sm">智能出题，即时批改，模拟实战</p>
          </div>

          {/* Topic Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            {/* Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <svg className="w-16 h-16 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9C7.89543 16 7 16.8954 7 18L7 21H14.017ZM16.017 21L16.017 18C16.017 15.7909 14.2261 14 12.017 14H9C6.79086 14 5 15.7909 5 18L5 21H3V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V21H16.017ZM15 7H9V9H15V7ZM15 11H9V13H15V11Z"></path></svg>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider self-center">Current Topic</label>
                <button 
                  onClick={handleGenerateTopic}
                  disabled={loadingTopic}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                >
                  {loadingTopic ? (
                    'Loading...'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      随机出题
                    </>
                  )}
                </button>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-2">{topicTitle}</h3>
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                {topicRequirements}
              </div>
            </div>
          </div>

          {/* Essay Input */}
          <div className="relative">
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="请根据上方的题目要求，在此输入你的作文..."
              className="w-full p-4 h-80 text-base bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none leading-relaxed"
            />
            <div className="absolute bottom-4 right-4 text-xs text-slate-400 font-mono">
              {essay.length} chars
            </div>
          </div>

          <button
            onClick={handleGrade}
            disabled={loading || !essay || loadingTopic}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-transform active:scale-95"
          >
            {loading ? 'AI 正在批改...' : '提交批改'}
          </button>
        </div>

        {/* Feedback Section - Appears Below Input on Mobile */}
        <div className="space-y-4">
           {feedback && (
             <div className="space-y-6 animate-fade-in-up">
               {/* Score Card */}
               <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-between">
                 <div>
                   <h3 className="text-slate-500 text-sm font-medium uppercase">本次成绩</h3>
                   <div className="text-4xl font-extrabold text-slate-900">{feedback.score}<span className="text-xl text-slate-400">/15</span></div>
                 </div>
                 <div className={`px-4 py-2 rounded-lg font-bold ${feedback.score >= 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                   {feedback.score >= 12 ? 'Excellent' : feedback.score >= 9 ? 'Good' : 'Needs Work'}
                 </div>
               </div>

               {/* General Feedback */}
               <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                 <h4 className="text-blue-800 font-bold mb-2 text-sm uppercase">AI 点评</h4>
                 <p className="text-blue-900 leading-relaxed text-sm">{feedback.feedback}</p>
               </div>

               {/* Correction Tabs */}
               <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                 <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-medium text-slate-700 text-sm flex items-center gap-2">
                   <span>🔍</span> 语法纠错 <span className="text-xs font-normal text-slate-400 ml-auto">黄色高亮为修改内容</span>
                 </div>
                 <div className="p-4 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                   {renderHighlightedCorrection(feedback.correctedText)}
                 </div>
               </div>

               <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 overflow-hidden">
                 <div className="px-4 py-2 border-b border-indigo-100 font-medium text-indigo-800 text-sm flex items-center gap-2">
                   <span>✨</span> 高分范文升级
                 </div>
                 <div className="p-4 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                   {feedback.betterVersion}
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Writing;