import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Customer, SubscriptionPlan, Subscription } from '../types';
import { 
  UserPlus, UserCheck, Phone, Search, Trash2, Edit2, ShieldAlert, 
  Sparkles, Calendar, Award, RefreshCw, X, Gift, Printer 
} from 'lucide-react';

export const formatDecimalHours = (hours: number): string => {
  if (hours < 0) hours = 0;
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${String(minutes).padStart(2, '0')}`;
};

export const CustomerManager: React.FC = () => {
  const { 
    currentUser, customers, subscriptions, subscriptionPlans, sessions,
    addCustomer, updateCustomer, deleteCustomer, addSubscription, cancelSubscription 
  } = useApp();

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sort/Leaderboard period selector states
  const [sortOption, setSortOption] = useState<'default' | 'play_week' | 'play_month'>('play_week');

  // Customer Edit/Create state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Loyalty states
  const [visits, setVisits] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [unclaimedRewards, setUnclaimedRewards] = useState(0);

  // Settle Sub state
  const [selectedCustIdForSub, setSelectedCustIdForSub] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [showSubModal, setShowSubModal] = useState(false);

  // Selected subscription for viewing historical sessions
  const [selectedSubForHistory, setSelectedSubForHistory] = useState<any | null>(null);

  // Printing states
  const [subToPrint, setSubToPrint] = useState<Subscription | null>(null);
  const [historyToPrint, setHistoryToPrint] = useState<{ sub: any; sessions: any[] } | null>(null);

  // Robust printing execution that delays window.print until the portal elements are accurately painted
  React.useEffect(() => {
    if (subToPrint || historyToPrint) {
      let printTimer: any;
      const rAF1 = requestAnimationFrame(() => {
        const rAF2 = requestAnimationFrame(() => {
          printTimer = setTimeout(() => {
            window.print();
            // Defer resetting to ensure browser print dialog processes custom layout completely
            setTimeout(() => {
              if (subToPrint) setSubToPrint(null);
              if (historyToPrint) setHistoryToPrint(null);
            }, 1000);
          }, 500);
        });
        return () => cancelAnimationFrame(rAF2);
      });
      return () => {
        cancelAnimationFrame(rAF1);
        if (printTimer) clearTimeout(printTimer);
      };
    }
  }, [subToPrint, historyToPrint]);

  // 🎮 Map of total play time (in minutes) for each customer ID for Last 7 days and Last 30 days
  const customerPlayTimes = React.useMemo(() => {
    const weekMap: { [id: string]: number } = {};
    const monthMap: { [id: string]: number } = {};
    
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(now.getDate() - 30);
    
    sessions.forEach(s => {
      if (s.status !== 'completed' || s.customerId === 'guest') return;
      const closedDate = new Date(s.closedAt || s.endTime || s.startTime);
      
      const start = new Date(s.startTime).getTime();
      const end = s.endTime ? new Date(s.endTime).getTime() : closedDate.getTime();
      const durationMinutes = Math.max(0, (end - start) / (1000 * 60)); // in minutes
      
      if (closedDate >= oneWeekAgo) {
        weekMap[s.customerId] = (weekMap[s.customerId] || 0) + durationMinutes;
      }
      if (closedDate >= oneMonthAgo) {
        monthMap[s.customerId] = (monthMap[s.customerId] || 0) + durationMinutes;
      }
    });
    
    return { weekMap, monthMap };
  }, [sessions]);

  // 🏆 Podium lists for Top 3 Players
  const topWeekGamerList = React.useMemo(() => {
    return [...customers]
      .map(c => ({
        ...c,
        playMinutes: customerPlayTimes.weekMap[c.id] || 0
      }))
      .filter(item => item.playMinutes > 0)
      .sort((a, b) => b.playMinutes - a.playMinutes)
      .slice(0, 3);
  }, [customers, customerPlayTimes.weekMap]);

  const topMonthGamerList = React.useMemo(() => {
    return [...customers]
      .map(c => ({
        ...c,
        playMinutes: customerPlayTimes.monthMap[c.id] || 0
      }))
      .filter(item => item.playMinutes > 0)
      .sort((a, b) => b.playMinutes - a.playMinutes)
      .slice(0, 3);
  }, [customers, customerPlayTimes.monthMap]);

  const activeTopGamers = sortOption === 'play_month' ? topMonthGamerList : topWeekGamerList;

  const topPlayerId = React.useMemo(() => {
    return activeTopGamers[0]?.id || null;
  }, [activeTopGamers]);

  // Combined search filter + rankings sorting application
  const filteredCustomers = React.useMemo(() => {
    const filtered = customers.filter(
      c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)
    );
    
    if (sortOption === 'play_week') {
      return [...filtered].sort((a, b) => {
        const tA = customerPlayTimes.weekMap[a.id] || 0;
        const tB = customerPlayTimes.weekMap[b.id] || 0;
        return tB - tA; // sort desc
      });
    } else if (sortOption === 'play_month') {
      return [...filtered].sort((a, b) => {
        const tA = customerPlayTimes.monthMap[a.id] || 0;
        const tB = customerPlayTimes.monthMap[b.id] || 0;
        return tB - tA; // sort desc
      });
    }
    return filtered;
  }, [customers, searchQuery, sortOption, customerPlayTimes]);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    if (isEditing && editingId) {
      const orig = customers.find(c => c.id === editingId);
      if (orig) {
        updateCustomer({
          ...orig,
          name,
          phone,
          notes,
          visitsCount: visits,
          loyaltyPoints: loyaltyPoints,
          unclaimedRewards: unclaimedRewards
        });
      }
    } else {
      addCustomer(name, phone, notes);
    }

    // Reset Form
    setName('');
    setPhone('');
    setNotes('');
    setVisits(0);
    setLoyaltyPoints(0);
    setUnclaimedRewards(0);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleTriggerEdit = (c: Customer) => {
    setName(c.name);
    setPhone(c.phone);
    setNotes(c.notes || '');
    setVisits(c.visitsCount || 0);
    setLoyaltyPoints(c.loyaltyPoints || 0);
    setUnclaimedRewards(c.unclaimedRewards || 0);
    setEditingId(c.id);
    setIsEditing(true);
  };

  const handleIssueSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustIdForSub || !selectedPlanId) return;

    const customer = customers.find(c => c.id === selectedCustIdForSub);
    const plan = subscriptionPlans.find(p => p.id === selectedPlanId);
    if (!customer || !plan) return;

    const confirmMsg = `هل أنت متأكد من رغبتك في إضافة هذا الاشتراك للزبون؟\n\n` +
      `👤 الزبون: ${customer.name}\n` +
      `📦 الباقة: ${plan.name}\n` +
      `💰 قيمة السداد: ${plan.price.toLocaleString('en-US')} د.ع\n` +
      `⏳ مدة الصلاحية: ${plan.durationDays} يوم`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    const newSub = addSubscription(selectedCustIdForSub, selectedPlanId);
    setShowSubModal(false);
    setSelectedCustIdForSub('');
    setSelectedPlanId('');

    if (newSub) {
      setSubToPrint(newSub);
    }
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

  return (
    <div className="space-y-6 text-right">
      
      {/* Top Welcome Title */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-400" />
            إدارة الزبائن ونظام الاشتراكات التراكمي
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تسجيل رواد الصالة وتأمين باقات الساعات الشهرية للزبائن المميزين لتشجيعهم على زيارة صالة الألعاب بانتظام.
          </p>
        </div>
        
        {currentUser?.role !== 'captain' && (
          <button
            onClick={() => {
              setSelectedCustIdForSub(customers[0]?.id || '');
              setSelectedPlanId(subscriptionPlans[0]?.id || '');
              setShowSubModal(true);
            }}
            className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-yellow-300" />
            إصدار اشتراك شهري جديد للعميل
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Form to Add / Edit Customers (Cols 4) */}
        <div className="lg:col-span-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <UserPlus className="h-4.5 w-4.5 text-indigo-400" />
            {isEditing ? 'تعديل بيانات عميل مسجل' : 'إضافة زبون جديد لقاعدة البيانات'}
          </h3>

          <form onSubmit={handleSaveCustomer} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-semibold">اسم الزبون كاملاً:</label>
              <input
                type="text"
                placeholder="مثال: صالح الحربي"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-semibold">رقم الجوال:</label>
              <input
                type="text"
                placeholder="مثال: 055xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-semibold">ملاحظات / عادات اللعب:</label>
              <textarea
                placeholder="ألعاب الراليات المفضلة لديه، تفضيل اللعب الفردي، إلخ..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            {isEditing && (
              <div className="bg-slate-950 p-3 rounded-xl border border-indigo-500/10 space-y-3.5 text-right">
                <span className="text-[11px] text-indigo-400 font-bold block pb-1 border-b border-slate-900 border-dashed">🎯 لوحة التحكم بنقاط الولاء والمكافآت</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-semibold">إجمالي الزيارات:</label>
                    <input
                      type="number"
                      min="0"
                      value={visits}
                      onChange={(e) => setVisits(Math.max(0, +e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-semibold">نقاط الولاء الحالية:</label>
                    <div className="flex bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs select-none items-center justify-between">
                      <span className="text-[10px] text-slate-500">/ 5 نقاط</span>
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={loyaltyPoints}
                        onChange={(e) => setLoyaltyPoints(Math.min(4, Math.max(0, +e.target.value)))}
                        className="w-12 bg-transparent text-slate-200 outline-none text-left font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-semibold">المكافآت الجاهزة للاستعمال (ساعة مجانية):</label>
                  <input
                    type="number"
                    min="0"
                    value={unclaimedRewards}
                    onChange={(e) => setUnclaimedRewards(Math.max(0, +e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-bold outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                  />
                  <p className="text-[9px] text-slate-505 mt-0.5">كل 5 نقاط تُمنح تلقائياً ساعة لعب مجانية أثناء الدفع وتسوية حساب جلسة الزبون.</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
              >
                {isEditing ? 'حفـظ التحديثات' : 'إضافة الزبون'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingId(null);
                    setName('');
                    setPhone('');
                    setNotes('');
                  }}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Database List View (Cols 8) */}
        <div className="lg:col-span-8 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          
          {/* List Search Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-emerald-400" />
              دليل العملاء المسجلين ({customers.length} زبون)
            </h3>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الجوال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="h-4 w-4 text-slate-500 absolute top-2 right-3" />
            </div>
          </div>

          {/* 🏆 Leaderboard / Top Players Podium Grid */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 select-none mt-2">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-800/70 pb-2">
              <h4 className="text-xs font-bold text-yellow-500 flex items-center gap-1.5 animate-pulse">
                <Award className="h-4 w-4 text-yellow-400" />
                لوحة الأبطال لأكثر الزبائن لعباً ونشاطاً بالصالة
              </h4>
              
              {/* Leaderboard Period Selector */}
              <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSortOption('play_week')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    sortOption === 'play_week' 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الترتيب الأسبوعي
                </button>
                <button
                  type="button"
                  onClick={() => setSortOption('play_month')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    sortOption === 'play_month' 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الترتيب الشهري
                </button>
                <button
                  type="button"
                  onClick={() => setSortOption('default')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    sortOption === 'default' 
                      ? 'bg-slate-950 text-slate-305' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الافتراضي
                </button>
              </div>
            </div>

            {activeTopGamers.length === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-2 font-sans">
                لا توجد ساعات لعب مسجلة للأعضاء أو الزبائن في هذه الفترة لبناء لوحة الشرف لتلك الوردية.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-right">
                {activeTopGamers.map((gamer, idx) => {
                  const hours = gamer.playMinutes / 60;
                  
                  return (
                    <div 
                      key={gamer.id} 
                      className={`relative rounded-xl p-3 border transition-all duration-300 ${
                        idx === 0 
                          ? 'bg-gradient-to-br from-yellow-950/20 via-yellow-905/10 to-transparent border-yellow-500/25 shadow-lg shadow-yellow-500/5 ring-1 ring-yellow-500/10' 
                          : idx === 1
                            ? 'bg-slate-900/40 border-slate-300/10'
                            : 'bg-slate-900/40 border-amber-700/10'
                      }`}
                    >
                      {/* Badge / Position Indicator */}
                      <span className={`absolute top-2.5 left-3 text-[9px] font-black font-sans px-2 py-0.5 rounded-full border ${
                        idx === 0 
                          ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20' 
                          : idx === 1
                            ? 'bg-slate-300/10 text-slate-350 border-slate-300/20'
                            : 'bg-amber-600/10 text-amber-500 border-amber-600/20'
                      }`}>
                        {idx === 0 ? '👑 البطل الذهبي' : idx === 1 ? '🥈 الثاني' : '🥉 الثالث'}
                      </span>
                      
                      <div className="space-y-1 mt-2">
                        <p className={`text-xs font-black truncate leading-tight ${idx === 0 ? 'text-yellow-400 text-sm' : 'text-slate-205'}`}>
                          {gamer.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                          <span>⏱️ لعب:</span>
                          <span className={`font-black ${idx === 0 ? 'text-yellow-405' : 'text-slate-300'}`}>
                            {hours.toFixed(1)} ساعة
                          </span>
                        </div>
                        {idx === 0 && (
                          <div className={`text-[9px] text-yellow-600/80 font-semibold leading-none pt-0.5 animate-pulse`}>
                            🔥 متصدر الصالة الحالي
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customers database Table Grid */}
          {filteredCustomers.length === 0 ? (
            <p className="text-xs text-slate-500 p-8 border border-dashed border-slate-800 rounded-2xl text-center select-none">
              لا يوجد نتائج مماثلة لبحثك في دليل الزبائن.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[360px] border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3">اسم الزبون</th>
                    <th className="p-3">رقم الجوال</th>
                    <th className="p-2.5">حالة الملاحظات</th>
                    <th className="p-3 text-center">الزيارات ونقاط الولاء 🌟</th>
                    <th className="p-3 text-center">المكافآت الجاهزة 🎁</th>
                    <th className="p-3 text-center">العضوية النشطة</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 bg-slate-950/20">
                  {filteredCustomers.map((c) => {
                    const isTopGamer = topPlayerId && c.id === topPlayerId;
                    return (
                      <tr 
                        key={c.id} 
                        className={`hover:bg-slate-900/45 transition-colors ${
                          isTopGamer 
                            ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border-y border-yellow-500/10' 
                            : ''
                        }`}
                      >
                        <td className="p-3 font-semibold text-slate-200">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {c.subscriptionId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const sub = subscriptions.find(s => s.id === c.subscriptionId);
                                  if (sub) {
                                    setSelectedSubForHistory(sub);
                                  }
                                }}
                                className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-all text-right cursor-pointer"
                              >
                                {c.name}
                              </button>
                            ) : (
                              <span>{c.name}</span>
                            )}
                            
                            {isTopGamer && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-yellow-500/25 text-yellow-450 px-1.5 py-0.2 rounded border border-yellow-500/30 font-black animate-pulse">
                                👑 الأول
                              </span>
                            )}

                            {(sortOption === 'play_week' || sortOption === 'play_month') && (
                              <span className="text-[10px] text-slate-400 font-mono font-semibold bg-slate-950/40 px-1.5 py-0.5 rounded">
                                {(((sortOption === 'play_month' ? customerPlayTimes.monthMap[c.id] : customerPlayTimes.weekMap[c.id]) || 0) / 60).toFixed(1)} ساعة لعب
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{c.phone}</td>
                        <td className="p-2.5 text-slate-400 truncate max-w-[120px]" title={c.notes}>
                          {c.notes || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-1 font-mono">
                            <span className="font-bold text-slate-200">{c.visitsCount || 0} زيارة</span>
                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15">
                              {c.loyaltyPoints || 0} / 5 نقاط
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono">
                          {(c.unclaimedRewards || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold animate-pulse">
                              🎁 {c.unclaimedRewards} ساعة مجانية
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-sans">0 مكافآت</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {c.subscriptionId ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold">
                              <Award className="h-3 w-3 text-yellow-400" />
                              عضو مشترك
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">مستخدم عادي</span>
                          )}
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleTriggerEdit(c)}
                            className="p-1 px-2 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {currentUser?.role === 'owner' && (
                            <button
                              onClick={() => {
                                if (confirm('هل أنت متأكد من مسح ملف العميل وقفل اشتراكه فورياً؟')) {
                                  deleteCustomer(c.id);
                                }
                              }}
                              className="p-1 px-2 text-red-400 hover:text-red-300 bg-red-400/10 rounded cursor-pointer"
                              title="حذف العميل"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ACTIVE SUBSCRIPTIONS STATUS BOARD */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-250 flex items-center gap-1.5 border-b border-slate-800 pb-3">
          <Award className="h-4.5 w-4.5 text-indigo-400" />
          سجل الاشتراكات الشهرية المفعلة والصلاحيات ({activeSubscriptions.length} اشتراك مفعـل)
        </h3>

        {activeSubscriptions.length === 0 ? (
          <p className="text-xs text-slate-500 p-6 text-center select-none">
            لا توجد اشتراكات مفعّلة نشطة حالياً بقاعدة البيانات.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSubscriptions.map((sub) => {
              const ends = new Date(sub.endDate).toLocaleDateString('ar-EG');
              return (
                <div key={sub.id} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">
                        <button
                          type="button"
                          onClick={() => setSelectedSubForHistory(sub)}
                          className="font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-all text-right cursor-pointer"
                        >
                          {sub.customerName}
                        </button>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">{sub.planName}</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                      نشط ومفعّل
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/40 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">الباقة الإجمالية</span>
                      <span className="text-slate-300">{sub.type === 'unlimited' ? 'لعب مفتوح' : `${formatDecimalHours(sub.totalHours)} ساعة`}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">السـاعات المتبقية</span>
                      <span className="font-bold text-indigo-400">{sub.type === 'unlimited' ? 'لامحدود' : `${formatDecimalHours(sub.remainingHours)} ساعة`}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      تاريخ الصلاحية: {ends}
                    </span>
                    {currentUser?.role === 'owner' && (
                      <button
                        onClick={() => {
                          if (confirm('في حالة إلغاء الاشتراك لن يمكن رد بقية رصيد الساعات، هل أنت متأكد؟')) {
                            cancelSubscription(sub.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-350 cursor-pointer font-bold"
                      >
                        إلغاء الاشتراك الشهري ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL WINDOW: ENROLL FOR NEW SUBSCRIPTION */}
      {showSubModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
              <h3 className="font-bold font-sans text-white text-md flex items-center gap-2">
                <Gift className="h-5 w-5 text-indigo-400" />
                إصدار باقة اشتراك شهري
              </h3>
              <button onClick={() => setShowSubModal(false)} className="p-1 hover:bg-slate-800 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIssueSubscription} className="p-5 space-y-4 text-right">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 block font-semibold">اختر العميل المعني:</label>
                <select
                  value={selectedCustIdForSub}
                  onChange={(e) => setSelectedCustIdForSub(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="" disabled>-- الرجاء اختيار زبون مسجل --</option>
                  {customers.filter(c => !c.subscriptionId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
                {customers.filter(c => !c.subscriptionId).length === 0 && (
                  <p className="text-[10px] text-amber-500 pt-1">جميع المهتمين لديهم حالياً باقات اشتراك مفعلة.</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 block font-semibold font-sans">اختر نوع بـاقة الإشـتراك:</label>
                <div className="space-y-2">
                  {subscriptionPlans.map((plan) => (
                    <label
                      key={plan.id}
                      className={`flex items-start justify-between border p-3 rounded-xl cursor-pointer transition-all ${
                        selectedPlanId === plan.id
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-750'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="plan_selection"
                          checked={selectedPlanId === plan.id}
                          onChange={() => setSelectedPlanId(plan.id)}
                          className="mt-1"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">{plan.name}</span>
                          <span className="text-[10px] text-slate-400">
                            صلاحية {plan.durationDays} يومياً - {plan.type === 'unlimited' ? 'لعب مفتوح' : `${plan.hours} ساعة لعبة`}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-emerald-400">{plan.price} د.ع</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800/60">
                <button
                  type="submit"
                  disabled={!selectedCustIdForSub || !selectedPlanId}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all text-white cursor-pointer"
                >
                  حفظ وتسديد رسوم الباقة
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  إلغاء الأمر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WINDOW: VIEW SUBSCRIPTION HISTORICAL SESSIONS */}
      {selectedSubForHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center sm:px-6">
              <div className="text-right">
                <h3 className="font-bold font-sans text-white text-md flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-400" />
                  تفاصيل اشتراك وجلسات الزبون
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">سجل الحضور والجلسات السابقة المستهلكة من رصيد الساعات</p>
              </div>
              <button type="button" onClick={() => setSelectedSubForHistory(null)} className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer">
                <X className="h-4.5 w-4.5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto text-right flex-1">
              {/* Subscription Info Card */}
              <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-white text-sm">{selectedSubForHistory.customerName}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/15 font-bold">
                      {selectedSubForHistory.planName}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      صلاحية: من {new Date(selectedSubForHistory.startDate).toLocaleDateString('ar-EG')} إلى {new Date(selectedSubForHistory.endDate).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 w-full sm:w-auto shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 block">الباقة الإجمالية</span>
                    <span className="text-slate-300 font-bold">
                      {selectedSubForHistory.type === 'unlimited' ? 'لعب مفتوح' : `${formatDecimalHours(selectedSubForHistory.totalHours)} ساعة`}
                    </span>
                  </div>
                  <div className="text-center border-r border-slate-800 pr-4">
                    <span className="text-[10px] text-slate-500 block">الساعات المتبقية</span>
                    <span className="font-bold text-emerald-400">
                      {selectedSubForHistory.type === 'unlimited' ? 'لامحدود' : `${formatDecimalHours(selectedSubForHistory.remainingHours)} ساعة`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Session Table list within the subscription scope */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>الجلسات المسجلة خلال فترة الاشتراك ({sessions.filter(s => {
                    if (s.customerId !== selectedSubForHistory.customerId) return false;
                    const sessionTime = new Date(s.startTime).getTime();
                    const start = new Date(selectedSubForHistory.startDate).getTime();
                    const end = new Date(selectedSubForHistory.endDate).getTime();
                    return sessionTime >= start && sessionTime <= end;
                  }).length} جلسة)</span>
                  <span className="text-[10px] text-slate-500">مستهلكة من الرصيد أو تم تسويتها</span>
                </h4>

                {(() => {
                  const matchingSessions = sessions.filter(s => {
                    if (s.customerId !== selectedSubForHistory.customerId) return false;
                    const sessionTime = new Date(s.startTime).getTime();
                    const start = new Date(selectedSubForHistory.startDate).getTime();
                    const end = new Date(selectedSubForHistory.endDate).getTime();
                    return sessionTime >= start && sessionTime <= end;
                  });

                  if (matchingSessions.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 p-8 border border-dashed border-slate-800 rounded-2xl text-center">
                        لا توجد جلسات سابقة مسجلة للمشترك خلال فترة هذا الاشتراك حتى الآن.
                      </p>
                    );
                  }

                  const formatDateTime = (isoString: string) => {
                    return new Date(isoString).toLocaleString('ar-EG', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });
                  };

                  const getSessionDurationHours = (s: any) => {
                    if (s.sessionType === 'fixed' && s.fixedDuration) {
                      return `${formatDecimalHours(s.fixedDuration / 60)}  ساعة (محدد)`;
                    }
                    if (!s.endTime) return 'جاري اللعب...';
                    const start = new Date(s.startTime).getTime();
                    const end = new Date(s.endTime).getTime();
                    const hrs = (end - start) / (1000 * 3600);
                    return `${formatDecimalHours(Math.max(0.01, hrs))} ساعة`;
                  };

                  return (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                          <tr>
                            <th className="p-3">الجهاز</th>
                            <th className="p-3">وقت التشغيل</th>
                            <th className="p-3">وقت الانتهاء</th>
                            <th className="p-3">المدة</th>
                            <th className="p-3 text-center">طريقة الدفع</th>
                            <th className="p-3 text-center">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {matchingSessions.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-900/20">
                              <td className="p-3 font-semibold text-slate-200">{s.deviceName}</td>
                              <td className="p-3 font-mono text-slate-400 text-[11px]">{formatDateTime(s.startTime)}</td>
                              <td className="p-3 font-mono text-slate-400 text-[11px]">{s.endTime ? formatDateTime(s.endTime) : 'قيد التشغيل'}</td>
                              <td className="p-3 font-semibold text-indigo-400">{getSessionDurationHours(s)}</td>
                              <td className="p-3 text-center">
                                {s.paymentMethod === 'subscription' ? (
                                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15 font-bold">خصم رصيد</span>
                                ) : s.paymentMethod === 'cash' ? (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/10">كاش</span>
                                ) : s.paymentMethod === 'card' ? (
                                  <span className="text-[10px] text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/10">شبكة</span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {s.status === 'completed' ? (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">مكتملة</span>
                                ) : s.status === 'active' ? (
                                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded animate-pulse">مستمرة</span>
                                ) : (
                                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded">ملغاة</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex flex-col sm:flex-row justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const matchingSessions = sessions.filter(s => {
                    if (s.customerId !== selectedSubForHistory.customerId) return false;
                    const sessionTime = new Date(s.startTime).getTime();
                    const start = new Date(selectedSubForHistory.startDate).getTime();
                    const end = new Date(selectedSubForHistory.endDate).getTime();
                    return sessionTime >= start && sessionTime <= end;
                  });

                  setHistoryToPrint({ sub: selectedSubForHistory, sessions: matchingSessions });
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                طباعة تفاصيل واستهلاك الاشتراك
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubForHistory(null)}
                className="w-full sm:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REACT PORTALS FOR PURE PRINTING (80MM THERMAL TICKETS) */}
      {subToPrint && createPortal(
        <div className="portal-print-container thermal-receipt text-right font-mono p-4" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', color: '#000000', backgroundColor: '#ffffff' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0' }}>قاعة ألعاب صالة الأركاد المتكاملة</h3>
            <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#333333' }}>هاتف: 0780111222 | بغداد، العراق</p>
            <p style={{ fontSize: '11px', fontWeight: 'bold', borderTop: '1px solid #000000', paddingTop: '4px', marginTop: '4px', margin: '4px 0 0 0' }}>فاتورة سداد واشتراك زبون</p>
          </div>

          <div style={{ fontSize: '10px', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px', lineHeight: '1.5' }}>
            <div><strong>اسم المشترك:</strong> {subToPrint.customerName}</div>
            <div><strong>نوع الباقة:</strong> {subToPrint.planName}</div>
            <div><strong>تاريخ البدء:</strong> {new Date(subToPrint.startDate).toLocaleDateString('ar-EG')}</div>
            <div><strong>تاريخ الانتهاء:</strong> {new Date(subToPrint.endDate).toLocaleDateString('ar-EG')}</div>
            <div><strong>الرصيد الكلي المخصص:</strong> {subToPrint.type === 'unlimited' ? 'لعب مفتوح بالباقة' : `${formatDecimalHours(subToPrint.totalHours)} ساعة`}</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', borderTop: '1px dashed #000000', paddingTop: '4px', marginTop: '4px' }}>
              <strong>المبلغ المدفوع:</strong> {subToPrint.pricePaid.toLocaleString('en-US')} د.ع
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '9px', paddingTop: '8px', color: '#555555' }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>شكراً لاشتراككم معنا وصحتين وعافية!</p>
            <p style={{ margin: '0' }}>يرجى الاحتفاظ بهذا الوصل لتقديمه للكاشير</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#888888' }}>تاريخ الطباعة: {new Date(subToPrint.startDate).toLocaleString('ar-EG')}</p>
          </div>
        </div>,
        document.body
      )}

      {historyToPrint && createPortal(
        <div className="portal-print-container thermal-receipt text-right font-mono p-4" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', color: '#000000', backgroundColor: '#ffffff' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0' }}>قاعة ألعاب صالة الأركاد المتكاملة</h3>
            <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#333333' }}>هاتف: 0780111222 | بغداد، العراق</p>
            <p style={{ fontSize: '11px', fontWeight: 'bold', borderTop: '1px solid #000000', paddingTop: '4px', marginTop: '4px', margin: '4px 0 0 0' }}>كشف تفاصيل واستهلاك الاشتراك</p>
          </div>

          <div style={{ fontSize: '10px', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px', lineHeight: '1.5' }}>
            <div><strong>اسم المشترك:</strong> {historyToPrint.sub.customerName}</div>
            <div><strong>نوع الباقة:</strong> {historyToPrint.sub.planName}</div>
            <div><strong>الفترة الصالحة:</strong> من {new Date(historyToPrint.sub.startDate).toLocaleDateString('ar-EG')} إلى {new Date(historyToPrint.sub.endDate).toLocaleDateString('ar-EG')}</div>
            <div><strong>الساعات الكلية:</strong> {historyToPrint.sub.type === 'unlimited' ? 'لعب مفتوح' : `${formatDecimalHours(historyToPrint.sub.totalHours)} ساعة`}</div>
            <div><strong>الساعات المتبقية للعب:</strong> {historyToPrint.sub.type === 'unlimited' ? 'لا محدود' : `${formatDecimalHours(historyToPrint.sub.remainingHours)} ساعة`}</div>
          </div>

          <div style={{ fontSize: '10px', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', borderBottom: '1px dashed #000000', paddingBottom: '4px', marginBottom: '4px' }}>ملخص حضور الجلسات السابقة:</p>
            {historyToPrint.sessions.length === 0 ? (
              <p style={{ fontSize: '9px', textAlign: 'center', color: '#666666', padding: '4px 0' }}>لا توجد جلسات مسجلة حتى الآن.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {historyToPrint.sessions.map((s, idx) => {
                  const getDurationStr = () => {
                    if (s.sessionType === 'fixed' && s.fixedDuration) {
                      return `${formatDecimalHours(s.fixedDuration / 60)} ساعة`;
                    }
                    if (!s.endTime) return 'مستمرة';
                    const hrs = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 3600);
                    return `${formatDecimalHours(Math.max(0.01, hrs))} ساعة`;
                  };
                  return (
                    <div key={idx} style={{ fontSize: '9px', borderBottom: '1px dashed #e5e5e5', paddingBottom: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>{s.deviceName}</span>
                        <span>{getDurationStr()} ({s.playType === 'single' ? 'فردي' : 'زوجي'})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666655' }}>
                        <span>{new Date(s.startTime).toLocaleDateString('ar-EG')}</span>
                        <span>شحن باقة: {s.paymentMethod === 'subscription' ? 'رصيد الاشتراك' : 'نقدي/مدى'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: '9px', paddingTop: '8px', color: '#555555' }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>تم استخراج هذا التقرير بناءً على طلب المشترك</p>
            <p style={{ margin: '0' }}>طاب يومكم وصحتين وعافية!</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#888888' }}>تاريخ الطباعة المباشرة: {new Date().toLocaleString('ar-EG')}</p>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
