import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Device, GameSession, Customer, MenuItem } from '../types';
import { 
  X, UserPlus, Play, Check, ShoppingBag, Plus, Minus, Trash2, 
  Printer, DollarSign, Ban, ListCollapse, Coffee, Sparkles, Search,
  Coins, CreditCard, Award
} from 'lucide-react';

interface SessionModalProps {
  device: Device;
  activeSession: GameSession | null;
  onClose: () => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({ device, activeSession, onClose }) => {
  const { 
    currentUser, customers, menuItems, addCustomer, startSession, 
    addOrderToSession, removeOrderFromSession, checkoutSession, cancelSession, 
    calculateRuntimePlayAmount, subscriptions
  } = useApp();

  // Mode Selection Flags
  const isStarting = !activeSession;
  
  // Starting Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('guest');
  const [sessionType, setSessionType] = useState<'open' | 'fixed'>('open');
  const [playType, setPlayType] = useState<'single' | 'multi'>('single');
  const [fixedDuration, setFixedDuration] = useState<number>(60); // Default 60 minutes
  
  // Quick Customer Creation
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');

  // Customer Search option
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Filtered list of registered customers based on search
  const searchedCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearchQuery))
  );

  // Settle Checkout States
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'subscription'>('cash');
  const [isReceiptView, setIsReceiptView] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [shouldCheckoutOnPrintClose, setShouldCheckoutOnPrintClose] = useState(false);
  const [applyLoyalty, setApplyLoyalty] = useState(false);

  const loyaltyDiscountAmount = activeSession && applyLoyalty ? (activeSession.playType === 'single' ? device.hourlyRateSingle : device.hourlyRateMulti) : 0;

  // Robust print sequence: waiting for browser layout and repaint flows to guarantee thermal layout is fully visible.
  useEffect(() => {
    if (isPrinting) {
      let printTimer: any;
      const rAF1 = requestAnimationFrame(() => {
        const rAF2 = requestAnimationFrame(() => {
          printTimer = setTimeout(() => {
            window.print();
            
            // Defer resetting to ensure browser print dialog processes custom layout completely
            setTimeout(() => {
              setIsPrinting(false);
              if (shouldCheckoutOnPrintClose && activeSession) {
                checkoutSession(activeSession.id, discount + loyaltyDiscountAmount, paymentMethod, applyLoyalty);
                setShouldCheckoutOnPrintClose(false);
                onClose();
              }
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
  }, [isPrinting, shouldCheckoutOnPrintClose, activeSession, discount, paymentMethod, checkoutSession, onClose, applyLoyalty]);

  useEffect(() => {
    setApplyLoyalty(false);
    if (activeSession && activeSession.customerId !== 'guest') {
      const cust = customers.find(c => c.id === activeSession.customerId);
      if (cust && cust.subscriptionId) {
        setPaymentMethod('subscription');
      } else {
        setPaymentMethod('cash');
      }
    } else {
      setPaymentMethod('cash');
    }
  }, [activeSession, customers]);

  // Shop Café Filter
  const [cafeCategory, setCafeCategory] = useState<'all' | 'drinks' | 'snacks' | 'meals'>('all');

  const filteredMenuItems = menuItems.filter(
    item => cafeCategory === 'all' || item.category === cafeCategory
  );

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) return;
    const newCust = addCustomer(quickName, quickPhone, 'تم الإضافة سريعاً من واجهة تشغيل الأجهزة');
    setSelectedCustomerId(newCust.id);
    setQuickName('');
    setQuickPhone('');
    setShowAddCustomer(false);
  };

  const handleStart = () => {
    startSession(
      device.id,
      selectedCustomerId,
      sessionType,
      playType,
      sessionType === 'fixed' ? fixedDuration : undefined
    );
    onClose();
  };

  const handleCheckoutSettle = () => {
    if (!activeSession) return;
    const confirmMsg = `⚠️ تأكيد تصفية الحساب وإغلاق الجلسة:\n\n` +
      `🎮 جهاز اللعب: ${activeSession.deviceName}\n` +
      `👤 الزبون: ${activeSession.customerName}\n` +
      `💰 المبلغ الإجمالي: ${finalTotal.toLocaleString('en-US')} د.ع\n` +
      `💳 طريقة الدفع: ${paymentMethod === 'cash' ? 'نقدي (كاش)' : paymentMethod === 'card' ? 'بطاقة (كارد)' : 'رصيد المشترك (ساعات)'}\n\n` +
      `هل أنت متأكد من رغبتك في إقفال الجلسة وإنهاء محاسبة الفاتورة الآن وتفعيل الطباعة التلقائية؟`;

    if (window.confirm(confirmMsg)) {
      setIsReceiptView(true);
      setShouldCheckoutOnPrintClose(true);
      setIsPrinting(true);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
  };

  // Cost projections for the active screen
  const isSubscriberPayment = activeSession && paymentMethod === 'subscription' && activeSession.customerId !== 'guest';
  
  let displayHoursCost = 0;
  let remainingHoursInSub = 0;
  let coveredHoursBySub = 0;
  let extraPlayHours = 0;
  let doublePlayDiff = 0; // For compat/display in other parts
  let subType: 'hours' | 'unlimited' | null = null;

  const currentPlayAmt = activeSession ? calculateRuntimePlayAmount(activeSession) : 0;
  const currentOrdersAmt = activeSession ? activeSession.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0) : 0;

  if (activeSession) {
    if (isSubscriberPayment) {
      const customer = customers.find(c => c.id === activeSession.customerId);
      const sub = customer && customer.subscriptionId ? subscriptions.find(s => s.id === customer.subscriptionId) : null;
      
      let elapsedHours = 0;
      if (activeSession.sessionType === 'fixed' && activeSession.fixedDuration) {
        elapsedHours = activeSession.fixedDuration / 60;
      } else {
        const start = new Date(activeSession.startTime).getTime();
        elapsedHours = Math.max(0.01, (Date.now() - start) / (1000 * 3600));
      }

      if (sub) {
        subType = sub.type;
        if (sub.type === 'unlimited') {
          coveredHoursBySub = elapsedHours;
          extraPlayHours = 0;
          if (activeSession.playType === 'multi') {
            doublePlayDiff = +(elapsedHours * (device.hourlyRateMulti - device.hourlyRateSingle)).toFixed(2);
          }
          displayHoursCost = doublePlayDiff;
        } else if (sub.type === 'hours') {
          remainingHoursInSub = sub.remainingHours;
          coveredHoursBySub = Math.min(elapsedHours, sub.remainingHours);
          extraPlayHours = Math.max(0, elapsedHours - sub.remainingHours);
          
          if (activeSession.playType === 'multi') {
            doublePlayDiff = +(coveredHoursBySub * (device.hourlyRateMulti - device.hourlyRateSingle)).toFixed(2);
          }
          
          const extraHoursCost = extraPlayHours * activeSession.hourlyRate;
          displayHoursCost = +(extraHoursCost + doublePlayDiff).toFixed(2);
        }
      } else {
        displayHoursCost = currentPlayAmt;
      }
    } else {
      displayHoursCost = currentPlayAmt;
    }
  }

  const subTotal = displayHoursCost + currentOrdersAmt;
  const finalTotal = Math.max(0, subTotal - discount - loyaltyDiscountAmount);

  return (
    <div id="session-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center sm:px-8">
          <div>
            <h2 className="text-xl font-bold font-sans text-white select-none flex items-center gap-2">
              <span>{isStarting ? 'بدء جلسة لعب جديدة' : 'تفاصيل وإدارة الجلسة الحالية'}</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-500/10 font-mono">
                {device.name}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">تحديد نوع اللعب ومبيعات البوفيه وتفاصيل الحساب</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 px-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 lg:p-8 space-y-6">
          {isStarting ? (
            /* Start Session Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
              
              {/* Form Controls */}
              <div className="space-y-5">
                <h3 className="text-md font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-400" />
                  خيارات وبطاقة التشغيل
                </h3>

                {/* Play Mode Selection: Single or Multiplayer */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 block font-semibold">نمط اللعبة</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPlayType('single')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all duration-200 cursor-pointer ${
                        playType === 'single'
                          ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400 font-bold'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      لعب فردي (ساعة/ {device.hourlyRateSingle} د.ع)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayType('multi')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all duration-200 cursor-pointer ${
                        playType === 'multi'
                          ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      لعب زوجي (ساعة/ {device.hourlyRateMulti} د.ع)
                    </button>
                  </div>
                </div>

                {/* Session Duration Type: Open Play or Preset Timer */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 block font-semibold">نهاية وقت اللعب</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSessionType('open')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all duration-200 cursor-pointer ${
                        sessionType === 'open'
                          ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      لعب مفتوح (عداد مستمر)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionType('fixed')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all duration-200 cursor-pointer ${
                        sessionType === 'fixed'
                          ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      وقت محدد (تنبيه آلي بالانتهاء)
                    </button>
                  </div>
                </div>

                {/* Fixed time inputs */}
                {sessionType === 'fixed' && (
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3 animate-fade-in text-right">
                    <label className="text-xs text-slate-300 block font-semibold">تحديد الوقت بالدقائق:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60, 90, 120, 180, 240].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setFixedDuration(mins)}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                            fixedDuration === mins
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {mins >= 60 ? `${mins / 60} ساعة` : `${mins} دقيقة`}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        value={fixedDuration}
                        onChange={(e) => setFixedDuration(Math.max(5, +e.target.value))}
                        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-sm w-36 text-center outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                      <span className="text-xs text-slate-400">تحديد يدوي بالدقائق</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Selector / Creator */}
              <div className="space-y-5">
                <h3 className="text-md font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-400" />
                    المستفيد (الزبون)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(!showAddCustomer)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {showAddCustomer ? 'إلغاء الخروج' : 'تسجيل زبون سريع لأول مرة (+)'}
                  </button>
                </h3>

                {showAddCustomer ? (
                  /* Quick Customer Register Form */
                  <form onSubmit={handleQuickAddCustomer} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-3.5">
                    <p className="text-[11px] text-amber-400 font-medium">سيتم تسجيل زبون جديد فورياً في قاعدة البيانات وحفظه للعودة لاحقاً.</p>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-semibold">الاسم كاملاً:</label>
                      <input
                        type="text"
                        placeholder="مثال: خالد محمد عبيد"
                        value={quickName}
                        onChange={(e) => setQuickName(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-semibold">رقم الجوال:</label>
                      <input
                        type="text"
                        placeholder="مثال: 059xxxxxxxx"
                        value={quickPhone}
                        onChange={(e) => setQuickPhone(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition-all duration-200 text-white cursor-pointer"
                      >
                        حفظ العميل
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomer(false)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Customer Selector dropdown */
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400 block font-semibold">ابحث عن أو اختر العميل المسجل:</label>
                      
                      {/* Search box */}
                      <div className="relative">
                        <span className="absolute inset-y-0 right-3 flex items-center pr-1 text-slate-500 pointer-events-none">
                          <Search className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="ابحث بكتابة اسم الزبون أو رقم هاتفه..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="w-full pr-10 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600 outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Quick select live autocomplete recommendations */}
                    {customerSearchQuery.trim() !== '' && (
                      <div className="max-h-36 overflow-y-auto bg-slate-950/60 border border-slate-800/80 rounded-xl divide-y divide-slate-800/40 text-xs custom-scrollbar">
                        {searchedCustomers.length === 0 ? (
                          <div className="p-3 text-slate-500 text-center">لم يتم العثور على زبائن بهذا الاسم.</div>
                        ) : (
                          searchedCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setCustomerSearchQuery(''); // Clear on click
                              }}
                              className={`w-full text-right px-4 py-2.5 hover:bg-indigo-600/20 transition-all flex items-center justify-between cursor-pointer ${
                                selectedCustomerId === c.id ? 'bg-indigo-600/35 text-indigo-400' : 'text-slate-300'
                              }`}
                            >
                              <div>
                                <span className="font-semibold block">{c.name}</span>
                                {c.phone && <span className="text-[10px] text-slate-500 font-sans">{c.phone}</span>}
                              </div>
                              {c.subscriptionId ? (
                                <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">عضو مشترك</span>
                              ) : (
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">عادي</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl py-3 px-3 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="guest">زبون عابر (ضيف الصالة)</option>
                      {searchedCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} {c.subscriptionId ? '⭐ [عضو مشترك]' : ''}
                        </option>
                      ))}
                    </select>

                    {/* Subscription status feedback if customer is subscriber */}
                    {selectedCustomerId !== 'guest' && customers.find(c => c.id === selectedCustomerId)?.subscriptionId && (
                      <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-xs flex items-center gap-2 text-indigo-300">
                        <Sparkles className="h-4.5 w-4.5 text-yellow-400" />
                        <div>
                          <p className="font-bold text-slate-200">العميل مشترك شهري دائم!</p>
                          <p className="text-[11px] text-slate-400">يمكن خصم تكلفة ساعات اللعب مباشرة من رصيد عضويته عند انتهاء الجلسة.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Active Session controls: Order cafeteria and Checkout Checkout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
              
              {/* Right: Buffet shop cafeteria order addition & current bills (Cols 7) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Section 1: Active order buffer tally */}
                <div>
                  <h3 className="text-md font-bold text-slate-200 border-b border-slate-800 pb-2 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-4.5 w-4.5 text-indigo-400" />
                      منتجات البوفيه والمشروبات المسجلة على الجلسة
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded font-mono">
                      {activeSession.orders.length} طلب
                    </span>
                  </h3>

                  {activeSession.orders.length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 border border-dashed border-slate-800 rounded-2xl text-center select-none">
                      لا يوجد مشروبات أو مأكولات مضافة للجلسة حالياً. استخدم القائمة بالأسفل لإضافة طلبات.
                    </p>
                  ) : (
                    <div className="bg-slate-950/60 rounded-2xl border border-slate-800 max-h-[160px] overflow-y-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 border-b border-slate-800 sticky top-0 text-slate-400 select-none">
                          <tr>
                            <th className="p-3">اسم المنتج</th>
                            <th className="p-3 text-center">السعر</th>
                            <th className="p-3 text-center">الكمية</th>
                            <th className="p-3 text-center">الإجمالي</th>
                            <th className="p-3 text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {activeSession.orders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-900/40">
                              <td className="p-3 font-semibold text-slate-200">{o.name}</td>
                              <td className="p-3 text-center font-mono">{o.price} د.ع</td>
                              <td className="p-3 text-center font-mono font-bold text-indigo-400">{o.quantity}</td>
                              <td className="p-3 text-center font-mono text-emerald-400">{o.price * o.quantity} د.ع</td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeOrderFromSession(activeSession.id, o.id)}
                                  className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-all cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 2: Catalog shop */}
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Coffee className="h-4.5 w-4.5 text-emerald-400" />
                      إضافة طلبات البوفيه للصالة
                    </h3>
                    
                    {/* Category quick selectors */}
                    <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        onClick={() => setCafeCategory('all')}
                        className={`px-2 py-1 rounded transition-colors cursor-pointer ${cafeCategory === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        الكل
                      </button>
                      <button
                        onClick={() => setCafeCategory('drinks')}
                        className={`px-2 py-1 rounded transition-colors cursor-pointer ${cafeCategory === 'drinks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        مشروبات
                      </button>
                      <button
                        onClick={() => setCafeCategory('snacks')}
                        className={`px-2 py-1 rounded transition-colors cursor-pointer ${cafeCategory === 'snacks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        مسليات
                      </button>
                      <button
                        onClick={() => setCafeCategory('meals')}
                        className={`px-2 py-1 rounded transition-colors cursor-pointer ${cafeCategory === 'meals' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        مأكولات
                      </button>
                    </div>
                  </div>

                  {/* Cafe item grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[220px] p-0.5">
                    {filteredMenuItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-950/40 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs space-x-1 space-x-reverse"
                      >
                        <div className="text-right">
                          <span className="font-semibold text-slate-100 block truncate">{item.name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono block font-bold">{item.price} د.ع</span>
                          <span className={`text-[9px] block ${item.stock > 10 ? 'text-slate-500' : item.stock > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                            المخزون: {item.stock}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={item.stock === 0}
                          onClick={() => addOrderToSession(activeSession.id, item.id, 1)}
                          className={`p-2 rounded-lg text-white font-semibold transition-all cursor-pointer ${
                            item.stock === 0
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-500'
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Left Column: Settle accounts, final totals & simulated Receipt invoice printing (Cols 5) */}
              <div className="lg:col-span-5 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-5">
                
                {isReceiptView ? (
                  /* SIMULATED INVOICE RECEIPT POS DESIGN */
                  <div id="receipt-invoice-box" className="space-y-4">
                    <div className="border border-dashed border-slate-700/60 p-4 rounded-xl bg-white text-slate-900 font-mono text-xs space-y-3.5 text-right relative">
                      {/* Thermal Receipt headers */}
                      <span className="absolute top-2 left-2 text-[8px] border border-red-500 text-red-500 rounded px-1 scale-90">دفع تجريبي</span>
                      <div className="text-center space-y-1">
                        <h4 className="font-bold text-sm tracking-tight">قاعة ألعاب صالة الأركاد</h4>
                        <p className="text-[9px] text-slate-600">هاتف: 0780111222 | بغداد، العراق</p>
                        <p className="text-[10px] text-slate-500 font-bold border-t border-slate-300 pt-1">فاتورة تسوية حساب الجلسة</p>
                      </div>

                      {/* Meta */}
                      <div className="text-[10px] border-b border-dashed border-slate-300 pb-1.5 space-y-0.5 text-slate-700">
                        <div>جهاز التشغيل: <span className="font-bold text-black">{device.name}</span></div>
                        <div>الزبون: <span className="font-bold text-black">{activeSession.customerName}</span></div>
                        <div>وقت البدء: <span className="font-bold text-black font-sans">{new Date(activeSession.startTime).toLocaleTimeString('ar-EG')}</span></div>
                        <div>طريقة الدفع: <span className="font-bold text-black">{paymentMethod === 'cash' ? 'نقدي' : paymentMethod === 'card' ? 'شبكة / مدى' : 'خصم من رصيد ساعات الاشتراك'}</span></div>
                        <div>العملية بواسطة: <span className="font-bold text-black">{currentUser?.name || 'مدير النظام'}</span></div>
                      </div>

                      {/* Items table */}
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between border-b border-dashed border-slate-200 pb-1 font-bold">
                          <span>البيان / مدة اللعب</span>
                          <span>المبلغ</span>
                        </div>
                        {isSubscriberPayment ? (
                          <>
                            {subType === 'hours' ? (
                              <>
                                <div className="flex justify-between text-slate-800">
                                  <span>تغطية اشتراك ({coveredHoursBySub.toFixed(2)} ساعة)</span>
                                  <span>0 د.ع</span>
                                </div>
                                {extraPlayHours > 0 && (
                                  <div className="flex justify-between text-rose-750 font-bold">
                                    <span>ساعات لعب خارج الرصيد ({extraPlayHours.toFixed(2)} ساعة)</span>
                                    <span>{+(extraPlayHours * activeSession.hourlyRate).toFixed(2)} د.ع</span>
                                  </div>
                                )}
                                {activeSession.playType === 'multi' && (
                                  <div className="flex justify-between text-slate-900 border-b border-slate-100 pb-0.5">
                                    <span>فرق لعب زوجي للرصيد المغطى</span>
                                    <span>{doublePlayDiff} د.ع</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between text-slate-800">
                                  <span>حساب الجلسة ({activeSession.playType === 'single' ? 'فردي' : 'زوجي'} - اشتراك مفتوح)</span>
                                  <span>0 د.ع</span>
                                </div>
                                {activeSession.playType === 'multi' && (
                                  <div className="flex justify-between text-slate-900 font-bold border-b border-slate-100 pb-0.5">
                                    <span>- فرق سعر اللعب الزوجي</span>
                                    <span>{doublePlayDiff} د.ع</span>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span>حساب الجلسة ({activeSession.playType === 'single' ? 'فردي' : 'زوجي'})</span>
                            <span>{currentPlayAmt} د.ع</span>
                          </div>
                        )}
                        {activeSession.orders.map((o) => (
                          <div key={o.id} className="flex justify-between text-slate-800">
                            <span>- {o.name} (عدد {o.quantity})</span>
                            <span>{o.price * o.quantity} د.ع</span>
                          </div>
                        ))}
                      </div>

                      {/* Summary and totals */}
                      <div className="border-t border-dashed border-slate-300 pt-2 text-[11px] space-y-1 font-bold text-right font-mono">
                        <div className="flex justify-between text-slate-700">
                          <span>المجموع الفرعي:</span>
                          <span>{subTotal} د.ع</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span>خصم وتخفيض:</span>
                            <span>-{discount} د.ع</span>
                          </div>
                        )}
                        {loyaltyDiscountAmount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>خصم نقاط الولاء 🎁:</span>
                            <span>-{loyaltyDiscountAmount} د.ع</span>
                          </div>
                        )}
                        <div className="flex justify-between text-black text-xs font-extrabold border-t border-slate-300 pt-1.5 leading-none">
                          <span>المطلوب دفعه:</span>
                          <span>{finalTotal} د.ع</span>
                        </div>
                      </div>

                      {/* Footer bar */}
                      <div className="text-center pt-3 text-[9px] text-slate-500 border-t border-dashed border-slate-300 select-none">
                        <p>شكراً لزيارتكم صالة ألعابنا!</p>
                        <p>الرجاء العودة مجدداً</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsReceiptView(false)}
                      className="w-full py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 font-semibold text-xs rounded-xl"
                    >
                      تعديل الحساب أو تغيير طريقة الدفع
                    </button>
                  </div>
                ) : (
                  /* STANDARD SETTLE FORM */
                  <div className="space-y-4">
                    <h3 className="text-md font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2 text-right justify-start">
                      <DollarSign className="h-4.5 w-4.5 text-emerald-400" />
                      تسوية الحساب والمحاسبة المالية
                    </h3>

                    <div className="space-y-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs text-right">
                      {isSubscriberPayment ? (
                        <>
                          {subType === 'hours' ? (
                            <>
                              <div className="flex justify-between text-indigo-400">
                                <span>مغطى من رصيد العضوية ({coveredHoursBySub.toFixed(2)} ساعة):</span>
                                <span className="font-bold font-mono">0 د.ع</span>
                              </div>
                              {extraPlayHours > 0 && (
                                <div className="flex justify-between text-rose-400 font-bold">
                                  <span>ساعات لعب زائدة ({extraPlayHours.toFixed(2)} ساعة):</span>
                                  <span className="font-mono">+{+(extraPlayHours * activeSession.hourlyRate).toFixed(2)} د.ع</span>
                                </div>
                              )}
                              {activeSession.playType === 'multi' && (
                                <div className="flex justify-between text-yellow-400 font-semibold font-mono">
                                  <span>- فرق سعر اللعب الزوجي للرصيد المغطى:</span>
                                  <span>+{doublePlayDiff} د.ع</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between text-indigo-400">
                                <span>تكلفة اللعب (اشتراك غير محدود):</span>
                                <span className="font-bold font-mono">0 د.ع (مغطى)</span>
                              </div>
                              {activeSession.playType === 'multi' && (
                                <div className="flex justify-between text-yellow-400 font-bold font-mono">
                                  <span>- فرق سعر اللعب الزوجي:</span>
                                  <span>+{doublePlayDiff} د.ع</span>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-slate-400">تكلفة اللعب الجارية:</span>
                          <span className="font-bold text-indigo-300 font-mono">{currentPlayAmt} د.ع</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">إجمالي البوفيه/المقصف:</span>
                        <span className="font-bold text-emerald-300 font-mono">{currentOrdersAmt} د.ع</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-2 font-semibold">
                        <span className="text-slate-300">الإجمالي قبل الخصم:</span>
                        <span className="font-bold text-white font-mono">{subTotal} د.ع</span>
                      </div>
                      {applyLoyalty && (
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>🎁 خصم ساعة مجانية (الولاء):</span>
                          <span className="font-mono">-{loyaltyDiscountAmount} د.ع</span>
                        </div>
                      )}
                    </div>

                    {/* Customer loyalty status display & rewards action */}
                    {(() => {
                      const activeCustomer = activeSession && activeSession.customerId !== 'guest' ? customers.find(c => c.id === activeSession.customerId) : null;
                      if (!activeCustomer) return null;
                      return (
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/10 text-right space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                            <span className="text-[10px] text-slate-500">مكافآت برنامج الولاء 🌟</span>
                            <span className="text-xs font-bold text-indigo-400">{activeCustomer.name}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                            <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block">إجمالي الزيارات:</span>
                              <span className="text-xs font-bold text-slate-200 font-mono">{activeCustomer.visitsCount || 0}</span>
                            </div>
                            <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block">النقاط الحالية:</span>
                              <span className="text-xs font-bold text-indigo-300 font-mono">
                                {activeCustomer.loyaltyPoints || 0} / 5
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] text-slate-500">
                              <span>المستوى التالي</span>
                              <span>{activeCustomer.loyaltyPoints || 0} زيارات</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1 transition-all duration-500" 
                                style={{ width: `${Math.min(100, ((activeCustomer.loyaltyPoints || 0) / 5) * 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Unclaimed Rewards Button */}
                          {(activeCustomer.unclaimedRewards || 0) > 0 ? (
                            <button
                              type="button"
                              onClick={() => setApplyLoyalty(!applyLoyalty)}
                              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-between cursor-pointer ${
                                applyLoyalty 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-transparent shadow'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Award className="h-4 w-4 text-yellow-405 animate-bounce" />
                                <span>{applyLoyalty ? '✓ تم تطبيق المكافأة' : '🎁 تطبيق مكافأة ساعة مجانية'} ({activeCustomer.unclaimedRewards} متوفرة)</span>
                              </div>
                              <span className="text-[11px] font-mono">-{loyaltyDiscountAmount} د.ع</span>
                            </button>
                          ) : (
                            <p className="text-[10px] text-slate-500 text-center select-none pt-1">
                              💡 يحتاج العميل {(5 - (activeCustomer.loyaltyPoints || 0))} زيارات إضافية لكسب ساعة لعب مجانية!
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Discount picker input (Only cashier or owner) */}
                    {currentUser?.role !== 'captain' ? (
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-300 block font-semibold text-right">الخصم الإضافي (د.ع):</label>
                        <input
                          type="number"
                          min="0"
                          max={subTotal}
                          value={discount}
                          onChange={(e) => setDiscount(Math.min(subTotal, Math.max(0, +e.target.value)))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-yellow-400 font-bold font-mono outline-none focus:ring-1 focus:ring-indigo-500 text-left"
                        />
                      </div>
                    ) : (
                      <div className="text-slate-500 text-[11px] p-2 bg-slate-950/50 rounded-lg text-center">
                        * الكابتن لا يملك صلاحية منح خصومات للزبائن.
                      </div>
                    )}

                    {/* Settle Mode payment methods */}
                    <div className="space-y-2">
                      <label className="text-xs text-slate-300 block font-semibold text-right">طريقة سداد الفاتورة:</label>
                      <div className="grid grid-cols-3 gap-2" dir="rtl">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className={`py-3 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 select-none cursor-pointer group ${
                            paymentMethod === 'cash'
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.03]'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className={`p-2 rounded-xl transition-all ${
                            paymentMethod === 'cash' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-400 group-hover:text-slate-300'
                          }`}>
                            <Coins className="h-5 w-5" />
                          </div>
                          <span className="text-[11px] font-bold">نقدي / كاش</span>
                          <span className="text-[8px] opacity-75 font-medium">الأوراق النقدية 💵</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`py-3 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 select-none cursor-pointer group ${
                            paymentMethod === 'card'
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.03]'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className={`p-2 rounded-xl transition-all ${
                            paymentMethod === 'card' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-400 group-hover:text-slate-300'
                          }`}>
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <span className="text-[11px] font-bold">بطاقة / شبكة</span>
                          <span className="text-[8px] opacity-75 font-medium">ماستركارد / فيزا 💳</span>
                        </button>

                        <button
                          type="button"
                          disabled={activeSession.customerId === 'guest' || !customers.find(c => c.id === activeSession.customerId)?.subscriptionId}
                          onClick={() => setPaymentMethod('subscription')}
                          className={`py-3 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 select-none relative group ${
                            paymentMethod === 'subscription'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.03] cursor-pointer'
                              : (activeSession.customerId === 'guest' || !customers.find(c => c.id === activeSession.customerId)?.subscriptionId)
                                ? 'border-slate-900 bg-slate-950/40 text-slate-650 cursor-not-allowed opacity-40'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40 cursor-pointer'
                          }`}
                          title={activeSession.customerId === 'guest' ? 'هذه الخاصية غير متاحة للزبون العابر' : !customers.find(c => c.id === activeSession.customerId)?.subscriptionId ? 'هذا الزبون لا يملك اشتراكاً عائلياً نشطاً' : 'خصم من رصيد الاشتراك'}
                        >
                          <div className={`p-2 rounded-xl transition-all ${
                            paymentMethod === 'subscription' 
                              ? 'bg-amber-500/20 text-amber-300' 
                              : (activeSession.customerId === 'guest' || !customers.find(c => c.id === activeSession.customerId)?.subscriptionId)
                                ? 'bg-slate-950 text-slate-800'
                                : 'bg-slate-900 text-slate-400 group-hover:text-slate-300'
                          }`}>
                            <Award className="h-5 w-5" />
                          </div>
                          <span className="text-[11px] font-bold">رصيد العضوية</span>
                          <span className="text-[8px] opacity-75 font-medium">رصيد الساعات 🌟</span>
                        </button>
                      </div>
                      {activeSession.customerId !== 'guest' && customers.find(c => c.id === activeSession.customerId)?.subscriptionId && (
                        <p className="text-[10px] text-emerald-400 block pt-0.5 text-right">⭐ هذا العميل يملك اشتراك شهري نشط.</p>
                      )}
                    </div>

                    {/* Net pricing show */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/10 flex justify-between items-center">
                      <span className="text-xs text-slate-200 font-bold">الصافي النهائي للمحاسب:</span>
                      <span className="text-xl font-black text-emerald-400 font-mono">{finalTotal} د.ع</span>
                    </div>

                    {/* Action settled buttons based on roles */}
                    <div className="space-y-2 pt-2">
                      {currentUser?.role !== 'captain' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleCheckoutSettle}
                            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow duration-200 cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                            إنهاء الجلسة والدفع
                          </button>
                          
                          <button
                            onClick={() => setIsReceiptView(true)}
                            className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 duration-200 cursor-pointer"
                          >
                            <Printer className="h-4 w-4" />
                            الفاتورة
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                          * الكابتن لا يملك صلاحية لإقفال أو استلام قيمة الجلسات الفاينال، يرجى استدعاء الكاشير.
                        </div>
                      )}

                      {currentUser?.role === 'owner' && (
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من إلغاء وحذف هذه الجلسة بالكامل دون محاسبة؟')) {
                              cancelSession(activeSession.id);
                              onClose();
                            }
                          }}
                          className="w-full py-2 bg-red-950/40 hover:bg-red-900/30 text-red-400 text-xs font-semibold rounded-xl border border-red-500/20 flex items-center justify-center gap-1.5 hover:text-red-300 transition-all cursor-pointer"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          إلغاء الجلسة دون تصفية (المالك فقط)
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-3 px-8 text-xs select-none">
          {isStarting ? (
            <>
              <button
                type="button"
                onClick={handleStart}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Play className="h-4 w-4 fill-current" />
                تأكيد وبدء وقت اللعب الجاري
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer"
              >
                إلغاء الأمر
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl cursor-pointer"
            >
              إغلاق النافذة
            </button>
          )}
        </div>

      </div>

      {/* REACT PORTAL FOR PURE PRINTING (80MM THERMAL TICKET) */}
      {isPrinting && activeSession && createPortal(
        <div className="portal-print-container thermal-receipt text-right font-mono p-4" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', color: '#000000', backgroundColor: '#ffffff' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0' }}>قاعة ألعاب صالة الأركاد المتكاملة</h3>
            <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#333333' }}>هاتف: 0780111222 | بغداد، العراق</p>
            <p style={{ fontSize: '11px', fontWeight: 'bold', borderTop: '1px solid #000000', paddingTop: '4px', marginTop: '4px', margin: '4px 0 0 0' }}>فاتورة حساب الجلسة</p>
          </div>

          <div style={{ fontSize: '10px', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px', lineHeight: '1.5' }}>
            <div><strong>رقم الجلسة:</strong> {activeSession.id.substring(0, 8).toUpperCase()}</div>
            <div><strong>الجهاز:</strong> {device.name}</div>
            <div><strong>الزبون:</strong> {activeSession.customerName}</div>
            <div><strong>وقت البدء:</strong> {new Date(activeSession.startTime).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</div>
            <div><strong>وقت انتهاء الحساب:</strong> {new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</div>
            <div><strong>طريقة الدفع:</strong> {paymentMethod === 'cash' ? 'نقدي (كاش)' : paymentMethod === 'card' ? 'شبكة / بطاقة' : 'رصيد المشترك (ساعات)'}</div>
            <div><strong>تمت بواسطة:</strong> {currentUser?.name || 'كاشير الصالة'}</div>
          </div>

          <div style={{ fontSize: '10px', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #000000', paddingBottom: '4px', marginBottom: '4px' }}>
              <span>البيان / تفصيل الخدمة</span>
              <span style={{ textAlign: 'left' }}>القيمة</span>
            </div>
            {isSubscriberPayment ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>حساب الجلسة (عضوية اشتراك)</span>
                  <span style={{ fontFamily: 'monospace' }}>0 د.ع</span>
                </div>
                {activeSession.playType === 'multi' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>فرق سعر اللعب الزوجي</span>
                    <span style={{ fontFamily: 'monospace' }}>{doublePlayDiff.toLocaleString('en-US')} د.ع</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>أجرة وقت اللعب ({activeSession.playType === 'single' ? 'فردي' : 'زوجي'})</span>
                <span style={{ fontFamily: 'monospace' }}>{currentPlayAmt.toLocaleString('en-US')} د.ع</span>
              </div>
            )}
            {activeSession.orders.map((o) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>- {o.name} (x{o.quantity})</span>
                <span style={{ fontFamily: 'monospace' }}>{(o.price * o.quantity).toLocaleString('en-US')} د.ع</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333333' }}>
              <span>المجموع الفرعي:</span>
              <span style={{ fontFamily: 'monospace' }}>{subTotal.toLocaleString('en-US')} د.ع</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>الخصم الممنوح:</span>
                <span style={{ fontFamily: 'monospace' }}>-{discount.toLocaleString('en-US')} د.ع</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900', borderTop: '1px solid #000000', paddingTop: '4px', marginTop: '2px' }}>
              <span>الصافي المطلوب دفعه:</span>
              <span style={{ fontFamily: 'monospace' }}>{finalTotal.toLocaleString('en-US')} د.ع</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '9px', paddingTop: '8px', borderTop: '1px dashed #000000', color: '#555555' }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>شكراً لزيارتكم وطاب يومكم!</p>
            <p style={{ margin: '0 0 2px 0' }}>مجمع الأركاد للألعاب الترفيهية CENTRAL CENTRAL</p>
            <p style={{ margin: '0', fontSize: '8px', color: '#888888' }}>تاريخ الطباعة المباشرة: {new Date().toLocaleString('ar-EG')}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
