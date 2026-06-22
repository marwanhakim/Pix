import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Shield, User, Lock, Sparkles, KeyRound } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, loginWithGoogle, staffUsers } = useApp();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'cashier' | 'captain'>('owner');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Preloaded account matcher
    const preset = staffUsers.find(
      s => s.email.toLowerCase() === email.toLowerCase() && s.role === selectedRole
    );

    if (preset) {
      login(preset.email, preset.role);
    } else {
      // Allow fallback login matching using custom credentials for showcase
      if (email.includes('@') && password.length >= 4) {
        login(email, selectedRole);
      } else {
        setErrorMsg('البيانات غير متوافقة! أدخل بريداً وإلكترونياً صالحاً وكلمة مرور من 4 خانات على الأقل.');
      }
    }
  };

  const handleQuickLogin = (role: 'owner' | 'cashier' | 'captain') => {
    const preset = staffUsers.find(s => s.role === role);
    if (preset) {
      login(preset.email, preset.role);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      const success = await loginWithGoogle();
      if (!success) {
        setErrorMsg('فشل تسجيل الدخول باستخدام Google، يرجى التحقق من اتصال الشبكة.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'بريد Google ملغى أو حدث خطأ أثناء الاتصال سحابياً.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none text-right" dir="rtl">
      
      {/* Decorative neon backdrop grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>

      {/* Main Container */}
      <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-md relative z-10 shadow-2xl space-y-6">
        
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-indigo-600 p-4 rounded-2xl shadow-lg ring-4 ring-indigo-500/20 mb-2">
            <Gamepad2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-sans font-black text-2xl text-white tracking-tight">صالة نكسس لألعاب البليستيشن</h2>
          <p className="text-xs text-slate-400">بوابة الإدارة المركزية وحسابات المقصف والورديات اليومية</p>
        </div>

        {/* Form Error alert section */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Method 1: Google Cloud Real-time Persistence Sync */}
        <div className="space-y-3">
          <span className="text-xs text-cyan-400 font-bold block mb-2 border-b border-slate-800 pb-2">
            ☁️ المزامنة السحابية الحقيقية (Firestore):
          </span>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black transition-all duration-300 shadow-xl cursor-pointer border border-slate-200"
          >
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>الدخول عبر حساب Google للمزامنة الحية</span>
          </button>
          <p className="text-[10px] text-slate-400 leading-relaxed text-center">
            * لتفويض الـ Owner تلقائياً بواسطة القواعد الأمنية، استخدم البريد <span className="text-yellow-400 font-semibold font-mono">mero7.rap7@gmail.com</span>
          </p>
        </div>

        {/* Split line */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800/80"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold tracking-widest uppercase">أو تجربة محلية تجريبية</span>
          <div className="flex-grow border-t border-slate-800/80"></div>
        </div>

        {/* Method 2: Interactive quick entry roles (Highly recommended for previewing) */}
        <div className="space-y-3">
          <span className="text-xs text-indigo-400 font-bold block mb-2 border-b border-slate-800 pb-2">
            ⭐ دخول سريع بضغطة زر (محاكي محلي):
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleQuickLogin('owner')}
              className="p-3 bg-slate-950/60 border border-slate-800 hover:border-yellow-400/40 rounded-xl text-center group cursor-pointer transition-all duration-300"
            >
              <Shield className="h-5 w-5 mx-auto text-yellow-400 group-hover:scale-110 duration-200" />
              <span className="text-xs font-bold text-slate-200 block mt-1.5 font-sans">المالك</span>
              <span className="text-[9px] text-slate-500 block">كامل الصلاحيات</span>
            </button>
            <button
              onClick={() => handleQuickLogin('cashier')}
              className="p-3 bg-slate-950/60 border border-slate-800 hover:border-cyan-400/40 rounded-xl text-center group cursor-pointer transition-all duration-300"
            >
              <User className="h-5 w-5 mx-auto text-cyan-400 group-hover:scale-110 duration-200" />
              <span className="text-xs font-bold text-slate-200 block mt-1.5 font-sans">الكاشير</span>
              <span className="text-[9px] text-slate-500 block">إدارة الجلسات</span>
            </button>
            <button
              onClick={() => handleQuickLogin('captain')}
              className="p-3 bg-slate-950/60 border border-slate-800 hover:border-emerald-400/40 rounded-xl text-center group cursor-pointer transition-all duration-300"
            >
              <Gamepad2 className="h-5 w-5 mx-auto text-emerald-400 group-hover:scale-110 duration-200" />
              <span className="text-xs font-bold text-slate-200 block mt-1.5 font-sans">كابتن الصالة</span>
              <span className="text-[9px] text-slate-500 block">التشغيل بوفيه</span>
            </button>
          </div>
        </div>

        {/* Method 3: Manual Credentials input panel */}
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold block">البريد الإلكتروني للوردية:</label>
            <div className="relative">
              <input
                type="email"
                placeholder="owner@lounge.com أو cashier@lounge.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
              />
              <KeyRound className="h-4 w-4 text-slate-500 absolute top-3.5 right-3" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold block">كلمة المرور المشفرة:</label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
              />
              <Lock className="h-4 w-4 text-slate-500 absolute top-3.5 right-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold block">اختر فـئة الموظف:</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSelectedRole('owner')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${selectedRole === 'owner' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                المالك
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('cashier')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${selectedRole === 'cashier' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                خدمة الكاشير
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('captain')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${selectedRole === 'captain' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                كابتن الصالة
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-lg cursor-pointer"
          >
            تسجيل الدخول الآمن للنظام
          </button>
        </form>

        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 text-[10px] text-slate-500 flex items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>تنبيه: لأغراض اختبار دمج Firebase، يتم مزامنة هذه الصلاحيات فورياً.</span>
        </div>

      </div>
    </div>
  );
};
