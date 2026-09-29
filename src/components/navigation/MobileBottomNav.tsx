import React from 'react';
import { Home, BookOpen, CheckSquare, Bookmark, Pill } from 'lucide-react';
import { NavigationView } from '../../types';

interface MobileBottomNavProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView) => void;
  onOpenSearch?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavigationView,
      label: 'Home',
      icon: Home,
      isActive: currentView === 'dashboard' || currentView === 'home'
    },
    {
      id: 'learn' as NavigationView,
      label: 'Learn',
      icon: BookOpen,
      isActive: currentView === 'learn' || currentView === 'across-books' || currentView === 'textbook-library' || currentView === 'textbook' || currentView === 'study-materials'
    },
    {
      id: 'drug-reference' as NavigationView,
      label: 'Drugs',
      icon: Pill,
      isActive: currentView === 'drug-reference' || currentView === 'drugs'
    },
    {
      id: 'practice' as NavigationView,
      label: 'Practice',
      icon: CheckSquare,
      isActive: currentView === 'practice' || currentView === 'questions' || currentView === 'ospe' || currentView === 'osce' || currentView === 'cases'
    },
    {
      id: 'revision' as NavigationView,
      label: 'Saved',
      icon: Bookmark,
      isActive: currentView === 'revision' || currentView === 'progress'
    }
  ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 max-w-md mx-auto pointer-events-auto"
    >
      <div className="bg-[rgba(10,36,74,0.85)] backdrop-blur-xl border border-[rgba(190,225,255,0.25)] border-t-[rgba(255,255,255,0.35)] rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.5)] p-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              onClick={() => onNavigate(tab.id)}
              aria-label={tab.label}
              aria-current={tab.isActive ? 'page' : undefined}
              className={`min-h-[48px] flex-1 py-1.5 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1] ${
                tab.isActive
                  ? 'text-[#08AFC1] font-bold'
                  : 'text-[#C4D4EA]/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className={`relative p-1 rounded-lg transition-transform ${tab.isActive ? 'scale-110 bg-[#08AFC1]/15 text-[#08AFC1]' : ''}`}>
                <Icon className="w-5 h-5" aria-hidden="true" />
                {tab.isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#08AFC1] shadow-[0_0_8px_#08AFC1]" />
                )}
              </div>
              <span className={`text-[11px] font-sans tracking-tight ${tab.isActive ? 'font-bold text-[#F5F9FF]' : 'font-medium text-[#C4D4EA]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
