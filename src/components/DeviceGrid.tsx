import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Device, GameSession } from '../types';
import { 
  Monitor, Play, CheckCircle2, AlertTriangle, Coffee, Timer, 
  User, ShieldAlert, Plus, Edit2, Trash2, X, Check, Eye, Wrench
} from 'lucide-react';

// STUNNING 2D CUSTOM SVG ILLUSTRATIONS POPPING OUT OF DEVICE CARDS
const PlayStation5Visual: React.FC = () => (
  <div className="absolute -left-3 -bottom-3 w-16 h-28 pointer-events-none select-none z-0 transition-all duration-500 ease-out group-hover:scale-115 group-hover:-translate-y-2 group-hover:-rotate-6 drop-shadow-[0_8px_16px_rgba(59,130,246,0.35)]">
    <svg viewBox="0 0 80 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Soft Blue neon behind console */}
      <ellipse cx="40" cy="90" rx="20" ry="30" fill="rgba(59, 130, 246, 0.25)" className="filter blur-md animate-pulse" />
      
      {/* PS5 Left Wing curving */}
      <path d="M26 15C32 28 35 60 35 105C35 118 31 123 26 128C33 128 39 120 39 105C39 60 36 28 30 15H26Z" fill="#F8FAFC" opacity="0.95" />
      
      {/* PS5 Right Wing curving */}
      <path d="M54 15C48 28 45 60 45 105C45 118 49 123 54 128C47 128 41 120 41 105C41 60 44 28 50 15H54Z" fill="#E2E8F0" />
      
      {/* Black core inside the wings */}
      <path d="M31 18C33 28 36 60 36 105C36 114 34 121 32 125H48C46 121 44 114 44 105C44 60 47 28 49 18H31Z" fill="#0B0F19" />
      
      {/* Blue LED Light strips glowing on inner edges */}
      <path d="M33 22C35 30 38 60 38 102" stroke="#3B82F6" strokeWidth="1" opacity="0.9" />
      <path d="M47 22C45 30 42 60 42 102" stroke="#3B82F6" strokeWidth="1" opacity="0.9" />

      {/* Futuristic Stand/Base */}
      <ellipse cx="40" cy="126" rx="15" ry="4" fill="#0F172A" />
      <ellipse cx="40" cy="126" rx="12" ry="2" fill="#1E293B" stroke="#334155" strokeWidth="0.5" />
      
      {/* Tiny DualSense controller nested below */}
      <g transform="translate(32, 102) scale(0.4)" className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
        <path d="M10 25C10 15 18 10 30 10C42 10 50 15 50 25C50 35 44 45 42 48C40 50 36 46 34 44H26C24 46 20 50 18 48C16 45 10 35 10 25Z" fill="#F1F5F9" />
        <path d="M16 26C16 19 22 15 30 15C38 15 44 19 44 26C44 33 39 40 30 40C21 40 16 33 16 26Z" fill="#0F172A" />
        <circle cx="23" cy="30" r="3" fill="#64748B" />
        <circle cx="37" cy="30" r="3" fill="#64748B" />
        <rect x="18" y="21" width="3" height="1" fill="#CBD5E1" />
        <rect x="19" y="20" width="1" height="3" fill="#CBD5E1" />
        <circle cx="41" cy="21" r="1" fill="#CBD5E1" />
        <circle cx="39" cy="23" r="1" fill="#CBD5E1" />
        <path d="M27 24H33" stroke="#3B82F6" strokeWidth="0.75" />
      </g>
    </svg>
  </div>
);

