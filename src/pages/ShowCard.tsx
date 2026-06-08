import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Card, Button } from '../components/ui';
import { usePreferences } from '../context/PreferencesContext';
import { ThemeLangToggle } from '../components/ThemeLangToggle';
import { MessageCircle, Copy, ExternalLink, Check } from 'lucide-react';

interface CardData {
  id: string;
  slug: string;
  wxid: string;
  qrcode: string;
}

export default function ShowCard() {
  const { slug } = useParams();
  const { t } = usePreferences();
  const [data, setData] = useState<CardData | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (data?.wxid) {
      navigator.clipboard.writeText(data.wxid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenWechat = () => {
    window.location.href = 'weixin://';
  };

  useEffect(() => {
    fetch(`/api/cards/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400">
        {t('show.notFound')}
      </div>
    );
  }

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-500 dark:text-gray-400">
      {t('show.loading')}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gray-100 dark:bg-gray-950 relative">
      <div className="flex-1 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <Card className="overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/20 border-none bg-white dark:bg-gray-900">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-800 p-4 sm:p-5 text-center text-white relative flex flex-col items-center">
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute top-2 right-2 z-20">
                <ThemeLangToggle btnClassName="text-white hover:text-white hover:bg-white/20 dark:text-white dark:hover:text-white dark:hover:bg-white/20" />
              </div>
              <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-2 border border-white/30 shadow-sm mt-3">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="relative z-10 text-base sm:text-lg font-semibold tracking-wide">{t('show.title')}</h1>
            </div>

            {/* QR Code Section */}
            <div className="p-4 sm:p-5 flex flex-col items-center">
              <div className="p-1 sm:p-1.5 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm bg-white dark:bg-gray-800 mb-3 sm:mb-4 w-full flex justify-center">
                <img 
                  src={`/uploads/${data.qrcode}`} 
                  alt="WeChat QR Code" 
                  className="w-full max-w-[260px] max-h-[42vh] object-contain rounded-lg"
                />
              </div>

              <div 
                className="bg-gray-50 dark:bg-gray-800/50 w-full rounded-xl p-3 sm:p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800 mb-3 sm:mb-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={handleCopy}
              >
                <div className="flex flex-row items-center flex-1 overflow-hidden">
                  <span className="text-sm text-gray-500 font-medium whitespace-nowrap mr-3">{t('show.wxid')}:</span>
                  <span className="font-mono text-gray-900 dark:text-white text-lg sm:text-xl font-bold select-all truncate tracking-tight">{data.wxid}</span>
                </div>
                <div className="text-gray-400 dark:text-gray-500 ml-2" title={t('show.copyId')}>
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </div>
              </div>

              <div className="flex flex-col space-y-2 w-full mb-3">
                <Button 
                  variant="primary" 
                  className="w-full bg-[#07c160] hover:bg-[#06ad56] text-white border-0 h-10 sm:h-11 shadow-sm"
                  onClick={handleOpenWechat}
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  {t('show.openWechat')}
                </Button>
              </div>
              
              <p className="text-[10px] sm:text-[11px] text-center text-gray-400 dark:text-gray-500 leading-relaxed whitespace-pre-line">
                {t('show.footerTxt')}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
