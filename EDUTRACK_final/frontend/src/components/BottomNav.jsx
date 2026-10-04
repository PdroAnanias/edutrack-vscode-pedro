// ============================================================================
// EduTrack AI v2 - frontend/src/components/BottomNav.jsx
// Barra de Navegação Inferior para Celular (< 768px) (Seção 10.3)
// ============================================================================

import React from 'react';
import { LayoutDashboard, BookOpen, CheckSquare, User } from 'lucide-react';
import ActiveTimerWidget from './ActiveTimerWidget';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'disciplines', label: 'Disciplinas', icon: BookOpen },
    { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col">
      {/* Widget flutuante do cronômetro acima da barra de navegação */}
      <ActiveTimerWidget isMobile={true} />

      <nav
        aria-label="Navegação inferior mobile"
        className="bg-brand-dark dark:bg-brand-dark-surface border-t border-brand-light/10 dark:border-brand-dark-card flex items-stretch justify-around px-2 py-1 safe-area-bottom shadow-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg transition-colors duration-150 active:bg-brand-dark-surface/80 ${
                isActive
                  ? 'text-brand-gold font-semibold'
                  : 'text-brand-light/70 dark:text-brand-text-secondary-dark hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-gold"></span>
                )}
              </div>
              <span className="text-[11px] leading-none tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
