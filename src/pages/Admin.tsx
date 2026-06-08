import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Label, Switch } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { ThemeLangToggle } from '../components/ThemeLangToggle';
import { LogOut, Plus, Trash2, Link, Star, Copy, ExternalLink, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface CardData {
  id: string;
  slug: string;
  wxid: string;
  qrcode: string;
  is_default: boolean;
}

export default function Admin() {
  const { logout } = useAuth();
  const { t } = usePreferences();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [wxid, setWxid] = useState('');
  const [slug, setSlug] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      if (Array.isArray(data)) setCards(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('admin.deleteErr'));
      fetchCards();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/cards/${id}/default`, { method: 'PATCH' });
    fetchCards();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !wxid) return;
    setSubmitting(true);
    setErrorMsg('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('wxid', wxid);
    if (slug) formData.append('slug', slug);
    formData.append('is_default', String(isDefault));

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        let errorTxt = t('admin.createErr');
        if (data?.error === 'Slug already exists') errorTxt = t('admin.slugExist');
        if (data?.error === 'Reserved URL suffix') errorTxt = t('admin.slugReserved');
        throw new Error(errorTxt);
      }
      
      setShowForm(false);
      setWxid('');
      setSlug('');
      setIsDefault(false);
      setFile(null);
      fetchCards();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      {/* Navbar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">WeCard Admin</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeLangToggle />
            <Button variant="ghost" onClick={logout} className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 pr-2">
              <span className="mr-2 hidden sm:inline">{t('admin.logout')}</span><LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.cards')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('admin.cardsDesc')}</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="shrink-0">
            {showForm ? t('admin.cancel') : <><Plus className="w-4 h-4 mr-2" /> {t('admin.newCard')}</>}
          </Button>
        </div>

        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8">
            <Card className="p-6 border-blue-100 dark:border-blue-900/30 bg-white dark:bg-gray-900 shadow-blue-900/5">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('admin.addTitle')}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wxid">{t('admin.wxid')} <span className="text-red-500">*</span></Label>
                      <Input id="wxid" value={wxid} onChange={e => setWxid(e.target.value)} required placeholder="e.g., wechat_user_123" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="slug">{t('admin.slug')}</Label>
                      <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder={t('admin.slugPh')} />
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                      <Switch checked={isDefault} onChange={setIsDefault} />
                      <Label className="cursor-pointer" onClick={() => setIsDefault(!isDefault)}>{t('admin.setDefault')}</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('admin.qr')} <span className="text-red-500">*</span></Label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-800/50">
                      <div className="space-y-1 text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                          <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 dark:focus-within:ring-offset-gray-900 px-2 py-1">
                            <span>{t('admin.upload')}</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} required />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">{t('admin.uploadTip')}</p>
                        {file && <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2 truncate w-48 mx-auto">{file.name}</p>}
                      </div>
                    </div>
                  </div>
                  
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                  {errorMsg ? <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-md">{errorMsg}</div> : <div/>}
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t('admin.creating') : t('admin.create')}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 rounded-full border-4 border-gray-200 dark:border-gray-800 border-t-blue-600 animate-spin" /></div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 border-dashed">
            <Link className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('admin.noCards')}</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">{t('admin.noCardsTip')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map(card => (
              <Card key={card.id} className="flex flex-col relative group">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="inline-flex items-center space-x-1.5 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 text-xs font-mono font-medium text-gray-800 dark:text-gray-300 break-all">
                      <span>/{card.slug}</span>
                    </div>
                    {card.is_default && (
                      <span className="inline-flex items-center text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 px-2.5 py-0.5 rounded-full">
                        <Star className="w-3 h-3 justify-center mr-1 fill-current" /> {t('admin.default')}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg overflow-hidden shrink-0 shadow-sm p-1">
                      <img src={`/uploads/${card.qrcode}`} className="w-full h-full object-contain" alt="QR" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('admin.wxid')}</p>
                      <p className="text-gray-900 dark:text-white font-medium truncate" title={card.wxid}>{card.wxid}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 p-3 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button variant="ghost" onClick={() => window.open(`/${card.slug}`, '_blank')} className="h-8 px-2 text-gray-500" title={t('admin.visit')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${card.slug}`); alert(t('admin.copied')); }} className="h-8 px-2 text-gray-500" title={t('admin.copyLink')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => {
                      const template = `如需咨询/售后/福利，请点击链接联系：\n👉 ${window.location.origin}/${card.slug}\n（点击右上角…用浏览器打开，可一键加🌍）`;
                      navigator.clipboard.writeText(template); 
                      alert(t('admin.copied')); 
                    }} className="h-8 px-2 text-gray-500" title={t('admin.copyTemplate')}>
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    {!card.is_default && (
                       <Button variant="ghost" onClick={() => handleSetDefault(card.id)} className="h-8 px-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs" title={t('admin.getDefault')}>
                        {t('admin.getDefault')}
                      </Button>
                    )}
                    <Button variant="ghost" className="h-8 px-2 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => handleDelete(card.id)} title={t('admin.delete')}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
