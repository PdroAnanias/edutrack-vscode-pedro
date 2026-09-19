import React from 'react';
import { LayoutDashboard, BookOpen, User, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Menu Principal', icon: LayoutDashboard },
    { id: 'disciplines', label: 'Disciplinas', icon: BookOpen },
    { id: 'profile', label: 'Perfil / Configurações', icon: User },
  ];

  // User initials for fallback avatar
  const getInitials = () => {
    if (!user) return 'ET';
    const first = user.name ? user.name[0].toUpperCase() : '';
    const last = user.surname ? user.surname[0].toUpperCase() : '';
    return `${first}${last}` || 'U';
  };

  return (
    <aside className="w-72 bg-brand-dark border-r border-brand-light/10 text-brand-light flex flex-col justify-between shrink-0 shadow-xl z-20 min-h-screen">
      <div>
        {/* Logo / Brand Header */}
        <div className="p-6 border-b border-brand-light/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center border border-brand-gold/40 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-lg tracking-wide text-brand-light">
                <span>Etrack-AI</span>
                <Sparkles className="w-4 h-4 text-brand-gold" />
              </div>
              <p className="text-[11px] text-brand-light/50 font-medium">Gestão Acadêmica</p>
            </div>
          </div>
        </div>

        {/* User Greeting & Profile Top Section */}
        <div className="p-5 border-b border-brand-light/10 bg-brand-light/5">
          <div className="flex items-center gap-3.5">
            {/* Circular Avatar */}
            <div className="relative shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-13 h-13 rounded-full object-cover border-2 border-brand-gold shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-gold text-brand-dark font-bold flex items-center justify-center text-base border-2 border-brand-light/30 shadow-md">
                  {getInitials()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-brand-dark" title="Online" />
            </div>

            {/* Friendly Greeting & User Name */}
            <div className="flex-1 min-w-0">
              <span className="text-xs text-brand-gold font-medium block">
                Olá, {user?.name || 'Estudante'}! 👋
              </span>
              <p className="text-sm font-semibold text-brand-light truncate">
                {user?.name} {user?.surname}
              </p>
              <p className="text-[11px] text-brand-light/50 truncate">
                {user?.course || 'Graduação'}
              </p>
            </div>
          </div>

          {/* Quick Logout Button */}
          <div className="mt-3 pt-3 border-t border-brand-light/10 flex justify-end">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-brand-light/60 hover:text-red-300 transition px-2.5 py-1 rounded-lg hover:bg-brand-light/10"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-light/40 mb-2">
            Navegação Principal
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                  isSelected
                    ? 'bg-brand-gold text-brand-dark shadow-md font-semibold'
                    : 'text-brand-light/80 hover:bg-brand-light/10 hover:text-brand-light'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isSelected ? 'text-brand-dark' : 'text-brand-gold/80'
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isSelected && (
                  <div className="w-1.5 h-6 rounded-full bg-brand-dark -mr-1" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-brand-light/10">
        <div className="p-3 rounded-xl bg-brand-light/5 border border-brand-light/10">
          <div className="flex items-center gap-2 text-brand-gold text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EduTrack AI v1.0</span>
          </div>
          <p className="text-[11px] text-brand-light/50">
            Processamento e insights inteligentes acadêmicos ativos.
          </p>
        </div>
      </div>
    </aside>
  );
}
