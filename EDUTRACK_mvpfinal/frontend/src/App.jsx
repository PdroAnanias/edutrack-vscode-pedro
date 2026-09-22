import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import GeneralTasks from './pages/GeneralTasks';
import Disciplines from './pages/Disciplines';
import Profile from './pages/Profile';
import { Menu, X } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot-email', 'forgot-code', 'forgot-new'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'tasks', 'disciplines', 'profile'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-brand-light">
          <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Iniciando EduTrack AI...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Authentication flows
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

  // Logged In -> App Shell
  return (
    <div className="min-h-screen bg-brand-light flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-brand-dark text-brand-light p-4 flex items-center justify-between border-b border-brand-light/10 z-30">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-brand-light">Etrack-AI</span>
          <span className="text-xs bg-brand-gold text-brand-dark px-2 py-0.5 rounded font-bold">MVP</span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 text-brand-light hover:text-brand-gold"
          aria-label="Abrir menu"
        >
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar for Desktop */}
      <div className="hidden md:flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Sidebar Drawer for Mobile */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-brand-dark/70 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col max-w-xs w-full bg-brand-dark z-50">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-brand-light">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigateDiscipline={() => setActiveTab('disciplines')}
            onNavigateTasks={() => setActiveTab('tasks')}
          />
        )}
        {activeTab === 'tasks' && <GeneralTasks />}
        {activeTab === 'disciplines' && <Disciplines />}
        {activeTab === 'profile' && <Profile />}
      </main>
    </div>
  );
}
