import React, { useState, useEffect, lazy, Suspense } from 'react';
import { NavigationView, UserRole } from './types';
import { StorageService } from './services/storageService';
import { ApiService } from './services/apiService';
import { Navbar } from './components/navigation/Navbar';
import { Sidebar } from './components/navigation/Sidebar';
import { CommandPalette } from './components/navigation/CommandPalette';
import { GlobalSearch } from './components/navigation/GlobalSearch';
import { VoiceAssistantModal } from './components/ai/VoiceAssistantModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthService } from './services/authService';
import { AuthModal, AuthModalMode } from './components/navigation/AuthModal';
import { ShieldAlert } from 'lucide-react';
import { MobileService } from './services/mobileService';

// Core Navigation Hubs
import { DashboardView } from './components/home/DashboardView';
import { LearnSubjectLibrary } from './components/learn/LearnSubjectLibrary';

// Lazy-loaded heavy hubs to optimize initial dashboard bundle & performance
const VisualLabHub = lazy(() => import('./components/visual-lab/VisualLabHub').then(module => ({ default: module.VisualLabHub })));
const ClinicalCaseEngine = lazy(() => import('./components/cases/ClinicalCaseEngine').then(module => ({ default: module.ClinicalCaseEngine })));
const PracticeExamsHub = lazy(() => import('./components/practice/PracticeExamsHub').then(module => ({ default: module.PracticeExamsHub })));
const RevisionHub = lazy(() => import('./components/revision/RevisionHub').then(module => ({ default: module.RevisionHub })));
const PersonalizedProgress = lazy(() => import('./components/progress/PersonalizedProgress').then(module => ({ default: module.PersonalizedProgress })));

// Intelligence & Governance
const AiTutorChat = lazy(() => import('./components/ai/AiTutorChat').then(module => ({ default: module.AiTutorChat })));
const FacultyAdminPortal = lazy(() => import('./components/faculty/FacultyAdminPortal').then(module => ({ default: module.FacultyAdminPortal })));
const VideoStudioHub = lazy(() => import('./components/video-studio/VideoStudioHub').then(module => ({ default: module.VideoStudioHub })));

import { MobileBottomNav } from './components/navigation/MobileBottomNav';
const AcrossBooksWorkspace = lazy(() => import('./components/across-books/AcrossBooksWorkspace').then(module => ({ default: module.AcrossBooksWorkspace })));
const TextbookLibraryHub = lazy(() => import('./components/textbook/TextbookLibraryHub').then(module => ({ default: module.TextbookLibraryHub })));
const DrugReferenceHub = lazy(() => import('./components/drug-reference/DrugReferenceHub').then(module => ({ default: module.DrugReferenceHub })));
const StudyMaterialsHub = lazy(() => import('./components/study/StudyMaterialsHub').then(module => ({ default: module.StudyMaterialsHub })));

