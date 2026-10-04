// ============================================================================
// EduTrack AI v2 - frontend/src/App.jsx
// Casca Principal Full-Stack: Provedores de Tema, Auth e Timer + Busca Global
// ============================================================================

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TimerProvider } from './context/TimerContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import GlobalSearchModal from './components/GlobalSearchModal';
import Dashboard from './pages/Dashboard';
import GeneralTasks from './pages/GeneralTasks';
import Disciplines from './pages/Disciplines';
import Profile from './pages/Profile';
import ErrorBoundary from './components/ErrorBoundary';
import { Search, Sparkles, BookOpen } from 'lucide-react';

function MainAppShell() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'forgot-email' | 'forgot-code' | 'forgot-new'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'tasks' | 'disciplines' | 'profile'
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Atalho global Ctrl+K para busca (Seção 6.2)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light dark:bg-brand-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-brand-dark dark:text-brand-light">
          <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Iniciando EduTrack AI v2...</p>
        </div>
      </div>
    );
  }

  // Não autenticado -> Fluxos de Auth
  if (!user) {
    if (authView === 'register') {
      return <Register onNavigate={setAuthView} />;
    }
    if (authView === 'forgot-email') {
      return <ForgotPassword onNavigate={setAuthView} initialStep={1} />;
    }
    if (authView === 'forgot-code') {
      return <ForgotPassword onNavigate={setAuthView} initialStep={2} />;
    }
    if (authView === 'forgot-new') {
      return <ForgotPassword onNavigate={setAuthView} initialStep={3} />;
    }
    return <Login onNavigate={setAuthView} />;
  }

  // Autenticado -> App Shell
  return (
    <div className="min-h-screen bg-brand-light dark:bg-brand-dark-bg text-brand-dark dark:text-brand-light flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Top Header (< 768px) */}
      <header className="md:hidden bg-brand-dark dark:bg-brand-dark-surface text-brand-light px-4 py-3 flex items-center justify-between border-b border-brand-light/10 dark:border-brand-dark-card z-30 sticky top-0 shadow-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-gold" />
          <span className="font-bold text-base text-brand-light">EduTrack AI</span>
          <span className="text-[10px] bg-brand-gold text-brand-dark px-1.5 py-0.5 rounded font-black">v2</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="p-2 text-brand-light/80 hover:text-brand-gold rounded-lg hover:bg-white/10"
            aria-label="Abrir busca global"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar (>= 768px) */}
      <div className="hidden md:flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto pb-20 md:pb-0">
        {/* Desktop Quick Header Search Button */}
        <div className="hidden md:flex items-center justify-end px-8 pt-4 pb-0">
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white dark:bg-brand-dark-surface border border-brand-light dark:border-brand-dark-card text-brand-text-secondary-light dark:text-brand-text-secondary-dark hover:border-brand-gold/50 shadow-sm text-xs transition"
          >
            <Search className="w-4 h-4 text-brand-gold" />
            <span>Busca global de disciplinas e tarefas...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-brand-light dark:bg-brand-dark rounded border border-brand-light-hover dark:border-white/10">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <ErrorBoundary>
          {activeTab === 'dashboard' && (
            <Dashboard
              onNavigateDiscipline={() => setActiveTab('disciplines')}
              onNavigateTasks={() => setActiveTab('tasks')}
            />
          )}
          {activeTab === 'tasks' && <GeneralTasks />}
          {activeTab === 'disciplines' && <Disciplines />}
          {activeTab === 'profile' && <Profile />}
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modal de Busca Global (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectDiscipline={() => setActiveTab('disciplines')}
        onSelectTask={() => setActiveTab('tasks')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TimerProvider>
            <MainAppShell />
          </TimerProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
