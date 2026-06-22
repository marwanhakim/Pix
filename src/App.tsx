import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { DeviceGrid } from './components/DeviceGrid';
import { SessionModal } from './components/SessionModal';
import { DirectSaleModal } from './components/DirectSaleModal';
import { CustomerManager } from './components/CustomerManager';
import { MenuManager } from './components/MenuManager';
import { FinancialReports } from './components/FinancialReports';
import { SessionsHistory } from './components/SessionsHistory';
import { LoginScreen } from './components/LoginScreen';
import { StaffManager } from './components/StaffManager';
import { SettingsManager } from './components/SettingsManager';
import { Device, GameSession } from './types';
import { 
  Gamepad2, CalendarRange, Clock, Sparkles, LogOut, CheckCircle2, 
  HelpCircle, ShieldCheck, Activity, Coffee, Wrench 
} from 'lucide-react';

function LoungeAppContent() {
  const { currentUser, devices, sessions, menuItems } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Selected device for starting or closing session
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);
  const [showDirectSaleModal, setShowDirectSaleModal] = useState(false);

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Fallback redirect if non-owner tries to inspect staff management or settings tabs
  if (currentUser.role !== 'owner' && (activeTab === 'staff' || activeTab === 'settings')) {
    setActiveTab('dashboard');
  }

  // Fallback redirect if Captain tries to inspect reports
  if (currentUser.role === 'captain' && activeTab === 'reports') {
    setActiveTab('dashboard');
  }

  const reactiveActiveSession = selectedDevice 
    ? sessions.find(s => s.deviceId === selectedDevice.id && s.status === 'active') 
    : null;

  const modalActiveSession = (selectedSession && selectedSession.status !== 'active')
    ? selectedSession
    : reactiveActiveSession;

  const handleSelectDevice = (device: Device, activeSession?: GameSession) => {
    setSelectedDevice(device);
    setSelectedSession(activeSession || null);
  };

  const busyDevices = devices.filter(d => d.status === 'busy').length;
  const maintenanceDevices = devices.filter(d => d.status === 'maintenance').length;
  const availableDevices = devices.filter(d => d.status === 'available' || !d.status).length;
  const activeSnackOrders = sessions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.orders.reduce((oSum, o) => oSum + o.quantity, 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Bar Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Inner Wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-grow w-full space-y-8 relative z-10">
        
        {/* Dynamic welcome greetings bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-1.5 font-sans">
              أهلاً بك مجدداً،
              <span className="bg-indigo-600/10 text-indigo-400 px-2.5 py-0.5 rounded-lg border border-indigo-500/10">
                {currentUser.name} 👋
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">تاريخ العمل اليومي الحالي: {new Date().toLocaleDateString('ar-EG', { dateStyle: 'full' })}</p>
          </div>

          {/* Quick Stats Grid Pill */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="px-3.5 py-1.5 bg-slate-950 rounded-xl border border-slate-850 flex items-center gap-1.5 text-slate-300">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>الأجهزة النشطة: {busyDevices} / {devices.length}</span>
            </div>
            <div className="px-3.5 py-1.5 bg-slate-950 rounded-xl border border-slate-850 flex items-center gap-1.5 text-slate-300">
              <Coffee className="h-4 w-4 text-emerald-400 animate-bounce" />
              <span>طلبات مقصف جارية: {activeSnackOrders}</span>
            </div>
          </div>
        </div>

        {/* Tab Routing Renders */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Quick Informative Section Card */}
            <div className="bg-gradient-to-l from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/15 p-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1 text-right">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/10">
                  مراقبة الصالة الفورية
                </span>
                <h3 className="text-md font-bold text-slate-100 pt-1.5">شاشات وأجهزة البليستيشن المتوفرة</h3>
                <p className="text-xs text-slate-400">انقر على أي جهاز لبدء جلسة سريعة، مبيعات المقصف، إصدار الفواتير أو تسويتها دفعة واحدة.</p>
              </div>

              {/* Tally boxes & Quick Cafeteria Direct Sale */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2 bg-slate-950/60 rounded-xl border border-slate-800 text-center min-w-24">
                  <span className="text-slate-500 text-[10px] block">شاغرة ومتاحة</span>
                  <span className="text-emerald-400 font-bold text-sm font-mono">{availableDevices}</span>
                </div>
                <div className="px-4 py-2 bg-slate-950/60 rounded-xl border border-slate-800 text-center min-w-24">
                  <span className="text-slate-500 text-[10px] block">قيد الاستعمال</span>
                  <span className="text-indigo-400 font-bold text-sm font-mono">{busyDevices}</span>
                </div>
                {maintenanceDevices > 0 && (
                  <div className="px-4 py-2 bg-slate-950/60 rounded-xl border border-amber-500/20 text-center min-w-24">
                    <span className="text-slate-500 text-[10px] block">تحت الصيانة 🛠️</span>
                    <span className="text-amber-500 font-bold text-sm font-mono">{maintenanceDevices}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowDirectSaleModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-md shadow-emerald-950/40 cursor-pointer flex items-center gap-2"
                >
                  <Coffee className="h-4 w-4" />
                  <span>بيع كافتيريا مباشر 🛒</span>
                </button>
              </div>
            </div>

            {/* PlayStation Device Selection grid */}
            <DeviceGrid onSelectDevice={handleSelectDevice} />
          </div>
        )}

        {activeTab === 'customers' && (
          <CustomerManager />
        )}

        {activeTab === 'cafe' && (
          <MenuManager />
        )}

        {activeTab === 'reports' && currentUser.role !== 'captain' && (
          <FinancialReports />
        )}

        {activeTab === 'history' && (
          <SessionsHistory />
        )}

        {activeTab === 'staff' && currentUser.role === 'owner' && (
          <StaffManager />
        )}

        {activeTab === 'settings' && currentUser.role === 'owner' && (
          <SettingsManager />
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="text-center py-8 text-[11px] text-slate-600 space-y-1 relative z-10 border-t border-slate-900 max-w-7xl mx-auto w-full mt-12 select-none">
        <p>نظام إدارة صالة البليستيشن المركزي - متزامن بقاعدة بيانات سحابية ٢٠٢٦</p>
        <p className="text-[10px]">مطور بالكامل باللغة العربية مع دعم طباعة فواتير POS وتنبيهات انتهاء الوقت الفورية</p>
      </footer>

      {/* MODAL CONTROLLER OVERLAYS */}
      {selectedDevice && (
        <SessionModal
          device={selectedDevice}
          activeSession={modalActiveSession}
          onClose={() => {
            setSelectedDevice(null);
            setSelectedSession(null);
          }}
        />
      )}

      {showDirectSaleModal && (
        <DirectSaleModal
          onClose={() => setShowDirectSaleModal(false)}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <LoungeAppContent />
    </AppProvider>
  );
}
