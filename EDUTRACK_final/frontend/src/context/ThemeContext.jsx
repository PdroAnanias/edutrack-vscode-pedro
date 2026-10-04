// ============================================================================
// EduTrack AI v2 - frontend/src/context/ThemeContext.jsx
// Gerenciamento de Tema (Claro/Escuro/Sistema) e Tamanho de Fonte (Seção 10.5)
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Inicialização síncrona lendo do cache local para prevenir qualquer flickering
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('edutrack_theme') || 'sistema';
  });

  const [textSize, setTextSizeState] = useState(() => {
    return localStorage.getItem('edutrack_text_size') || 'normal';
  });

  // Aplicação da classe .dark no elemento raiz
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (theme === 'escuro') {
        isDark = true;
      } else if (theme === 'claro') {
        isDark = false;
      } else {
        isDark = mediaQuery.matches;
      }

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const handler = () => {
      if (theme === 'sistema') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Aplicação do tamanho do texto no elemento raiz
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-text-size', textSize);
  }, [textSize]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('edutrack_theme', newTheme);
  };

  const setTextSize = (newSize) => {
    setTextSizeState(newSize);
    localStorage.setItem('edutrack_text_size', newSize);
  };

  const toggleTheme = () => {
    if (theme === 'claro') {
      setTheme('escuro');
    } else if (theme === 'escuro') {
      setTheme('sistema');
    } else {
      setTheme('claro');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        textSize,
        setTheme,
        setTextSize,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