const BilliardsVisual: React.FC = () => (
  <div className="absolute -left-4 -bottom-3 w-32 h-24 pointer-events-none select-none z-0 transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-2 drop-shadow-[0_8px_16px_rgba(16,185,129,0.35)]">
    <svg viewBox="0 0 110 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Emerald neon green glow */}
      <rect x="15" y="15" width="80" height="50" rx="6" fill="rgba(16, 185, 129, 0.2)" className="filter blur-md animate-pulse" />
      
      {/* Table Legs 3D effect */}
      <path d="M22 55L18 72H25L27 55" fill="#2D1500" stroke="#1C0D02" strokeWidth="0.5" />
      <path d="M88 55L92 72H85L83 55" fill="#2D1500" stroke="#1C0D02" strokeWidth="0.5" />
      <path d="M50 55L48 70H54L52 55" fill="#1C0D02" />

      {/* Wooden Table Rim perspective rectangle */}
      <path d="M12 20H98V53H12V20Z" fill="#5C2D06" stroke="#401F03" strokeWidth="1.5" />
      <path d="M14 22H96V51H14V22Z" fill="#3A1C03" />

      {/* Emerald Pool Table Felt */}
      <path d="M18 26H92V47H18V26Z" fill="#059669" />
      
      {/* Subtle lines on felt */}
      <line x1="32" y1="26" x2="32" y2="47" stroke="#047857" strokeWidth="0.75" strokeDasharray="2 2" />

      {/* Pocket holes (Circular dark recesses) */}
      <circle cx="18" cy="26" r="2.5" fill="#0F172A" /> {/* Top Left */}
      <circle cx="55" cy="25" r="2" fill="#0F172A" />   {/* Top Middle */}
      <circle cx="92" cy="26" r="2.5" fill="#0F172A" /> {/* Top Right */}
      <circle cx="18" cy="47" r="2.5" fill="#0F172A" /> {/* Bottom Left */}
      <circle cx="55" cy="48" r="2" fill="#0F172A" />   {/* Bottom Middle */}
      <circle cx="92" cy="47" r="2.5" fill="#0F172A" /> {/* Bottom Right */}

      {/* Billiard Balls */}
      {/* Cue Ball (White) */}
      <circle cx="36" cy="38" r="1.5" fill="#FFFFFF" />
      
      {/* Cluster of red, yellow, black balls */}
      <g transform="translate(68, 36)">
        {/* Row 1 */}
        <circle cx="0" cy="0" r="1.5" fill="#EF4444" /> {/* Apex Red */}
        {/* Row 2 */}
        <circle cx="2.5" cy="-1.5" r="1.5" fill="#F59E0B" /> {/* Yellow */}
        <circle cx="2.5" cy="1.5" r="1.5" fill="#1D4ED8" />  {/* Blue */}
        {/* Row 3 */}
        <circle cx="5" cy="-3" r="1.5" fill="#EF4444" />
        <circle cx="5" cy="0" r="1.5" fill="#0F172A" /> {/* Black 8 Ball */}
        <circle cx="5" cy="3" r="1.5" fill="#EF4444" />
      </g>

      {/* Pool Cue Sticks crossing in background or laying top */}
      <line x1="22" y1="44" x2="62" y2="34" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" />
      <line x1="22" y1="44" x2="26" y2="43" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="62" cy="34" r="0.4" fill="#FFFFFF" /> {/* Cue tip */}
    </svg>
  </div>
);

const VIPConsoleVisual: React.FC = () => (
  <div className="absolute -left-3 -bottom-3 w-16 h-28 pointer-events-none select-none z-0 transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:-rotate-6 drop-shadow-[0_8px_16px_rgba(245,158,11,0.35)]">
    <svg viewBox="0 0 80 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Gold neon glow behind console */}
      <ellipse cx="40" cy="90" rx="20" ry="30" fill="rgba(245, 158, 11, 0.25)" className="filter blur-md animate-pulse" />
      
      {/* Golden VIP Plates curving */}
      <path d="M26 15C32 28 35 60 35 105C35 118 31 123 26 128C33 128 39 120 39 105C39 60 36 28 30 15H26Z" fill="#F59E0B" />
      <path d="M54 15C48 28 45 60 45 105C45 118 49 123 54 128C47 128 41 120 41 105C41 60 44 28 50 15H54Z" fill="#D97706" />
      
      {/* Black core inside the wings */}
      <path d="M31 18C33 28 36 60 36 105C36 114 34 121 32 125H48C46 121 44 114 44 105C44 60 47 28 49 18H31Z" fill="#0B0F19" />
      
      {/* Gold LED Light strips glowing */}
      <path d="M33 22C35 30 38 60 38 102" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
      <path d="M47 22C45 30 42 60 42 102" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />

      {/* Base */}
      <ellipse cx="40" cy="126" rx="15" ry="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="0.5" />
      
      {/* Gold Crown indicator */}
      <g transform="translate(32, 45) scale(0.32)" fill="#FEF08A">
        <path d="M12 10L18 24H32L38 10L29 18L25 10L21 18L12 10Z" />
      </g>
    </svg>
  </div>
);

