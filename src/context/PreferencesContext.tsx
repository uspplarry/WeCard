import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'zh' | 'en';

interface PreferencesContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    "login.title": "管理员登录",
    "login.subtitle": "登录管理 WeCard",
    "login.username": "用户名",
    "login.password": "密码",
    "login.signIn": "登录",
    "login.signingIn": "登录中...",
    "login.invalid": "用户名或密码错误",
    "admin.cards": "名片管理",
    "admin.cardsDesc": "管理您的路由链接和二维码",
    "admin.newCard": "新建名片",
    "admin.cancel": "取消",
    "admin.logout": "退出",
    "admin.addTitle": "添加客服名片",
    "admin.wxid": "微信号",
    "admin.slug": "自定义短链 (Slug)",
    "admin.slugPh": "留空自动生成",
    "admin.setDefault": "设为默认展示 (/)",
    "admin.qr": "二维码图片",
    "admin.upload": "点击上传文件",
    "admin.uploadTip": "支持 PNG, JPG, GIF",
    "admin.create": "创建名片",
    "admin.creating": "创建中...",
    "admin.noCards": "暂无名片",
    "admin.noCardsTip": "点击新建名片开始",
    "admin.visit": "访问",
    "admin.copyLink": "复制链接",
    "admin.copyTemplate": "复制话术",
    "admin.getDefault": "设为默认",
    "admin.default": "默认",
    "admin.delete": "删除",
    "admin.deleteConfirm": "确定要删除此名片吗？",
    "admin.copied": "复制成功！",
    "admin.deleteSuccess": "删除成功",
    "admin.deleteErr": "删除失败，请重试",
    "admin.createErr": "创建失败，请重试",
    "admin.slugExist": "自定义短链已存在，请更换",
    "admin.slugReserved": "该自定义短链为系统保留，请更换",
    "show.title": "微信客服",
    "show.subtitle": "扫一扫，添加客服微信",
    "show.wxid": "微信号",
    "show.copyId": "复制微信号",
    "show.openWechat": "打开微信",
    "show.footerTxt": "请使用微信扫描上方二维码，\n或复制微信号手动添加",
    "show.loading": "正在加载...",
    "show.notFound": "您访问的名片不存在",
    "theme.light": "浅色主题",
    "theme.dark": "暗黑模式",
    "theme.system": "跟随系统",
    "defaultCard.loading": "正在加载默认名片...",
    "defaultCard.loginTip": "未设置默认名片。请登录后台管理系统进行设置。",
    "defaultCard.link": "前往登录",
    "auth.checking": "检查登录状态中..."
  },
  en: {
    "login.title": "Admin Login",
    "login.subtitle": "Sign in to manage WeCard",
    "login.username": "Username",
    "login.password": "Password",
    "login.signIn": "Sign In",
    "login.signingIn": "Signing in...",
    "login.invalid": "Invalid username or password",
    "admin.cards": "Cards",
    "admin.cardsDesc": "Manage your routing links and QR codes.",
    "admin.newCard": "New Card",
    "admin.cancel": "Cancel",
    "admin.logout": "Logout",
    "admin.addTitle": "Add Customer Service Card",
    "admin.wxid": "WeChat ID",
    "admin.slug": "Custom URL Suffix (Slug)",
    "admin.slugPh": "Leave blank for random",
    "admin.setDefault": "Set as Default Route (/)",
    "admin.qr": "QR Code Image",
    "admin.upload": "Upload an image",
    "admin.uploadTip": "PNG, JPG, GIF",
    "admin.create": "Create Card",
    "admin.creating": "Creating...",
    "admin.noCards": "No cards",
    "admin.noCardsTip": "Get started by creating a new routing card.",
    "admin.visit": "Visit",
    "admin.copyLink": "Copy Link",
    "admin.copyTemplate": "Copy Message Template",
    "admin.getDefault": "Set Default",
    "admin.default": "Default",
    "admin.delete": "Delete",
    "admin.deleteConfirm": "Delete this card?",
    "admin.copied": "Copied!",
    "admin.deleteSuccess": "Deleted successfully",
    "admin.deleteErr": "Failed to delete, please try again",
    "admin.createErr": "Failed to create, please try again",
    "admin.slugExist": "This URL suffix already exists",
    "admin.slugReserved": "This URL suffix is reserved by the system",
    "show.title": "Customer Service",
    "show.subtitle": "Scan to connect on WeChat",
    "show.wxid": "WeChat ID",
    "show.copyId": "Copy ID",
    "show.openWechat": "Open WeChat",
    "show.footerTxt": "Open WeChat and scan the QR code above,\n or copy the ID to add us manually.",
    "show.loading": "Loading...",
    "show.notFound": "Card not found.",
    "theme.light": "Light Theme",
    "theme.dark": "Dark Theme",
    "theme.system": "System Theme",
    "defaultCard.loading": "Loading default card...",
    "defaultCard.loginTip": "No default card set. Please log in to the admin panel to set one.",
    "defaultCard.link": "Go to Admin",
    "auth.checking": "Checking authentication..."
  }
};

const PreferencesContext = createContext<PreferencesContextType>({} as PreferencesContextType);

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'zh';
  });

  const applyTheme = (t: Theme) => {
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  };

  useEffect(() => {
    applyTheme(theme);
    const listener = () => {
      if (theme === 'system') applyTheme('system');
    };
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  };

  const setLanguage = (l: Language) => {
    setLanguageState(l);
    localStorage.setItem('lang', l);
  };

  const t = (key: string) => translations[language][key] || key;

  return (
    <PreferencesContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
