import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Search,
  ChevronDown,
  User,
  GraduationCap,
  ShieldCheck,
  LogOut,
  LineChart,
  UserPlus
} from 'lucide-react';
import { NavigationView, UserRole } from '../../types';
import { AuthModal, AuthModalMode } from './AuthModal';
import { AuthService } from '../../services/authService';
import { UserProfile } from '../../services/supabaseClient';

interface NavbarProps {
  currentView: NavigationView;
  onNavigate: (view: NavigationView) => void;
  onOpenSearch: () => void;
  onOpenVoice: () => void;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  mobileMenuOpen,
  onToggleMobileMenu,
  role,
  onRoleChange,
}) => {
  const [currentLang, setCurrentLang] = useState<'en' | 'bn'>('en');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const [profile, setProfile] = useState<UserProfile | null>(AuthService.getProfile());
  const [isSignedIn, setIsSignedIn] = useState<boolean>(AuthService.isAuthenticated());

  useEffect(() => {
    const unsubscribe = AuthService.subscribe((_event, session, userProfile) => {
      const authenticated = Boolean(session?.user);
      setIsSignedIn(authenticated);
      setProfile(userProfile);
      if (userProfile?.role) {
        onRoleChange(userProfile.role);
      }
    });
    return () => unsubscribe();
  }, [onRoleChange]);

  const navLinks: { id: NavigationView; label: string; labelBn: string }[] = [
    { id: 'study-materials', label: 'Study Materials', labelBn: 'পাঠ্য উপকরণ' },
    { id: 'learn', label: 'Learn', labelBn: 'শিখুন' },
    { id: 'textbook-library', label: 'Library', labelBn: 'লাইব্রেরি' },
    { id: 'drug-reference', label: 'Drug Reference', labelBn: 'ওষুধ নির্দেশিকা' },
    { id: 'visual-lab', label: 'Visual Lab', labelBn: 'ভিজ্যুয়াল ল্যাব' },
    { id: 'cases', label: 'Clinical Cases', labelBn: 'ক্লিনিক্যাল কেস' },
    { id: 'practice', label: 'Practice', labelBn: 'অনুশীলন' },
  ];

  const displayName = profile?.full_name || AuthService.getCurrentUser()?.email?.split('@')[0] || 'User';

  return (
    <header className="w-full px-4 sm:px-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-2 max-w-[1440px] mx-auto z-40 relative">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Turquoise 3D Cross Badge & Brand MEDX */}
        <div className="flex items-center gap-6 sm:gap-8 lg:gap-10">
          <button
            onClick={() => onNavigate('dashboard')}
            aria-label="Go to MEDX Dashboard"
            className="flex items-center gap-2.5 cursor-pointer select-none group text-left rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1]"
          >
            {/* Turquoise Medical Cross Icon */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#08AFC1] to-[#10b981] p-[1.5px] shadow-[0_0_15px_rgba(8,175,193,0.5)] transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-[#06172E] rounded-[10px] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#08AFC1]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
                </svg>
              </div>
            </div>

            <span className="text-xl font-black tracking-wider text-[#F5F9FF] font-sans">
              MEDX
            </span>
          </button>

          {/* Center-Left Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = currentView === link.id || 
                (link.id === 'learn' && currentView === 'across-books') || 
                (link.id === 'textbook-library' && currentView === 'textbook');
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1] ${
                    currentLang === 'bn' ? 'font-bengali' : 'font-sans'
                  } ${
                    isActive
                      ? 'text-[#F5F9FF] font-bold bg-white/10 shadow-sm'
                      : 'text-[#C4D4EA] hover:text-[#F5F9FF] hover:bg-white/5 font-medium'
                  }`}
                >
                  {currentLang === 'bn' ? link.labelBn : link.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Controls: Search, EN / বাংলা, separator, Real Account Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Medical Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="min-h-[44px] flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm text-[#C4D4EA] hover:text-[#F5F9FF] transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1]"
            title="Search medicines, study materials, topics (Ctrl + K)"
            aria-label="Open search dialog"
          >
            <Search className="w-4 h-4 text-[#08AFC1]" aria-hidden="true" />
            <span className={`hidden sm:inline ${currentLang === 'bn' ? 'font-bengali text-sm' : 'font-sans text-xs sm:text-sm'}`}>
              {currentLang === 'bn' ? 'অনুসন্ধান...' : 'Search medicines, topics...'}
            </span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[11px] font-mono bg-white/10 rounded text-[#C4D4EA]/80 ml-1">
              Ctrl+K
            </kbd>
          </button>

          {/* EN / বাংলা Language Toggle */}
          <button
            onClick={() => setCurrentLang(currentLang === 'en' ? 'bn' : 'en')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-sans text-[#C4D4EA] hover:text-[#F5F9FF] hover:bg-white/5 transition-colors select-none font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1]"
            title="Switch language (English / বাংলা)"
            aria-label="Switch interface language"
          >
            {currentLang === 'en' ? 'EN / বাংলা' : 'বাংলা / EN'}
          </button>

          {/* Thin Vertical Divider */}
          <span className="hidden sm:inline w-px h-5 bg-white/20" aria-hidden="true" />

          {/* Real User Profile / Account Trigger */}
          <div className="relative">
            {isSignedIn ? (
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                aria-expanded={showAccountMenu}
                aria-label="Open user account menu"
                className="min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-[#F5F9FF] text-xs sm:text-sm font-medium transition-all shadow-sm select-none flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1]"
              >
                <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" aria-hidden="true" />
                <span className="max-w-[110px] sm:max-w-[140px] truncate text-xs font-semibold">{displayName}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  role === 'admin' 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                    : role === 'faculty' || role === 'reviewer'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-[#08AFC1]/20 text-[#08AFC1] border border-[#08AFC1]/40'
                }`}>
                  {role}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  aria-label="Sign in to MEDX"
                  className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border border-[#08AFC1]/40 bg-[#08AFC1]/15 hover:bg-[#08AFC1]/25 text-[#08AFC1] hover:text-white text-xs sm:text-sm font-semibold transition-all shadow-sm select-none flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1]"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign in</span>
                </button>

                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  aria-label="Create MEDX account"
                  className="hidden sm:flex min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition-all select-none items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1]"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#08AFC1]" />
                  <span>Register</span>
                </button>
              </div>
            )}

            {/* Authenticated User Dropdown Menu */}
            {showAccountMenu && isSignedIn && (
              <div 
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 bg-[#06172E] backdrop-blur-2xl rounded-2xl border border-[rgba(190,225,255,0.25)] p-2 shadow-2xl z-50 animate-fadeIn space-y-1"
              >
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-bold text-white truncate">{profile?.full_name || displayName}</p>
                  <p className="text-[11px] text-[#8EACCF] truncate">{AuthService.getCurrentUser()?.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-[#08AFC1] font-bold">
                      {role}
                    </span>
                    {profile?.faculty_status === 'pending' && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Faculty Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Personal Progress */}
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowAccountMenu(false);
                    onNavigate('progress');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#C4D4EA] hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <LineChart className="w-4 h-4 text-[#08AFC1]" />
                  <span>My Learning Progress</span>
                </button>

                {/* Faculty/Admin Portal link if authorized */}
                {(role === 'faculty' || role === 'reviewer' || role === 'admin') && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowAccountMenu(false);
                      onNavigate('faculty-admin');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-purple-300 hover:bg-purple-500/15 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <span>Faculty & Governance Portal</span>
                  </button>
                )}

                <div className="my-1 border-t border-white/10" />

                {/* Account Details Modal Trigger */}
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setAuthModalMode('account-details');
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#08AFC1] hover:bg-white/10 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Account Details & Settings</span>
                </button>

                {/* Sign Out */}
                <button
                  role="menuitem"
                  onClick={async () => {
                    setShowAccountMenu(false);
                    await AuthService.signOut();
                    onRoleChange('student');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-500/15 transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>

          {/* Real Auth Modal */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
            onAuthStateChanged={(newRole) => {
              onRoleChange(newRole);
            }}
          />

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={onToggleMobileMenu}
            aria-label="Toggle Navigation Menu"
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#C4D4EA] hover:text-white lg:hidden transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AFC1]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