const normalizeView = (rawHashOrView: string): NavigationView => {
  if (!rawHashOrView) return 'dashboard';
  const rawClean = rawHashOrView.replace(/^#/, '');
  if (
    rawClean.startsWith('access_token=') || 
    rawClean.startsWith('error_description=') || 
    rawClean.includes('type=recovery') || 
    rawClean.startsWith('refresh_token=')
  ) {
    return 'dashboard';
  }
  const parts = rawClean.split('?')[0].split('/');
  const hash = parts[0].toLowerCase();

  if (hash === 'drugs' || hash === 'drug-reference') {
    if (parts[1] === 'brand' && parts[2]) {
      const newUrl = `#drug-reference?brand=${encodeURIComponent(parts[2])}`;
      window.history.replaceState(null, '', newUrl);
    }
    return 'drug-reference';
  }
  if (hash === 'library' || hash === 'textbook' || hash === 'textbook-library') {
    return 'textbook-library';
  }
  if (hash === 'study' || hash === 'study-materials') {
    return 'study-materials';
  }
  if (hash === 'clinical-cases' || hash === 'cases') {
    return 'cases';
  }
  if (hash === 'saved' || hash === 'saved-items' || hash === 'bookmarks' || hash === 'revision') {
    return 'revision';
  }
  if (hash === 'profile' || hash === 'account' || hash === 'progress') {
    return 'progress';
  }
  if (hash === 'home' || hash === 'dashboard' || !hash) {
    return 'dashboard';
  }

  const validViews: NavigationView[] = [
    'dashboard', 'study-materials', 'learn', 'across-books', 'textbook-library',
    'visual-lab', 'cases', 'practice', 'revision', 'progress', 'faculty-admin',
    'video-studio', 'drug-reference', 'drugs', 'home', '3d-anatomy', 'physiology',
    'pathology', 'pharmacology', 'clinical-exam', 'ospe', 'osce', 'procedures',
    'investigations', 'treatment', 'questions', 'ai-viva', 'ai-tutor', 'histology',
    'surgery', 'diagrams', 'textbook', 'comparison', 'visual-engine'
  ];

  if (validViews.includes(hash as NavigationView)) {
    return hash as NavigationView;
  }

  return 'dashboard';
};

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavigationView>(() => {
    if (typeof window !== 'undefined') {
      const rawHash = window.location.hash;
      if (rawHash) return normalizeView(rawHash);
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view) return normalizeView(view);
    }
    return 'dashboard';
  });

  const [role, setRole] = useState<UserRole>(StorageService.getRole());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(AuthService.isAuthenticated());
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const isHomepage = currentView === 'dashboard' || currentView === 'home';

  // Synchronize authenticated role and session state in real time
  useEffect(() => {
    const unsubscribe = AuthService.subscribe((event, session, profile) => {
      setIsAuthenticated(Boolean(session?.user));
      if (profile?.role) {
        setRole(profile.role);
      }
      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalMode('reset-password');
        setAuthModalOpen(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize native Android plugins (StatusBar, Keyboard, external links)
  useEffect(() => {
    MobileService.init();
  }, []);

  // Android hardware back button handler
  useEffect(() => {
    const isAnyModalOpen = isSearchOpen || isCommandOpen || isVoiceOpen || authModalOpen || mobileMenuOpen;
    return MobileService.setupBackButton({
      isModalOpen: isAnyModalOpen,
      closeModals: () => {
        setIsSearchOpen(false);
        setIsCommandOpen(false);
        setIsVoiceOpen(false);
        setAuthModalOpen(false);
        setMobileMenuOpen(false);
      },
      canNavigateBack: currentView !== 'dashboard',
      onNavigateBack: () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        } else {
          handleNavigate('dashboard');
        }
      }
    });
  }, [isSearchOpen, isCommandOpen, isVoiceOpen, authModalOpen, mobileMenuOpen, currentView]);

  // Handle OAuth / Email confirmation / Recovery redirects cleanly without hash conflicts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setAuthModalMode('reset-password');
        setAuthModalOpen(true);
      }
      if (hash.includes('access_token=') || search.includes('code=')) {
        setTimeout(() => {
          if (window.location.hash.includes('access_token=')) {
            window.history.replaceState(null, '', window.location.pathname + '#dashboard');
            setCurrentView('dashboard');
          }
        }, 750);
      }
    }
  }, []);

  // Hash links support shareable topic URLs and browser back/forward navigation.
  useEffect(() => {
    const syncView = () => {
      const rawHash = window.location.hash;
      const normalized = normalizeView(rawHash);
      setCurrentView(normalized);
      setMobileMenuOpen(false);
    };
    window.addEventListener('hashchange', syncView);
    return () => window.removeEventListener('hashchange', syncView);
  }, []);

  // Global Ctrl + K listener for Global Search and Ctrl + Shift + P for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (view: NavigationView) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setCurrentView('learn');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoleChange = async (newRole: UserRole) => {
    setRole(newRole);
    await ApiService.setRole(newRole);
  };

  return (
    <div className="min-h-screen bg-[#040d21] bg-royal-mesh text-[#F5F9FF] flex flex-col font-sans selection:bg-[#08AFC1]/30 selection:text-white relative">
      {/* Universal Fixed Silk Wave Backdrop across all pages */}
      <div 
        className="fixed inset-0 -z-50 pointer-events-none bg-[#040d21]"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(4, 13, 33, 0.30), rgba(4, 13, 33, 0.10) 45%, rgba(4, 13, 33, 0.40)), url('/anatomy/medx_silk_bg.jpg')`,
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Top Floating Glass Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        role={role}
        onRoleChange={handleRoleChange}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex w-full relative">
        {/* Left Sidebar (Only shown on inner study pages or via mobile drawer) */}
        {!isHomepage && (
          <Sidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile drawer when on homepage */}
        {isHomepage && mobileMenuOpen && (
          <Sidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Dynamic Main View Area - Full width on homepage, offset on study hubs */}
        <main className={`flex-1 w-full min-w-0 min-h-[calc(100vh-5rem)] overflow-x-hidden ${isHomepage ? 'px-2 sm:px-4' : 'p-3 sm:p-6 lg:p-8 lg:pl-64'}`}>
          <ErrorBoundary key={currentView}>
            {/* 1. Dashboard / Command Center */}
            {isHomepage && (
              <DashboardView 
                onNavigate={handleNavigate} 
                onOpenLesson={handleOpenLesson} 
              />
            )}

            {/* Study Materials (Medical Textbook Reference) */}
            {currentView === 'study-materials' && (
              <Suspense fallback={<p role="status" className="p-6 text-slate-300">Loading Study Materials…</p>}>
                <StudyMaterialsHub onNavigate={handleNavigate} />
              </Suspense>
            )}

            {/* 2. Learn (Curriculum & 5-Stage Lesson System) */}
            {currentView === 'learn' && (
              <LearnSubjectLibrary
                onSelectTopic={() => {}}
                onNavigateView={handleNavigate}
                selectedLessonId={selectedLessonId}
              />
            )}

            {currentView === 'across-books' && (
              <Suspense fallback={<p role="status" className="p-6 text-slate-300">Opening your study workspace…</p>}>
                <AcrossBooksWorkspace onNavigate={handleNavigate} />
              </Suspense>
            )}

            {(currentView === 'textbook-library' || currentView === 'textbook') && (
              <Suspense fallback={<p role="status" className="p-6 text-slate-300">Opening MBBS Textbook Library…</p>}>
                <TextbookLibraryHub onNavigateAcrossBooks={(topicId) => {
                  if (topicId) {
                    window.location.hash = `across-books/${topicId}`;
                  } else {
                    handleNavigate('across-books');
                  }
                }} />
              </Suspense>
            )}

            {(currentView === 'drug-reference' || currentView === 'drugs') && (
              <Suspense fallback={<p role="status" className="p-6 text-slate-300">Opening Bangladesh Drug Reference…</p>}>
                <DrugReferenceHub onOpenAcrossBooksTopic={(topicId) => {
                  if (topicId) {
                    window.location.hash = `across-books/${topicId}`;
                  } else {
                    handleNavigate('across-books');
                  }
                }} />
              </Suspense>
            )}

            {/* 3. Visual Lab (Simulation Hub) */}
            {(currentView === 'visual-lab' || 
              currentView === 'visual-engine' ||
              currentView === '3d-anatomy' ||
              currentView === 'physiology' ||
              currentView === 'pathology' ||
              currentView === 'histology' ||
              currentView === 'comparison' ||
              currentView === 'diagrams' ||
              currentView === 'surgery' ||
              currentView === 'pharmacology' ||
              currentView === 'investigations' ||
              currentView === 'treatment'
            ) && (
              <Suspense fallback={<p role="status" className="p-8 text-center text-slate-300 font-mono text-xs">Loading 3D Visual Lab…</p>}>
                <VisualLabHub
                  initialSubTab={
                    currentView === 'physiology' ? 'cardiac-cycle' :
                    currentView === 'pathology' ? 'pathology-slider' :
                    currentView === 'histology' ? 'histology' :
                    currentView === 'comparison' ? 'normal-vs-abnormal' :
                    currentView === 'diagrams' ? 'diagrams' :
                    currentView === 'surgery' ? 'surgery' :
                    currentView === 'pharmacology' ? 'pharmacology' :
                    currentView === 'investigations' ? 'radiology-dicom' :
                    '3d-anatomy'
                  }
                  initialOrgan={
                    typeof window !== 'undefined'
                      ? (new URLSearchParams(window.location.hash.split('?')[1] || window.location.search).get('organ') || undefined)
                      : undefined
                  }
                  onNavigateToCase={() => handleNavigate('cases')}
                  onStartViva={() => handleNavigate('ai-viva')}
                />
              </Suspense>
            )}

            {/* 4. Clinical Cases */}
            {currentView === 'cases' && (
              <Suspense fallback={<p role="status" className="p-8 text-center text-slate-300 font-mono text-xs">Loading Clinical Case Engine…</p>}>
                <ClinicalCaseEngine />
              </Suspense>
            )}

            {/* 5. Practice & Exams */}
            {(currentView === 'practice' ||
              currentView === 'questions' ||
              currentView === 'ospe' ||
              currentView === 'osce' ||
              currentView === 'ai-viva' ||
              currentView === 'clinical-exam'
            ) && (
              <Suspense fallback={<p role="status" className="p-8 text-center text-slate-300 font-mono text-xs">Loading Practice & Exam Hub…</p>}>
                <PracticeExamsHub
                  initialSubTab={
                    currentView === 'ospe' ? 'ospe' :
                    currentView === 'osce' ? 'osce' :
                    currentView === 'ai-viva' ? 'ai-viva' :
                    'questions'
                  }
                />
              </Suspense>
            )}

            {/* 6. Revision Hub (Spaced Flashcards & Mistakes) */}
            {currentView === 'revision' && (
              <Suspense fallback={<p role="status" className="p-8 text-center text-slate-300 font-mono text-xs">Loading Revision Deck…</p>}>
                {!isAuthenticated ? (
                  <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-[#06172E] border border-[rgba(190,225,255,0.22)] text-center space-y-4 shadow-2xl">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[#08AFC1]/15 border border-[#08AFC1]/30 flex items-center justify-center text-[#08AFC1]">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Sign In to Access Your Personal Revision Deck</h2>
                    <p className="text-xs sm:text-sm text-[#8EACCF] leading-relaxed max-w-lg mx-auto">
                      Spaced Repetition flashcards, Mistake Notebooks, and Bookmarked lessons are synced across your devices and saved strictly to your account.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setAuthModalMode('login');
                          setAuthModalOpen(true);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#08AFC1] to-[#0694a2] hover:from-[#09c2d6] hover:to-[#08AFC1] text-[#06172E] text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(8,175,193,0.35)]"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          setAuthModalMode('signup');
                          setAuthModalOpen(true);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Create Free Account
                      </button>
                    </div>
                  </div>
                ) : (
                  <RevisionHub
                    onNavigateToLesson={handleOpenLesson}
                    onNavigateView={handleNavigate}
                  />
                )}
              </Suspense>
            )}

            {/* 7. Progress Radar */}
            {currentView === 'progress' && (
              <Suspense fallback={<p role="status" className="p-8 text-center text-slate-300 font-mono text-xs">Loading Student Progress Radar…</p>}>
                {!isAuthenticated ? (
                  <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-[#06172E] border border-[rgba(190,225,255,0.22)] text-center space-y-4 shadow-2xl">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[#08AFC1]/15 border border-[#08AFC1]/30 flex items-center justify-center text-[#08AFC1]">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Sign In to Track Your Personal MBBS Progress</h2>
                    <p className="text-xs sm:text-sm text-[#8EACCF] leading-relaxed max-w-lg mx-auto">
                      Personalized readiness scores, mistake notebooks, Spaced Repetition flashcards, and completed lesson histories are securely saved to your account.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setAuthModalMode('login');
                          setAuthModalOpen(true);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#08AFC1] to-[#0694a2] hover:from-[#09c2d6] hover:to-[#08AFC1] text-[#06172E] text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(8,175,193,0.35)]"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          setAuthModalMode('signup');
                          setAuthModalOpen(true);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Create Free Account
                      </button>
                    </div>
                  </div>
                ) : (
                  <PersonalizedProgress
                    onNavigateToView={handleNavigate}
                    onNavigateToTopic={() => handleNavigate('learn')}
                  />
                )}
              </Suspense>
            )}

            {/* Intelligence & Faculty */}
            {currentView === 'ai-tutor' && (
              <Suspense fallback={<p role="status" className="p-8 text-center text-slate-300 font-mono text-xs">Loading AI Tutor…</p>}>
                <AiTutorChat />
              </Suspense>
            )}

            {currentView === 'faculty-admin' && (
              <Suspense fallback={<p role="status" className="p-8 text-center text-slate-300 font-mono text-xs">Loading Faculty Portal…</p>}>
                {role === 'faculty' || role === 'reviewer' || role === 'admin' ? (
                  <FacultyAdminPortal />
                ) : (
                  <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-[#06172E] border border-purple-500/30 text-center space-y-4 shadow-2xl">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Faculty Access Restricted</h2>
                    <p className="text-xs sm:text-sm text-[#8EACCF] leading-relaxed max-w-lg mx-auto">
                      The Faculty & Curriculum Governance Portal is reserved for verified medical faculty members, external reviewers, and system administrators. Access cannot be gained by browser role changes or direct hash navigation.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => handleNavigate('dashboard')}
                        className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Return to Dashboard
                      </button>
                      {isAuthenticated ? (
                        <button
                          onClick={() => {
                            setAuthModalMode('account-details');
                            setAuthModalOpen(true);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Request Faculty Status
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setAuthModalMode('login');
                            setAuthModalOpen(true);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-[#08AFC1] hover:bg-[#09c2d6] text-[#06172E] text-xs font-bold transition-colors cursor-pointer"
                        >
                          Sign In to Request Access
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Suspense>
            )}

            {currentView === 'video-studio' && (
              <Suspense fallback={<p role="status" className="p-8 text-center text-slate-300 font-mono text-xs">Loading Video Studio…</p>}>
                <VideoStudioHub />
              </Suspense>
            )}

            {/* Unrecognized Section Fallback (instead of empty blank screen) */}
            {!isHomepage &&
              currentView !== 'study-materials' &&
              currentView !== 'learn' &&
              currentView !== 'across-books' &&
              currentView !== 'textbook-library' &&
              currentView !== 'textbook' &&
              currentView !== 'drug-reference' &&
              currentView !== 'drugs' &&
              currentView !== 'visual-lab' &&
              currentView !== 'visual-engine' &&
              currentView !== '3d-anatomy' &&
              currentView !== 'physiology' &&
              currentView !== 'pathology' &&
              currentView !== 'histology' &&
              currentView !== 'comparison' &&
              currentView !== 'diagrams' &&
              currentView !== 'surgery' &&
              currentView !== 'pharmacology' &&
              currentView !== 'investigations' &&
              currentView !== 'treatment' &&
              currentView !== 'cases' &&
              currentView !== 'practice' &&
              currentView !== 'questions' &&
              currentView !== 'ospe' &&
              currentView !== 'osce' &&
              currentView !== 'ai-viva' &&
              currentView !== 'clinical-exam' &&
              currentView !== 'revision' &&
              currentView !== 'progress' &&
              currentView !== 'ai-tutor' &&
              currentView !== 'faculty-admin' &&
              currentView !== 'video-studio' && (
                <div className="medx-empty-state max-w-lg mx-auto my-12 p-8">
                  <div className="medx-empty-state-title">Section Not Found</div>
                  <p className="medx-empty-state-desc">
                    The requested medical section could not be located. Choose one of the hubs from the navigation menu.
                  </p>
                  <button
                    onClick={() => handleNavigate('dashboard')}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-[#08AFC1] text-slate-950 font-bold text-xs sm:text-sm hover:bg-[#09c2d6] transition-colors cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(view, params) => {
          setIsSearchOpen(false);
          handleNavigate(view as NavigationView);
        }}
      />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectView={handleNavigate}
      />

      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Mobile Floating Glass Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthStateChanged={(newRole) => setRole(newRole)}
      />
    </div>
  );
};
export default App;
