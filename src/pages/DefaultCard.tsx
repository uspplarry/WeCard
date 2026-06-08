import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../context/PreferencesContext';
import { ThemeLangToggle } from '../components/ThemeLangToggle';

export default function DefaultCard() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/cards/default')
      .then(res => {
        if (!res.ok) throw new Error('No default card');
        return res.json();
      })
      .then(data => {
        navigate(`/${data.slug}`, { replace: true });
      })
      .catch(e => {
        setError(true);
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400 relative">
        <div className="absolute top-4 right-4"><ThemeLangToggle /></div>
        <div className="text-center">
          <p className="text-lg">{t('defaultCard.loginTip')}</p>
          <a href="/admin" className="text-sm mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">{t('defaultCard.link')}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400">
      {t('defaultCard.loading')}
    </div>
  );
}
