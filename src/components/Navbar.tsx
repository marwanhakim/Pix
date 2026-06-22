import React from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Sparkles, UserCheck, Power, Gamepad2, Coffee, Layers, Clock, ShieldCheck, UserCog, Settings } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, login, logout, devices, sessions, staffUsers } = useApp();

  const busyDevicesCount = devices.filter(d => d.status === 'busy').length;
  const totalDevicesCount = devices.length;
  const activeGamersCount = sessions.filter(s => s.status === 'active').length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Right section: Elegant Brand Name with Gamepad Icon */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg ring-4 ring-indigo-500/20 animate-pulse">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-l from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                نظام أرکاد البليستيشن
              </h1>
              <span className="text-xs text-slate-400 block -mt-1">إدارة الصالة والمبيعات والاشتراكات</span>
            </div>
          </div>

          {/* Center Section: Tab Switcher (Visible when logged in) */}
          {currentUser && (
            <nav className="hidden md:flex space-x-1 space-x-reverse bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                }`}
              >
                <Layers className="h-4 w-4" />
                لوحة الأجهزة
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'customers'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                الزبائن والاشتراكات
              </button>

              <button
                onClick={() => setActiveTab('cafe')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'cafe'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                }`}
              >
                <Coffee className="h-4 w-4" />
                الكافتيريا
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                }`}
              >
                <Clock className="h-4 w-4" />
                سجل الجلسات السابقة
              </button>

              {/* Reports require Cashier or Owner privileges */}
              {currentUser.role !== 'captain' && (
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'reports'
                      ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  المبيعات والتقارير المالية
                </button>
              )}

              {/* Staff Management exclusively for Owner */}
              {currentUser.role === 'owner' && (
                <>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === 'staff'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 text-yellow-400" />
                    إدارة الموظفين
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === 'settings'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                    }`}
                  >
                    <Settings className="h-4 w-4 text-indigo-400" />
                    الإعدادات وسجل النشاط
                  </button>
                </>
              )}
            </nav>
          )}

          {/* Left section: Staff switching widget with role-based access */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-left hidden lg:block">
                  <div className="text-sm font-semibold text-slate-100 flex items-center justify-end gap-1.5">
                    {currentUser.role === 'owner' && <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">مالك</span>}
                    {currentUser.role === 'cashier' && <span className="text-cyan-400 text-xs bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">كاشير</span>}
                    {currentUser.role === 'captain' && <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">كابتن</span>}
                    {currentUser.name}
                  </div>
                  <span className="text-xs text-slate-400 block">{currentUser.email}</span>
                </div>

                {/* Switcher Dropdown for checking user credentials / simulation tests */}
                <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-400 px-2 hidden sm:inline">تبديل الصلاحية للمحاكاة:</span>
                  <select
                    value={currentUser.role}
                    onChange={(e) => {
                      const selected = staffUsers.find(st => st.role === e.target.value);
                      if (selected) {
                        login(selected.email, selected.role);
                      }
                    }}
                    className="bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 py-1 px-2 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="owner">المالك (كامل الصلاحيات)</option>
                    <option value="cashier">الكاشير (تشغيل ومحاسبة)</option>
                    <option value="captain">الكابتن (تشغيل وطلب مقصف)</option>
                  </select>
                </div>

                <button
                  onClick={logout}
                  title="تسجيل الخروج"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Power className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-xl text-yellow-400 text-xs">
                <Sparkles className="h-4 w-4" />
                <span>الرجاء تسجيل الدخول للبدء</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      {currentUser && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 flex justify-around py-2.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            الأجهزة ({busyDevicesCount}/{totalDevicesCount})
          </button>
          
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'customers' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            الزبائن
          </button>
          
          <button
            onClick={() => setActiveTab('cafe')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'cafe' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coffee className="h-4 w-4 text-emerald-400" />
            الكافتيريا
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'history' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-4 w-4 text-indigo-400" />
            تاريخ السجل
          </button>

          {currentUser.role !== 'captain' && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                activeTab === 'reports' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="h-4 w-4" />
              التقارير
            </button>
          )}

          {currentUser.role === 'owner' && (
            <>
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  activeTab === 'staff' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCog className="h-4 w-4 text-yellow-400" />
                الموظفين
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  activeTab === 'settings' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings className="h-3.5 w-3.5 text-indigo-450" />
                الإعدادات
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
