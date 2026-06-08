import React from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from './ui';

export function ThemeLangToggle({ className, btnClassName }: { className?: string, btnClassName?: string }) {
  const { theme, setTheme, language, setLanguage, t } = usePreferences();

  const toggleLang = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <div className={`flex items-center space-x-1 ${className || ''}`}>
      <Button type="button" variant="ghost" onClick={cycleTheme} className={`w-10 h-10 p-0 rounded-full ${btnClassName || 'text-gray-500'}`} title={t('theme.' + theme)}>
        {theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
      </Button>
      <Button type="button" variant="ghost" onClick={toggleLang} className={`w-10 h-10 p-0 rounded-full text-xs font-bold ${btnClassName || 'text-gray-500'}`} title={language === 'zh' ? 'English' : '中文'}>
        {language === 'zh' ? 'EN' : '中'}
      </Button>
    </div>
  );
}
