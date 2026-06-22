import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Transaction } from '../types';
import { 
  ShieldAlert, Calendar, DollarSign, ArrowDownRight, ArrowUpRight, 
  Layers, ShoppingBag, Plus, Sparkles, Printer, FileText, Computer
} from 'lucide-react';

// Helper to parse and format dates to local YYYY-MM-DD
const getLocalYMD = (dateOrStr: Date | string) => {
  const d = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
};

export const FinancialReports: React.FC = () => {
  const { currentUser, transactions, addExpense, sessions, menuItems, clearAllTestData } = useApp();

  // Date range picker filters using timezone-safe local values
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // previous 30 days
    return getLocalYMD(d);
  });

  const [lastDate, setLastDate] = useState(() => {
    return getLocalYMD(new Date());
  });

  // Direct miscellaneous expenditure fields
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Robust printing execution that delays window.print until the portal elements are accurately painted
  React.useEffect(() => {
    if (isPrinting) {
      let printTimer: any;
      const rAF1 = requestAnimationFrame(() => {
        const rAF2 = requestAnimationFrame(() => {
          printTimer = setTimeout(() => {
            window.print();
            // Defer resetting to ensure browser print preview finishes drawing our custom layout
            setTimeout(() => {
              setIsPrinting(false);
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
  }, [isPrinting]);

  // Helper to set pre-defined quick intervals
  const setQuickRange = (days: number) => {
    const todayStr = getLocalYMD(new Date());
    setLastDate(todayStr);
    
    if (days === 1) {
      setFromDate(todayStr);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1)); // subtract days to get range
      setFromDate(getLocalYMD(d));
    }
  };

  const handleClearData = async () => {
    if (window.confirm('🚨 تحذير هام جداً: هل أنت متأكد من مسح جميع الجلسات والمعاملات التجريبية السابقة بشكل نهائي للبدء من جديد؟ لن تتمكن من استعادتها.')) {
      setIsClearing(true);
      try {
        await clearAllTestData();
        alert('تم مسح جميع الجلسات والمعاملات التجريبية السابقة بنجاح! يمكنك الآن تجربة التطبيق بنظام نظيف.');
      } catch (e) {
        console.error(e);
        alert('حدث خطأ أثناء رغبتك في مسح البيانات.');
      } finally {
        setIsClearing(false);
      }
    }
  };

  // Filter records based on Date range selecting using clean local timezone
  const filteredTransactions = transactions.filter(tx => {
    const txDate = getLocalYMD(tx.timestamp);
    return txDate >= fromDate && txDate <= lastDate;
  });

  // Ledger arithmetic metrics
  const sessionPayments = filteredTransactions
    .filter(tx => tx.type === 'session_payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const subscriptionPayments = filteredTransactions
    .filter(tx => tx.type === 'subscription_payment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const outboundExpenses = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Get completed sessions in selected range using clean local timezone to sum cafe purchase costs
  const completedSessionsInRange = sessions.filter(s => {
    if (s.status !== 'completed') return false;
    const sDate = getLocalYMD(s.closedAt || s.endTime || s.startTime);
    return sDate >= fromDate && sDate <= lastDate;
  });

  const totalCafePurchaseCost = completedSessionsInRange.reduce((sum, s) => {
    const sessionCost = s.orders.reduce((costSum, o) => {
      const itemCost = o.purchaseCost !== undefined 
        ? o.purchaseCost 
        : (menuItems.find(m => m.id === o.id)?.purchaseCost || 0);
      return costSum + (itemCost * o.quantity);
    }, 0);
    return sum + sessionCost;
  }, 0);

  const grossEarnings = sessionPayments + subscriptionPayments;
  const netOperatingProfit = grossEarnings - outboundExpenses - totalCafePurchaseCost;

  // Localized today string for cashier shift auditing (YYYY-MM-DD format)
  const todayStr = getLocalYMD(new Date());
  
  // Compiled Cashier Shift Metrics (Range-based to synchronize with range selectors)
  const todayTransactions = filteredTransactions;

  const todayRevenue = todayTransactions
    .filter(tx => tx.type !== 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayExpenses = todayTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayCashRevenue = todayTransactions
    .filter(tx => tx.type !== 'expense' && tx.paymentMethod === 'cash')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const requiredCashDrawerBalance = todayCashRevenue - todayExpenses;

  const handleRegisterExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0 || !expenseDesc.trim()) return;
    addExpense(expenseAmount, expenseDesc, 'cash');
    setExpenseAmount(0);
    setExpenseDesc('');
    setShowExpenseForm(false);
  };

  const handlePrintBalanceSheet = () => {
    setIsPrinting(true);
  };

  // Compile daily totals for drawing clean, safe vector SVG bar graph chart
  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  };

  // Group by day key { [date]: sum }
  const dailyGroups: { [key: string]: number } = {};
  filteredTransactions.forEach(t => {
    const dayKey = t.timestamp.split('T')[0];
    dailyGroups[dayKey] = (dailyGroups[dayKey] || 0) + (t.type === 'expense' ? -t.amount : t.amount);
  });

  const chartKeys = Object.keys(dailyGroups).sort().slice(-7); // take last 7 data days
  const chartData = chartKeys.map(key => ({
    label: getDayLabel(key),
    value: dailyGroups[key]
  }));

  const maxChartValue = Math.max(...chartData.map(d => Math.abs(d.value)), 100);

  // 🎮 Calculate Device popularity metrics
  const deviceStats = React.useMemo(() => {
    const stats: { [id: string]: { id: string; name: string; sessionCount: number; totalHours: number; totalRevenue: number } } = {};
    
    completedSessionsInRange.forEach(s => {
      if (s.deviceId === 'direct_sale') return; // ignore direct sale
      const devId = s.deviceId;
      const devName = s.deviceName;
      
      const start = new Date(s.startTime).getTime();
      const end = s.endTime ? new Date(s.endTime).getTime() : new Date().getTime();
      const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60)); // in decimal hours
      
      if (!stats[devId]) {
        stats[devId] = {
          id: devId,
          name: devName,
          sessionCount: 0,
          totalHours: 0,
          totalRevenue: 0
        };
      }
      
      stats[devId].sessionCount += 1;
      stats[devId].totalHours += durationHours;
      stats[devId].totalRevenue += s.totalPlayAmount;
    });

    return Object.values(stats).sort((a, b) => b.totalHours - a.totalHours);
  }, [completedSessionsInRange]);

  // ☕ Calculate Cafeteria top selling products
  const productStats = React.useMemo(() => {
    const stats: { [id: string]: { id: string; name: string; quantitySold: number; totalRevenue: number; profit: number } } = {};
    
    completedSessionsInRange.forEach(s => {
      s.orders.forEach(o => {
        const prodId = o.id;
        const name = o.name;
        const qty = o.quantity;
        const revenue = o.price * qty;
        
        // Find latest purchase cost
        let cost = o.purchaseCost;
        if ((cost === undefined || cost === 0) && menuItems) {
          cost = menuItems.find(m => m.id === prodId)?.purchaseCost || 0;
        }
        const totalCost = (cost || 0) * qty;
        const profit = revenue - totalCost;
        
        if (!stats[prodId]) {
          stats[prodId] = {
            id: prodId,
            name,
            quantitySold: 0,
            totalRevenue: 0,
            profit: 0
          };
        }
        
        stats[prodId].quantitySold += qty;
        stats[prodId].totalRevenue += revenue;
        stats[prodId].profit += profit;
      });
    });

    return Object.values(stats).sort((a, b) => b.quantitySold - a.quantitySold);
  }, [completedSessionsInRange, menuItems]);

  return (
    <div className="space-y-6 text-right">
      
      {/* Search Header and Filters Controls panel */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              مرصد الحسابات والتقارير المالية للنشاط
            </h2>
            {currentUser?.role === 'owner' && (
              <button
                disabled={isClearing}
                onClick={handleClearData}
                className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer hover:shadow-lg disabled:opacity-50 shrink-0"
                id="reset-test-data-btn"
              >
                {isClearing ? 'جاري تصفير الحسابات...' : '🗑️ تصفير البيانات التجريبية'}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">تتبع التدفقات النقدية والأرباح، وجرد مبيعات البوفيه والاشتراكات، وصرف النفقات المباشرة</p>
        </div>

        {/* Date search range selectors */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs w-full md:w-auto">
          {/* Quick Date Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-850">
            <button
              onClick={() => setQuickRange(1)}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-300 font-bold transition-colors cursor-pointer"
              id="set-quick-range-1d"
            >
              ١ يوم
            </button>
            <button
              onClick={() => setQuickRange(7)}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-300 font-bold transition-colors cursor-pointer"
              id="set-quick-range-7d"
            >
              ٧ أيام
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-300 font-bold transition-colors cursor-pointer"
              id="set-quick-range-30d"
            >
              ٣٠ يوم
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-r border-slate-850 pr-3">
            <span className="text-slate-400">من تاريخ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-900 border border-slate-850 text-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5 border-r border-slate-850 pr-3">
            <span className="text-slate-400">إلى تاريخ:</span>
            <input
              type="date"
              value={lastDate}
              onChange={(e) => setLastDate(e.target.value)}
              className="bg-slate-900 border border-slate-850 text-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>
          <button
            onClick={handlePrintBalanceSheet}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-1 font-bold cursor-pointer transition-colors"
            id="print-sheet-btn"
          >
            طباعة الكشف
          </button>
        </div>
      </div>

      {/* KPI Aggregate cards / Cashier Audit Dashboard depending on user role */}
      {currentUser?.role === 'owner' ? (
        /* Full Financial Dashboard (Owner Only) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Total play games earnings */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-right">
            <span className="text-slate-400 text-xs block font-semibold">إيراد جلسات اللعب</span>
            <div className="flex items-center justify-between mt-3 font-mono">
              <h3 className="text-lg font-black text-white">{sessionPayments.toLocaleString('en-US')} د.ع</h3>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">تسويات جارية خلال النطاق المختار</p>
          </div>

          {/* Total subscription enrollment fees */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-right">
            <span className="text-slate-400 text-xs block font-semibold">مبيعات باقات العضويات</span>
            <div className="flex items-center justify-between mt-3 font-mono">
              <h3 className="text-lg font-black text-white">{subscriptionPayments.toLocaleString('en-US')} د.ع</h3>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">الاشتراكات وشحن الساعات</p>
          </div>

          {/* Cafe items cost of materials */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-right">
            <span className="text-slate-400 text-xs block font-semibold">تكلفة الكافيه (المواد)</span>
            <div className="flex items-center justify-between mt-3 font-mono">
              <h3 className="text-lg font-black text-amber-500">{totalCafePurchaseCost.toLocaleString('en-US')} د.ع</h3>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">تكاليف المنتجات المبيعة المصروفة</p>
          </div>

          {/* Expenses */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-right">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs block font-semibold">النفقات والمصاريف الهامشية</span>
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="p-1 px-2 text-[10px] bg-red-400/15 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-400/20 transition-all cursor-pointer font-bold"
              >
                صرف (+)
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 font-mono">
              <h3 className="text-lg font-black text-red-400 font-mono">-{outboundExpenses.toLocaleString('en-US')} د.ع</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">الصيانة المصروفة والمستلزمات</p>
          </div>

          {/* Net Operating Profit */}
          <div className={`p-5 rounded-2xl border text-right transition-colors ${
            netOperatingProfit >= 0 
              ? 'bg-emerald-950/15 border-emerald-500/20 shadow-emerald-950/20 shadow' 
              : 'bg-red-950/15 border-red-500/20 shadow-red-950/20 shadow'
          }`}>
            <span className="text-slate-400 text-xs block font-semibold">الربح الصافي الدقيق والنهائي</span>
            <div className="flex items-center justify-between mt-3 font-mono">
              <h3 className={`text-xl font-black ${netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netOperatingProfit.toLocaleString('en-US')} د.ع
              </h3>
              <div className={`p-2.5 rounded-xl ${netOperatingProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {netOperatingProfit >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">الصافي بعد حسم المصاريف والمواد الأولية</p>
          </div>

        </div>
      ) : (
        /* Cashier Audit & Balance Dashboard (Cashier / Captain Only) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Daily revenue metrics */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-right shadow-lg">
            <span className="text-indigo-400 text-xs block font-bold mb-1">
              {fromDate === lastDate ? (fromDate === todayStr ? "مجموع الدخل اليومي" : "مجموع الدخل لهذا اليوم") : "مجموع الدخل للفترة المحددة"}
            </span>
            <span className="text-[10px] text-slate-500 block mb-3">
              {fromDate === lastDate 
                ? "واردات اليوم التراكمية كاش وبطاقات لشحن الألعاب والاشتراكات" 
                : "واردات الفترة التراكمية المحددة كاش وبطاقات لشحن الألعاب والاشتراكات"}
            </span>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-white font-mono">{todayRevenue.toLocaleString('en-US')} د.ع</h3>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/40 text-[10px] text-slate-400 flex justify-between">
              <span>{fromDate === lastDate ? "كاش اليوم: " : "كاش الفترة: "}{todayCashRevenue.toLocaleString('en-US')} د.ع</span>
              <span>شبكة: {(todayRevenue - todayCashRevenue).toLocaleString('en-US')} د.ع</span>
            </div>
          </div>

          {/* Daily expenses metrics */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-right shadow-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-red-400 text-xs block font-bold">
                {fromDate === lastDate ? "المصروفات اليومية" : "المصروفات للفترة المحددة"}
              </span>
              {currentUser?.role === 'cashier' && (
                <button
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                  className="p-1 px-2 text-[10px] bg-red-400/15 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-400/20 transition-all cursor-pointer font-bold"
                >
                  صرف (+)
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block mb-3">
              {fromDate === lastDate 
                ? "أي مبالغ صرف جانبي تم سحبها من الصندوق اليوم" 
                : "أي مبالغ صرف جانبي تم سحبها من الصندوق خلال الفترة المحددة"}
            </span>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-red-400 font-mono">-{todayExpenses.toLocaleString('en-US')} د.ع</h3>
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                <ArrowDownRight className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/40 text-[10px] text-slate-400">
              • المصاريف تفيد في مطابقة الرصيد المتبقي بدقة
            </div>
          </div>

          {/* Cash Drawer required Balance for shift audit */}
          <div className="bg-indigo-950/20 p-6 rounded-2xl border border-indigo-500/30 text-right shadow-xl">
            <span className="text-emerald-400 text-xs block font-bold mb-1">
              {fromDate === lastDate ? "💸 المبلغ الواجب تواجده في درج الكاشير" : "💸 النقدية الواجب تواجدها بالدرج للفترة المحددة"}
            </span>
            <span className="text-[10px] text-indigo-300 block mb-3">
              {fromDate === lastDate 
                ? "الرصيد النقدي الفعلي المفروض وجوده بالدرج بنهاية اليوم" 
                : "الرصيد النقدي التراكمي المفترض تواجده بالدرج في هذه الفترة"}
            </span>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {requiredCashDrawerBalance.toLocaleString('en-US')} د.ع
              </h3>
              <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-indigo-500/20 text-[10px] text-indigo-300">
              {fromDate === lastDate 
                ? "* التدقيق والتسليم: كاش اليوم المستلم مطروحاً منه بند المصاريف النقدية" 
                : "* التدقيق والتسليم: الكاش المستلم في الفترة مطروحاً منه بند المصاريف النقدية"}
            </div>
          </div>
        </div>
      )}

      {/* Direct miscellaneous Expense Formulation Panel (Owner or Cashier) */}
      {showExpenseForm && (currentUser?.role === 'owner' || currentUser?.role === 'cashier') && (
        <form onSubmit={handleRegisterExpense} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 text-right animate-fade-in">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
            تسجيل بند مصروفات جديد لقاعة الأجهزة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-semibold">المبلغ المسحوب (د.ع):</label>
              <input
                type="number"
                min="1"
                required
                value={expenseAmount || ''}
                onChange={(e) => setExpenseAmount(Math.max(1, +e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold font-mono outline-none text-left"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block font-semibold">الغرض / تفصيل البند والصرف:</label>
              <input
                type="text"
                placeholder="مثال: شراء كراتين مياه ومسليات للبوفيه، فواتير كهرباء"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800/60 pt-3">
            <button
              type="submit"
              className="py-2 px-5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow"
            >
              قيد البند المصروف على الحسابات
            </button>
            <button
              type="button"
              onClick={() => setShowExpenseForm(false)}
              className="py-2 px-3 bg-slate-800 text-slate-400 text-xs font-medium rounded-xl hover:bg-slate-750 cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Main ledger list & Daily sales performance vector graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Vector SVG Performance Chart (Cols 5) */}
        <div className="lg:col-span-5 bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            {(() => {
              const firstValue = chartData.length > 0 ? chartData[0].value : 0;
              const lastValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
              const deltaValue = lastValue - firstValue;
              const pctChange = firstValue !== 0 ? ((deltaValue / Math.abs(firstValue)) * 100).toFixed(1) : (deltaValue > 0 ? '100' : '0');
              const isTrendUp = deltaValue >= 0;

              const chartVals = chartData.map(d => d.value);
              const minVal = Math.min(...chartVals, 0);
              const maxVal = Math.max(...chartVals, 100);
              const valRange = maxVal - minVal;

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <Layers className="h-4.5 w-4.5 text-indigo-400" />
                      مؤشر المبيعات اليومية لآخر {chartData.length} أيام تشغيلية
                    </h3>
                    {chartData.length > 1 && (
                      <div className={`flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg border ${
                        isTrendUp 
                          ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {isTrendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        <span>{isTrendUp ? '+' : ''}{pctChange}%</span>
                      </div>
                    )}
                  </div>
                  
                  {chartData.length === 0 ? (
                    <p className="text-xs text-slate-500 p-8 text-center bg-slate-950/20 border border-dashed border-slate-850 rounded-xl select-none">
                      لا توجد قيود للمعاملات في التواريخ المختارة لتغذية الرسم البياني.
                    </p>
                  ) : (
                    /* Highly polished responsive stock market trend graph */
                    <div className="w-full h-48 relative select-none bg-slate-950/40 rounded-xl border border-slate-800/60 p-2 overflow-hidden mt-2">
                      {/* Horizontal grid/reference lines */}
                      <div className="absolute left-0 right-0 top-1/4 border-t border-slate-800/15 text-[9px] text-slate-600 font-mono text-left select-none"></div>
                      <div className="absolute left-0 right-0 top-2/4 border-t border-slate-800/15 text-[9px] text-slate-600 font-mono text-left select-none"></div>
                      <div className="absolute left-0 right-0 top-3/4 border-t border-slate-800/15 text-[9px] text-slate-600 font-mono text-left select-none"></div>

                      {/* Stock Vector SVG Line */}
                      <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chart-area-slope-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isTrendUp ? '#10b981' : '#ef4444'} stopOpacity="0.28" />
                            <stop offset="100%" stopColor={isTrendUp ? '#10b981' : '#ef4444'} stopOpacity="0.01" />
                          </linearGradient>
                        </defs>

                        {/* Area gradient underlay */}
                        {chartData.length > 1 && (
                          <path
                            d={`M 0,200 L ${chartData.map((d, idx) => {
                              const x = (idx / (chartData.length - 1)) * 500;
                              const pct = valRange > 0 ? (d.value - minVal) / valRange : 0.5;
                              const y = 170 - (pct * 135);
                              return `${x},${y}`;
                            }).join(' L ')} L 500,200 Z`}
                            fill="url(#chart-area-slope-grad)"
                          />
                        )}

                        {/* Trend path line */}
                        {chartData.length > 1 ? (
                          <path
                            d={`M ${chartData.map((d, idx) => {
                              const x = (idx / (chartData.length - 1)) * 500;
                              const pct = valRange > 0 ? (d.value - minVal) / valRange : 0.5;
                              const y = 170 - (pct * 135);
                              return `${x},${y}`;
                            }).join(' L ')}`}
                            fill="none"
                            stroke={isTrendUp ? '#10b981' : '#ef4444'}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : chartData.length === 1 ? (
                          <line
                            x1="0"
                            y1="100"
                            x2="500"
                            y2="100"
                            stroke={isTrendUp ? '#10b981' : '#ef4444'}
                            strokeWidth="3"
                            strokeDasharray="4"
                          />
                        ) : null}
                      </svg>

                      {/* Interactive glowing nodes on top via relative coordinate div overlays */}
                      <div className="absolute inset-x-3 bottom-0 top-0 pointer-events-none">
                        {chartData.map((d, idx) => {
                          const pct = valRange > 0 ? (d.value - minVal) / valRange : 0.5;
                          const bottomPercent = 25 + (pct * 55); // vertically place inside safe ranges
                          const leftPercent = chartData.length > 1 ? (idx / (chartData.length - 1)) * 100 : 50;

                          return (
                            <div
                              key={idx}
                              className="absolute flex flex-col items-center group pointer-events-none"
                              style={{
                                left: `${leftPercent}%`,
                                bottom: `${bottomPercent}%`,
                                transform: 'translate(-50%, 50%)',
                                zIndex: 20
                              }}
                            >
                              {/* Hover Tooltip (pointer-active) */}
                              <div className="hidden group-hover:flex absolute -top-12 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 shadow-xl text-[10px] font-mono font-bold whitespace-nowrap flex-col items-center gap-0.5 z-30 pointer-events-auto">
                                <span className="text-[8px] text-slate-450 font-sans font-normal">{d.label}</span>
                                <span className={d.value >= 0 ? "text-emerald-400" : "text-red-400"}>
                                  {d.value.toLocaleString()} د.ع
                                </span>
                              </div>

                              {/* Styled dot with stock ring / pulsing indicator */}
                              <div className="pointer-events-auto cursor-pointer relative flex items-center justify-center">
                                <span className={`animate-ping absolute inline-flex h-4 w-4 rounded-full opacity-35 ${
                                  isTrendUp ? 'bg-emerald-400/80' : 'bg-red-400/80'
                                }`}></span>
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-md border ${
                                  isTrendUp ? 'bg-emerald-500 border-white' : 'bg-red-500 border-white'
                                }`}></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* absolute overlay days labels at bottom axis */}
                      <div className="absolute bottom-1 inset-x-3 flex justify-between pointer-events-none">
                        {chartData.map((d, idx) => {
                          const leftPercent = chartData.length > 1 ? (idx / (chartData.length - 1)) * 100 : 50;
                          return (
                            <span
                              key={idx}
                              className="text-[9px] text-slate-400 font-semibold absolute"
                              style={{
                                left: `${leftPercent}%`,
                                transform: 'translateX(-50%)',
                                bottom: '0px'
                              }}
                            >
                              {d.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="text-[11px] text-slate-500 pt-3 select-none">
            * مؤشر محاكاة البورصة: مرر مؤشر الفأرة فوق النقاط لمعاينة الرقم المالي الدقيق والتدفقات الصافية لليوم.
          </div>
        </div>

        {/* Transaction History log (Cols 7) */}
        <div className="lg:col-span-7 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-850 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-indigo-400" />
              سجل المعاملات اليومية والحركات المالية المعتمدة
            </span>
            <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded font-mono">
              {filteredTransactions.length} معاملة دفترية
            </span>
          </h3>

          {filteredTransactions.length === 0 ? (
            <p className="text-xs text-slate-500 p-12 text-center border border-dashed border-slate-850 rounded-2xl select-none">
              لا توجد قيود مالية لحسابات الصالة ضمن نطاق التاريخ المحدد بالبحث.
            </p>
          ) : (
            <div className="overflow-y-auto max-h-[300px] border border-slate-850 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-850 font-semibold select-none">
                  <tr>
                    <th className="p-3">المعاملة</th>
                    <th className="p-3 text-center">التاريخ والوقت</th>
                    <th className="p-3 text-center">طريقة الدفع</th>
                    <th className="p-3 text-center">القيمة القيادية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 bg-slate-950/20 font-mono">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/30">
                      <td className="p-3 font-sans text-slate-100 text-[11px] font-semibold">
                        <span className={`inline-block w-2 h-2 rounded-full ml-2 ${
                          tx.type === 'session_payment' 
                            ? 'bg-indigo-400' 
                            : tx.type === 'subscription_payment' 
                              ? 'bg-purple-400' 
                              : 'bg-red-500'
                        }`}></span>
                        {tx.description}
                      </td>
                      <td className="p-3 text-slate-400 text-center text-[10px]">
                        {new Date(tx.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3 text-slate-400 text-center font-sans text-[11px]">
                        {tx.type === 'expense' ? 'سحب نقدي' : tx.paymentMethod === 'cash' ? 'نقدي (كاش)' : 'شبكة مداى'}
                      </td>
                      <td className={`p-3 text-center text-sm font-black ${
                        tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {tx.type === 'expense' ? '-' : '+'}{tx.amount} د.ع
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* 📊 Beautiful statistics charts: Devices & Cafeteria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 select-none">
        
        {/* Device Popularity Card */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/85 pb-2">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Computer className="h-4.5 w-4.5 text-indigo-400" />
              أكثر الأجهزة لعباً ورواجاً بالفترة
            </h3>
            <span className="text-[10px] bg-slate-950 text-slate-400 px-2.5 py-1 rounded-lg font-bold border border-slate-850">
              {deviceStats.length} جـهاز لعب نشط
            </span>
          </div>

          {deviceStats.length === 0 ? (
            <p className="text-xs text-slate-400 p-12 text-center border border-dashed border-slate-800 rounded-xl">
              لا توجد جلسات تصفية في هذا النطاق الزمني لقياس رواج الأجهزة.
            </p>
          ) : (
            <div className="space-y-4 pt-1">
              {deviceStats.map((stat, idx) => {
                const maxHours = deviceStats[0]?.totalHours || 1;
                const percent = (stat.totalHours / maxHours) * 100;
                
                return (
                  <div key={stat.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                          idx === 0 
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                            : idx === 1 
                              ? 'bg-slate-300/15 text-slate-300 border border-slate-300/20'
                              : 'bg-slate-950 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-200">{stat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                        <span title="إجمالي الساعات" className="text-indigo-400 font-bold bg-indigo-500/5 px-1.5 py-0.5 rounded">
                          {stat.totalHours.toFixed(1)} ساعة
                        </span>
                        <span title="عدد الجلسات" className="text-slate-500 hidden sm:inline">
                          {stat.sessionCount} جلسة
                        </span>
                        <span title="العائد المالي" className="text-emerald-450 font-bold">
                          {stat.totalRevenue.toLocaleString('en-US')} د.ع
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          idx === 0 
                            ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600' 
                            : idx === 1
                              ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                              : 'bg-indigo-950 border-r border-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cafeteria Products popular demand */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/85 pb-2">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <ShoppingBag className="h-4.5 w-4.5 text-amber-500" />
              أكثر المنتجات مبيعاً من قسم الكافتيريا والبوفيه
            </h3>
            <span className="text-[10px] bg-slate-950 text-slate-400 px-2.5 py-1 rounded-lg font-bold border border-slate-850">
              {productStats.length} صـنـف مبيـع
            </span>
          </div>

          {productStats.length === 0 ? (
            <p className="text-xs text-slate-400 p-12 text-center border border-dashed border-slate-800 rounded-xl">
              لا توجد مبيعات مباشرة أو طلبات كافتيريا مسجلة بالفترة الحالية.
            </p>
          ) : (
            <div className="space-y-4 pt-1">
              {productStats.map((stat, idx) => {
                const maxQty = productStats[0]?.quantitySold || 1;
                const percent = (stat.quantitySold / maxQty) * 100;
                
                return (
                  <div key={stat.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                          idx === 0 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                            : 'bg-slate-950 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-200">{stat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                        <span title="الكمية المبيعة" className="text-amber-500 font-bold bg-amber-500/5 px-1.5 py-0.5 rounded">
                          {stat.quantitySold} قطعة
                        </span>
                        <span title="إجمالي الإيراد" className="text-slate-500 hidden sm:inline">
                          {stat.totalRevenue.toLocaleString('en-US')} د.ع
                        </span>
                        <span title="صافي ربح الصنف المالي التقديري" className="text-emerald-450 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/10">
                          +{stat.profit.toLocaleString('en-US')} ربـح
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          idx === 0 
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500' 
                            : 'bg-amber-950 border-r border-amber-500/30'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Dedicated Printable Financial Report Section */}
      <div id="financial-report-box" className="hidden print:block text-black bg-white p-6 font-sans text-right">
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold">صالة ألعاب صالة الأركاد المتكاملة</h1>
          <p className="text-sm text-gray-600 mt-1">تقرير جرد الحسابات والتدفقات المالية للنشاط</p>
          <p className="text-xs text-gray-500 mt-1">تاريخ الكشف: من {new Date(fromDate).toLocaleDateString('ar-EG')} إلى {new Date(lastDate).toLocaleDateString('ar-EG')}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}</p>
        </div>

        {/* Section 1: Executive Financial Summary */}
        <div className="mb-6">
          <h2 className="text-sm font-bold border-b pb-1 mb-3 text-gray-800">📊 الملخص التنفيذي والأرباح</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border p-2 rounded">
              <span className="text-gray-500 block">إيراد جلسات اللعب:</span>
              <span className="font-bold">{sessionPayments.toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="border p-2 rounded">
              <span className="text-gray-500 block">مبيعات باقات العضويات:</span>
              <span className="font-bold">{subscriptionPayments.toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="border p-2 rounded bg-amber-50/50">
              <span className="text-amber-800 block">تكلفة الكافيه والمنتجات:</span>
              <span className="font-bold text-amber-700">{totalCafePurchaseCost.toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="border p-2 rounded bg-red-50/50">
              <span className="text-red-800 block">النفقات والمصاريف الهامشية:</span>
              <span className="font-bold text-red-700">-{outboundExpenses.toLocaleString('en-US')} د.ع</span>
            </div>
          </div>

          <div className="mt-3 border p-3 rounded-lg bg-gray-50 flex justify-between items-center text-sm">
            <span className="font-bold">الربح الصافي الدقيق للنشاط:</span>
            <span className={`font-black text-base ${netOperatingProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netOperatingProfit.toLocaleString('en-US')} د.ع
            </span>
          </div>
        </div>

        {/* Section 2: Cashier Audit (Specific Shift Balance) */}
        <div className="mb-6">
          <h2 className="text-sm font-bold border-b pb-1 mb-3 text-gray-800">💸 تدقيق ومطابقة الصندوق (الكاشير)</h2>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="border p-2 rounded">
              <span className="text-gray-500 block">كاش اليوم المستلم:</span>
              <span className="font-bold">{todayCashRevenue.toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="border p-2 rounded">
              <span className="text-gray-500 block">مصروفات الصندوق اليوم:</span>
              <span className="font-bold text-red-600">-{todayExpenses.toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="border p-2 rounded bg-emerald-50">
              <span className="text-green-700 block font-bold">الرصيد الفعلي المطلوب بالدرج:</span>
              <span className="font-black text-green-700 text-sm">{requiredCashDrawerBalance.toLocaleString('en-US')} د.ع</span>
            </div>
          </div>
        </div>

        {/* Section 3: Ledger Transactions details */}
        <div>
          <h2 className="text-sm font-bold border-b pb-1 mb-3 text-gray-800">📝 دفتر الحركات المالية التفصيلية ({filteredTransactions.length} حركة)</h2>
          <table className="w-full text-right text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-100 font-bold border-b text-gray-700">
                <th className="p-2 border">المعاملة</th>
                <th className="p-2 border text-center">التاريخ والوقت</th>
                <th className="p-2 border text-center">طريقة الدفع</th>
                <th className="p-2 border text-center">القيمة</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="border-b">
                  <td className="p-2 border-x">{tx.description}</td>
                  <td className="p-2 border-x text-center font-mono">
                    {new Date(tx.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="p-2 border-x text-center">
                    {tx.type === 'expense' ? 'سحب نقدي' : tx.paymentMethod === 'cash' ? 'نقدي (كاش)' : 'شبكة/بطاقة'}
                  </td>
                  <td className={`p-2 border-x text-center font-bold font-mono ${tx.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                    {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('en-US')} د.ع
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center text-[9px] text-gray-400 mt-12 border-t pt-4">
          <p>تم طباعة هذا الكشف الحسابي آلياً عبر نظام إدارة صالة الأركاد</p>
        </div>
      </div>

      {/* REACT PORTAL FOR PURE REPORT PRINTING (A4 SHEET STYLE) */}
      {isPrinting && createPortal(
        <div className="portal-print-container text-right font-mono p-8" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', color: '#000000', backgroundColor: '#ffffff', minHeight: '100vh', boxSizing: 'border-box' }}>
          {/* Document Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000000', paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0', fontFamily: 'sans-serif' }}>صاعة ومجمع ألعاب أركاد بلايستيشن الترفيهية</h2>
              <p style={{ fontSize: '12px', margin: '0', color: '#333333' }}>الجهة المصدرة: كشف الحساب والتقارير المالية والتدقيق العام</p>
              <p style={{ fontSize: '10px', margin: '2px 0 0 0', color: '#666666' }}>تاريخ ترحيل الكشف: {new Date().toLocaleString('ar-EG')}</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', border: '1px solid #000000', padding: '5px 10px', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                تقرير كشف الأرباح والخسائر للنشاط
              </div>
              <p style={{ fontSize: '10px', margin: '5px 0 0 0', color: '#444444' }}>الفترة الزمنية للبحث: من <strong>{fromDate}</strong> إلى <strong>{lastDate}</strong></p>
            </div>
          </div>

          {/* Quick Summary Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#475569', margin: '0 0 5px 0' }}>إيرادات المبيعات والنشاط</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>{grossEarnings.toLocaleString('en-US')} د.ع</p>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#475569', margin: '0 0 5px 0' }}>تكلفة بضاعة الكوفي كلفة الشراء</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>{totalCafePurchaseCost.toLocaleString('en-US')} د.ع</p>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#475569', margin: '0 0 5px 0' }}>المصاريف التشغيلية (الصندوق)</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>{outboundExpenses.toLocaleString('en-US')} د.ع</p>
            </div>
            <div style={{ border: '1px solid #000000', padding: '10px', borderRadius: '4px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>
              <p style={{ fontSize: '10px', color: '#0f172a', margin: '0 0 5px 0', fontWeight: 'bold' }}>صافي الأرباح القابلة للتوزيع</p>
              <p style={{ fontSize: '15px', fontWeight: '900', color: netOperatingProfit >= 0 ? '#15803d' : '#b91c1c', margin: '0' }}>
                {netOperatingProfit.toLocaleString('en-US')} د.ع
              </p>
            </div>
          </div>

          {/* Detailed Ledger breakdown */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1.5px solid #000000', paddingBottom: '5px', marginBottom: '10px' }}>تفاصيل حركة الصندوق والمبيعات</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000000', textAlign: 'right', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '8px', borderBottom: '1.5px solid #000000' }}>البند المالي للنشاط</th>
                  <th style={{ padding: '8px', borderBottom: '1.5px solid #000000', textAlign: 'center' }}>عدد العمليات بالفترة</th>
                  <th style={{ padding: '8px', borderBottom: '1.5px solid #000000', textAlign: 'left' }}>المجموع الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px' }}>إيرادات ساعات تفريغ الجلسات ولعب الصالة الجاري والمنتهي</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{filteredTransactions.filter(t => t.type === 'session_payment').length} حركة تصفية</td>
                  <td style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>{sessionPayments.toLocaleString('en-US')} د.ع</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px' }}>إيرادات تجديد وبيع اشتراكات العضويات المسبقة للزبائن مبيعات</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{filteredTransactions.filter(t => t.type === 'subscription_payment').length} اشتراك مضاف</td>
                  <td style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>{subscriptionPayments.toLocaleString('en-US')} د.ع</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px' }}>إجمالي سحوبات ومصاريف الإدارة والمثبتة والمسندة للفترة</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{filteredTransactions.filter(t => t.type === 'expense').length} إيصال دفع</td>
                  <td style={{ padding: '8px', textAlign: 'left', color: '#b91c1c', fontWeight: 'bold' }}>-{outboundExpenses.toLocaleString('en-US')} د.ع</td>
                </tr>
                <tr style={{ borderBottom: '1.5px solid #000000' }}>
                  <td style={{ padding: '8px' }}>كلفة بضاعة الكشك والحلويات والمشروبات والطلبات المقدمة بالجلسات</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{completedSessionsInRange.length} جلسة استهلاك</td>
                  <td style={{ padding: '8px', textAlign: 'left', color: '#b91c1c', fontWeight: 'bold' }}>-{totalCafePurchaseCost.toLocaleString('en-US')} د.ع</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Transactions list */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1.5px solid #000000', paddingBottom: '5px', marginBottom: '10px' }}>دفتر اليومية المساند وسجل العمليات الصندوقية المصوّر</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #bdcbd9', textAlign: 'right', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  <th style={{ padding: '6px' }}>رقم المعيد</th>
                  <th style={{ padding: '6px' }}>تاريخ ووقت المعاملة</th>
                  <th style={{ padding: '6px' }}>نوع المعاملة</th>
                  <th style={{ padding: '6px' }}>البيان والتوضيح المحاسبي</th>
                  <th style={{ padding: '6px' }}>طريقة الدفع</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>القيمة</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>لا يوجد قيود محاسبية مسجلة في هذه المدة الزمنية في الصندوق.</td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                      <td style={{ padding: '6px', fontFamily: 'monospace' }}>{tx.id.substring(0, 8).toUpperCase()}</td>
                      <td style={{ padding: '6px' }}>{new Date(tx.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td style={{ padding: '6px', fontWeight: 'bold' }}>
                        {tx.type === 'session_payment' ? 'تصفية جلسة كاش' : tx.type === 'subscription_payment' ? 'سداد باقة' : 'مصروف خارجي'}
                      </td>
                      <td style={{ padding: '6px' }}>{tx.description}</td>
                      <td style={{ padding: '6px' }}>{tx.paymentMethod === 'cash' ? 'نقدي' : tx.paymentMethod === 'card' ? 'شبكة / بطاقة' : 'رصيد المشترك'}</td>
                      <td style={{ padding: '6px', textAlign: 'left', color: tx.type === 'expense' ? '#b91c1c' : '#15803d', fontWeight: 'bold' }}>
                        {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('en-US')} د.ع
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <p style={{ margin: '0 0 45px 0', borderBottom: '1px solid #000000', paddingBottom: '5px' }}>توقيع وتصديق المحاسب والموظف المسؤول</p>
              <p style={{ fontWeight: 'bold' }}>دائرة الشؤون المالية</p>
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <p style={{ margin: '0 0 45px 0', borderBottom: '1px solid #000000', paddingBottom: '5px' }}>ختم الإدارة واعتماد المدير العام الشريك</p>
              <p style={{ fontWeight: 'bold' }}>إدارة الصالة المتكاملة</p>
            </div>
          </div>

          {/* Page Footer */}
          <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#64748b' }}>
            <span>كشف حساب مصدق - صالح لكافة التقارير الخارجية وجدول الشراكة لملاك قاعة ألعاب الأركاد</span>
            <span>كشف ذكي بإدارة الألعاب والخدمات - النظام السحابي التلقائي الشامل لعام 2026</span>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
