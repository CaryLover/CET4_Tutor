import React, { useState } from 'react';
import Vocabulary from './components/Vocabulary';
import Listening from './components/Listening';
import Reading from './components/Reading';
import Writing from './components/Writing';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.VOCABULARY);

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.VOCABULARY: return <Vocabulary />;
      case AppTab.LISTENING: return <Listening />;
      case AppTab.READING: return <Reading />;
      case AppTab.WRITING: return <Writing />;
      default: return <Vocabulary />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-blue-200 shadow-lg">4</div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">CET-4 Prep Master</h1>
        </div>
        <div className="text-[10px] text-slate-400 font-medium">Gemini 3.0 pro</div>
      </header>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto bg-slate-50 scroll-smooth">
        <div className="pb-20"> {/* Padding bottom to prevent content being hidden behind nav */}
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation (Mobile Friendly) */}
      <nav className="bg-white border-t border-slate-200 px-2 py-2 fixed bottom-0 w-full z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <NavButton 
            active={activeTab === AppTab.VOCABULARY} 
            onClick={() => setActiveTab(AppTab.VOCABULARY)}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>}
            label="单词"
          />
          <NavButton 
            active={activeTab === AppTab.LISTENING} 
            onClick={() => setActiveTab(AppTab.LISTENING)}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>}
            label="听力"
          />
          <NavButton 
            active={activeTab === AppTab.READING} 
            onClick={() => setActiveTab(AppTab.READING)}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
            label="阅读"
          />
          <NavButton 
            active={activeTab === AppTab.WRITING} 
            onClick={() => setActiveTab(AppTab.WRITING)}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>}
            label="写作"
          />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 w-16 h-14 rounded-xl transition-all active:scale-95 ${
      active ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {icon}
    <span className="text-[10px] mt-0.5">{label}</span>
  </button>
);

export default App;