interface DeviceGridProps {
  onSelectDevice: (device: Device, activeSession?: GameSession) => void;
}

export const DeviceGrid: React.FC<DeviceGridProps> = ({ onSelectDevice }) => {
  const { 
    currentUser, devices, sessions, calculateRuntimePlayAmount, 
    addDevice, updateDevice, deleteDevice 
  } = useApp();
  
  const isOwner = currentUser?.role === 'owner';
  const isAuthorizedForMaintenance = currentUser?.role === 'owner' || currentUser?.role === 'cashier';
  
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedSection, setSelectedSection] = useState<'all' | 'standard' | 'vip' | 'billiards'>('all');

  // Control modal state
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  // Form fields state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('PS5');
  const [formSection, setFormSection] = useState<'standard' | 'vip' | 'billiards'>('standard');
  const [formRateSingle, setFormRateSingle] = useState(4000);
  const [formRateMulti, setFormRateMulti] = useState(6000);

  // Local effect to tick the clock every second for smooth, high-fidelity timing
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getActiveSession = (deviceId: string) => {
    return sessions.find(s => s.deviceId === deviceId && s.status === 'active');
  };

  const handleEditClick = (e: React.MouseEvent, device: Device) => {
    e.stopPropagation(); // Avoid opening the SessionModal when editing
    setModalMode('edit');
    setEditingDeviceId(device.id);
    setFormName(device.name);
    setFormType(device.type);
    setFormSection(device.section || 'standard');
    setFormRateSingle(device.hourlyRateSingle);
    setFormRateMulti(device.hourlyRateMulti);
    setShowDeviceModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation(); // Avoid triggering open session modal
    if (window.confirm('هل أنت متأكد من رغبتك في إزالة هذا الجهاز/الطاولة نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء.')) {
      deleteDevice(deviceId);
    }
  };

  const handleSubmitDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formType.trim()) return;

    if (modalMode === 'create') {
      addDevice(formName, formType, formSection, formRateSingle, formRateMulti);
    } else {
      if (editingDeviceId) {
        updateDevice(editingDeviceId, {
          name: formName,
          type: formType,
          section: formSection,
          hourlyRateSingle: formRateSingle,
          hourlyRateMulti: formRateMulti,
        });
      }
    }

    // Reset and close
    setFormName('');
    setFormType('PS5');
    setFormSection('standard');
    setFormRateSingle(4000);
    setFormRateMulti(6000);
    setShowDeviceModal(false);
    setEditingDeviceId(null);
  };

  // Arabic alphabetically-aware sort helper
  const sortDevicesAlphabetically = (devList: Device[]) => {
    return [...devList].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  };

  const sectionsConfig = [
    { id: 'standard', title: 'القاعة العادية', accentColor: 'bg-indigo-500' },
    { id: 'vip', title: 'قاعة الـ VIP', accentColor: 'bg-amber-500' },
    { id: 'billiards', title: 'قاعة البلياردو والمسليات', accentColor: 'bg-emerald-500' }
  ] as const;

  // Filter sections by selected tab
  const activeSections = sectionsConfig.filter(sec => {
    if (selectedSection === 'all') return true;
    return sec.id === selectedSection;
  });

  const totalMatchedDevicesCount = devices.filter(d => {
    const devSec = d.section || 'standard';
    if (selectedSection === 'all') return true;
    return devSec === selectedSection;
  }).length;

  return (
    <div className="space-y-6">
      
      {/* Category control bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        
        {/* Hall Selection Button group */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800/85">
          <button
            onClick={() => setSelectedSection('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedSection === 'all' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الكل ({devices.length})
          </button>
          
          <button
            onClick={() => setSelectedSection('standard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedSection === 'standard' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            القاعة العادية ({devices.filter(d => (d.section || 'standard') === 'standard').length})
          </button>
          
          <button
            onClick={() => setSelectedSection('vip')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedSection === 'vip' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            قاعة الـ VIP ({devices.filter(d => d.section === 'vip').length})
          </button>
          
          <button
            onClick={() => setSelectedSection('billiards')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedSection === 'billiards' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            قاعة البلياردو ({devices.filter(d => d.section === 'billiards').length})
          </button>
        </div>

        {/* Add Device Trigger Button */}
        {isOwner && (
          <button
            onClick={() => {
              setModalMode('create');
              setFormName('');
              setFormType('PS5');
              setFormSection('standard');
              setFormRateSingle(4000);
              setFormRateMulti(6000);
              setShowDeviceModal(true);
            }}
            className="flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-md shadow-indigo-950/30 border border-indigo-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            إضافة جهاز / طاولة جديدة
          </button>
        )}
      </div>

      {/* Grid rendering list */}
      {totalMatchedDevicesCount === 0 ? (
        <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Monitor className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm">لا توجد أجهزة مضافة أو مدرجة في هذا القسم حالياً.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeSections.map((sec) => {
            const sectionDevices = devices.filter(d => (d.section || 'standard') === sec.id);
            if (sectionDevices.length === 0) return null;

            const sortedDevices = sortDevicesAlphabetically(sectionDevices);

            return (
              <div key={sec.id} className="space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-3 border-b border-slate-800/60 pb-3">
                  <div className={`w-1 h-5 rounded ${sec.accentColor}`} />
                  <h3 className="text-sm font-bold text-slate-200">{sec.title}</h3>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-slate-400 font-mono">
                    {sectionDevices.length} أجهزة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedDevices.map((device) => {
                    const activeSession = getActiveSession(device.id);
                    const isBusy = device.status === 'busy' && activeSession;
                    
                    let sessionStatusLabel = '';
                    let timerLabel = '';
                    let isExpired = false;
                    let warningText = '';
                    let runningCost = 0;
                    let elapsedMinutes = 0;

                    if (isBusy && activeSession) {
                      runningCost = calculateRuntimePlayAmount(activeSession);
                      
                      const startTimeMs = new Date(activeSession.startTime).getTime();
                      const diffMs = currentTime - startTimeMs;
                      elapsedMinutes = Math.max(0, diffMs / 60000);

                      if (activeSession.sessionType === 'fixed' && activeSession.fixedDuration) {
                        const allocatedMs = activeSession.fixedDuration * 60000;
                        const remainingMs = allocatedMs - diffMs;
                        
                        if (remainingMs <= 0) {
                          isExpired = true;
                          const overdueSec = Math.abs(Math.floor(remainingMs / 1000));
                          const ovMin = Math.floor(overdueSec / 60);
                          const ovSec = overdueSec % 60;
                          timerLabel = `انتهى الوقت منذ: -${ovMin}:${ovSec.toString().padStart(2, '0')}`;
                          warningText = 'انتهت الجلسة! الرجاء تسوية الحساب أو إضافة وقت';
                        } else {
                          const remSec = Math.floor(remainingMs / 1000);
                          const remMin = Math.floor(remSec / 60);
                          const remSc = remSec % 60;
                          timerLabel = `المتبقي: ${remMin}:${remSc.toString().padStart(2, '0')}`;
                          if (remMin < 5) {
                            warningText = 'أقل من 5 دقائق متبقية!';
                          }
                        }
                        sessionStatusLabel = `محدد (${activeSession.fixedDuration} دقيقة) - ${activeSession.playType === 'single' ? 'فردي' : 'زوجي'}`;
                      } else {
                        // Open-ended timer
                        const hours = Math.floor(elapsedMinutes / 60);
                        const mins = Math.floor(elapsedMinutes % 60);
                        const secs = Math.floor((diffMs / 1000) % 65);
                        timerLabel = `عامل: ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                        sessionStatusLabel = `مفتوح اللعب - ${activeSession.playType === 'single' ? 'فردي' : 'زوجي'}`;
                      }
                    }

                    const isBilliards = device.section === 'billiards' || device.type.toLowerCase().includes('billiard') || device.name.includes('بليارد') || device.name.includes('طاولة');
                    const isVip = device.section === 'vip';
                    const isMaintenance = device.status === 'maintenance';

                    return (
                      <div
                        key={device.id}
                        id={`device-card-${device.id}`}
                        onClick={() => {
                          if (isMaintenance) return;
                          onSelectDevice(device, activeSession);
                        }}
                        className={`group cursor-pointer rounded-xl border transition-all duration-300 shadow-sm relative hover:shadow-xl hover:scale-[1.01] ${
                          isMaintenance
                            ? 'border-slate-800 bg-slate-900/40 opacity-75 ring-1 ring-slate-800'
                            : isBusy
                              ? isExpired
                                ? 'border-red-500 bg-red-950/25 shadow-red-500/10 animate-pulse ring-2 ring-red-500/40'
                                : 'border-red-500 bg-slate-800/95 ring-2 ring-red-500/30 shadow-red-500/10'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        {/* 2D Popping Visual Illustration */}
                        {isBilliards ? (
                          <BilliardsVisual />
                        ) : isVip ? (
                          <VIPConsoleVisual />
                        ) : (
                          <PlayStation5Visual />
                        )}

                        {/* Pulsing Visual Expiry indicator */}
                        {isExpired && (
                          <div className="absolute top-3 left-3 bg-red-600 text-white rounded-full p-1.5 shadow-lg animate-ping z-20">
                            <Timer className="h-4 w-4" />
                          </div>
                        )}

                        {/* Wrench icon for maintenance indicator */}
                        {isMaintenance && (
                          <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 rounded-full p-1.5 shadow-lg animate-pulse z-20">
                            <Wrench className="h-4 w-4" />
                          </div>
                        )}

                        {/* Card Header Screen */}
                        <div className="p-3.5 border-b border-slate-800/60 bg-slate-900/40 relative z-10 rounded-t-xl">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-lg ${
                                isBusy 
                                  ? isExpired ? 'bg-red-500 text-white' : 'bg-red-500 text-white animate-pulse' 
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                <Monitor className="h-4 w-4" />
                              </div>
                              <div className="text-right">
                                <h3 className="font-sans font-bold text-slate-100 text-sm" style={device.id === '1' ? { fontSize: '20px' } : undefined}>{device.name}</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-slate-400 block">{device.type}</span>
                                  <span className="text-slate-700">•</span>
                                  <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 rounded border border-indigo-500/10">
                                    {(device.section === 'standard' || !device.section) && 'قاعة عادي'}
                                    {device.section === 'vip' && 'قاعة VIP'}
                                    {device.section === 'billiards' && 'قاعة بلياردو'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Left Actions & status */}
                            {(isOwner || isAuthorizedForMaintenance) && (
                              <div className="flex items-center gap-1.5 relative z-20" onClick={(e) => e.stopPropagation()}>
                                {isAuthorizedForMaintenance && !isBusy && !isMaintenance && (
                                  <button
                                    onClick={() => updateDevice(device.id, { status: 'maintenance' })}
                                    className="p-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-900/50 text-amber-400 hover:text-amber-200 border border-amber-900/30 transition-all cursor-pointer"
                                    title="تحت الصيانة والتحديث"
                                  >
                                    <Wrench className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {isOwner && (
                                  <>
                                    <button
                                      onClick={(e) => handleEditClick(e, device)}
                                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700 transition"
                                      title="تعديل الجهاز"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteClick(e, device.id)}
                                      className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-200 border border-red-900/20 transition"
                                      title="إزالة الجهاز"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-3.5 relative z-10">
                          {isMaintenance ? (
                            // Device under maintenance details
                            <div className="space-y-3">
                              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center gap-2">
                                <div className="p-2.5 rounded-full bg-slate-900/90 text-amber-500 animate-pulse">
                                  <Wrench className="h-5 w-5" />
                                </div>
                                <div className="text-center">
                                  <span className="text-xs font-bold text-slate-300 block">الجهاز تحت الصيانة والتحديث</span>
                                  <span className="text-[10px] text-slate-500 block mt-1">تم قفل الميزة مؤقتاً لأعمال التطوير أو الصيانة الجارية</span>
                                </div>
                              </div>

                              {isAuthorizedForMaintenance && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`هل أنت متأكد من إنهاء صيانة جهاز (${device.name}) وإعادته لوضع التشغيل المتاح للزبائن؟`)) {
                                      updateDevice(device.id, { status: 'available' });
                                    }
                                  }}
                                  className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg text-xs font-bold transition-all duration-300 shadow-md shadow-emerald-950/40 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  إنهاء الصيانة وتشغيله الآن
                                </button>
                              )}
                            </div>
                          ) : isBusy && activeSession ? (
                            // Active session details
                            <div className="space-y-3">
                              {/* Customer Information */}
                              <div className="flex items-center gap-2">
                                <div className="bg-slate-850 text-indigo-400 rounded-lg p-1">
                                  <User className="h-3.5 w-3.5" />
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">الزبون الحالي</span>
                                  <p className="text-xs font-semibold text-slate-100">{activeSession.customerName}</p>
                                </div>
                              </div>

                              {/* Mode & Running Timer */}
                              <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40 text-right">
                                <div>
                                  <span className="text-[9px] text-slate-500 block">وضع اللعب</span>
                                  <span className="text-[11px] font-semibold text-slate-300">{sessionStatusLabel}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-500 block">الوقت المنقضي</span>
                                  <span className="text-[11px] font-bold font-mono text-indigo-300 flex items-center gap-1 justify-end">
                                    <Timer className="h-3 w-3 text-indigo-400" />
                                    {timerLabel}
                                  </span>
                                </div>
                              </div>

                              {/* Pricing / Food tally */}
                              <div className="flex justify-between items-center bg-slate-900 px-2 py-1.5 rounded-lg border border-indigo-500/10">
                                <div className="flex items-center gap-1">
                                  <Coffee className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-[10px] text-slate-400">طلبات: {activeSession.orders.reduce((sum, o) => sum + o.quantity, 0)}</span>
                                </div>
                                <div className="text-left">
                                  <span className="text-[8px] text-slate-500 block text-left">الحساب الجاري</span>
                                  <p className="text-xs font-bold text-emerald-400 font-mono text-left">{runningCost} د.ع</p>
                                </div>
                              </div>

                              {/* Expiration Alarm Line */}
                              {warningText && (
                                <div className={`p-2 rounded-lg text-[10px] flex items-center gap-1.5 ${
                                  isExpired 
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' 
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {isExpired ? <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 animate-bounce" /> : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
                                  <span className="font-semibold">{warningText}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Device configurations
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2 bg-slate-950/30 p-2 rounded-lg border border-slate-800/40">
                                <div className="text-center">
                                  <span className="text-[10px] text-slate-400 block mb-0.5">فردي / ساعة</span>
                                  <span className="text-xs font-bold text-slate-200 font-mono">{device.hourlyRateSingle} د.ع</span>
                                </div>
                                <div className="text-center border-r border-slate-800/60 font-sans">
                                  <span className="text-[10px] text-slate-400 block mb-0.5">زوجي / ساعة</span>
                                  <span className="text-xs font-bold text-slate-200 font-mono">{device.hourlyRateMulti} د.ع</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-center gap-2 pt-0.5 font-sans">
                                <button className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg text-xs font-bold transition-all duration-300 shadow-md shadow-emerald-950/40 cursor-pointer">
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                  بدء تشغيل الجلسة
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Device Config Management Overlay Modal */}
      {showDeviceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative text-right">
            
            {/* Modal header */}
            <div className="p-5 border-b border-slate-805 flex justify-between items-center bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowDeviceModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-base font-bold text-slate-100">
                {modalMode === 'create' ? 'إضافة جهاز أو مساحة لعب جديدة' : 'تحديث إعدادات وبيانات اللعب'}
              </h3>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitDevice} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم الجهاز / طاولة اللعب</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: بلايستيشن صالة VIP، طاولة بلياردو 1"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">نوع الكونسولا / طاولة اللعب</label>
                  <input
                    type="text"
                    required
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    placeholder="مثال: PS5 Pro, Billiards"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">تصنيف قاعة اللعب</label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-600 transition cursor-pointer"
                  >
                    <option value="standard">قاعة عادي (Standard)</option>
                    <option value="vip">قاعة الـ VIP</option>
                    <option value="billiards">البلياردو والمسليات</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">سعر لعب مفرد / ساعة (د.ع)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={250}
                    value={formRateSingle}
                    onChange={(e) => setFormRateSingle(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">سعر لعب زوجي / ساعة (د.ع)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={250}
                    value={formRateMulti}
                    onChange={(e) => setFormRateMulti(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  إلغاء التعديل
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{modalMode === 'create' ? 'حفظ وإضافة الآن' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
