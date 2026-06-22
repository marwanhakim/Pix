import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { GameSession } from '../types';
import { 
  Search, Calendar, Printer, Clock, Coffee, Gamepad2, 
  Ban, Sparkles, Filter, X, CheckCircle2, Ticket 
} from 'lucide-react';

export const SessionsHistory: React.FC = () => {
  const { sessions, devices, menuItems } = useApp();
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // all, completed, cancelled
  
  // Selected session for viewing receipt details
  const [selectedReceiptSession, setSelectedReceiptSession] = useState<GameSession | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Robust print sequence: waiting for browser layout and repaint flows to guarantee thermal layout is fully visible.
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

  // Get only previous (non-active) sessions
  const previousSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  // Filter previous sessions based on user inputs
  const filteredSessions = previousSessions.filter(s => {
    // 1. Search term match (customer name or device name)
    const matchesSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.id && s.id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 2. Device filter match
    const matchesDevice = selectedDeviceFilter === 'all' || s.deviceId === selectedDeviceFilter;
    
    // 3. Status filter match
    const matchesStatus = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;
    
    return matchesSearch && matchesDevice && matchesStatus;
  });

  // Calculate some fast summary metrics for past sessions
  const completedCount = filteredSessions.filter(s => s.status === 'completed').length;
  const cancelledCount = filteredSessions.filter(s => s.status === 'cancelled').length;
  const totalRevenue = filteredSessions
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + (s.finalAmount || 0), 0);

  // Helper function to format date
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Helper to calculate play duration in minutes
  const calculatePlayDuration = (session: GameSession) => {
    const start = new Date(session.startTime).getTime();
    const end = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    const diffMins = Math.round((end - start) / 60000);
    return Math.max(1, diffMins);
  };

  const handlePrintReceipt = () => {
    setIsPrinting(true);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Summary metric blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Revenue Box */}
        <div className="bg-gradient-to-l from-emerald-950/20 via-slate-900 to-slate-900 p-5 rounded-2xl border border-emerald-500/15 text-right flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 block">إجمالي المقبوضات المالية للأرشيف</span>
            <h4 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{totalRevenue.toLocaleString('en-US')} د.ع</h4>
            <p className="text-[10px] text-slate-500 mt-1">تراكم الجلسات المكتملة الظاهرة أدناه</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Completed Count Box */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-right flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 block">الجلسات المسواة (المكتملة)</span>
            <h4 className="text-2xl font-black text-slate-100 mt-1 font-mono">{completedCount} جلسة</h4>
            <p className="text-[10px] text-slate-500 mt-1">جلست مسددة ومسجلة تحت الحساب</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/10">
            <Ticket className="h-6 w-6" />
          </div>
        </div>

        {/* Cancelled Box */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-right flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 block">الجلسات الملغاة</span>
            <h4 className="text-2xl font-black text-red-400 mt-1 font-mono">{cancelledCount} جلسة</h4>
            <p className="text-[10px] text-slate-500 mt-1">جلسات ملغية قبل المحاسبة</p>
          </div>
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/10">
            <Ban className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 2. Advanced Interactive Filter bar */}
      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch md:items-center justify-between text-right">
          
          {/* Real-time search bar */}
          <div className="relative flex-grow max-w-md">
            <span className="absolute inset-y-0 right-3 flex items-center pr-1 text-slate-500 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="ابحث باسم الزبون المعني أو كود الجلسة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Device filtering option */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1">
              <span className="text-[11px] text-slate-500">الجهاز:</span>
              <select
                value={selectedDeviceFilter}
                onChange={(e) => setSelectedDeviceFilter(e.target.value)}
                className="bg-transparent text-slate-300 text-xs py-1 focus:outline-none cursor-pointer"
              >
                <option value="all">الكل</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Status filtering option */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1">
              <span className="text-[11px] text-slate-500">الحالة:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-slate-300 text-xs py-1 focus:outline-none cursor-pointer"
              >
                <option value="all">كل الجلسات</option>
                <option value="completed">المكتملة</option>
                <option value="cancelled">الملغاة</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Log Records table */}
      {filteredSessions.length === 0 ? (
        <div className="bg-slate-900/10 border border-slate-800 border-dashed rounded-2xl p-16 text-center text-slate-400">
          <Clock className="h-12 w-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm">لم يتم العثور على أي جلسات سابقة تطابق خيارات الفلترة المدخلة.</p>
        </div>
      ) : (
        <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto text-right">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-xs font-semibold">
                  <th className="p-4">الجهاز والنوع</th>
                  <th className="p-4">اسم الزبون</th>
                  <th className="p-4">وقت وتاريخ الجلسة</th>
                  <th className="p-4">مدة اللعب</th>
                  <th className="p-4">مبيعات المقصف</th>
                  <th className="p-4">المبلغ الكلي</th>
                  <th className="p-4">طريقة الدفع/الحالة</th>
                  <th className="p-4 text-center">تفاصيل الفاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-xs">
                {filteredSessions.map((session) => {
                  const isCafeSale = session.deviceId === 'direct_sale';
                  const dev = devices.find(d => d.id === session.deviceId);
                  const isCancelled = session.status === 'cancelled';
                  const playMins = calculatePlayDuration(session);
                  const hours = Math.floor(playMins / 60);
                  const mins = playMins % 60;
                  const durationStr = isCafeSale ? 'كافتيريا فقط' : (hours > 0 ? `${hours} س و ${mins} د` : `${mins} دقيقة`);
                  
                  // Calculate total items ordered
                  const totalOrdersTally = session.orders.reduce((sum, o) => sum + o.quantity, 0);

                  return (
                    <tr 
                      key={session.id} 
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Device column */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${
                            isCancelled 
                              ? 'bg-red-500/10 text-red-400' 
                              : isCafeSale 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-indigo-500/10 text-indigo-400'
                          }`}>
                            {isCafeSale ? <Coffee className="h-4 w-4" /> : <Gamepad2 className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-100 block">
                              {isCafeSale ? 'كافتيريا (بيع مباشر)' : (dev?.name || 'جهاز محذوف')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isCafeSale ? 'مبيعات مقصف' : (dev?.type || 'بليستيشن')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="p-4 font-medium text-slate-300">
                        {session.customerName}
                      </td>

                      {/* DateTime column */}
                      <td className="p-4 text-slate-400 font-sans">
                        {formatDateTime(session.startTime)}
                      </td>

                      {/* Duration */}
                      <td className="p-4 text-slate-300 font-semibold font-sans">
                        {durationStr}
                      </td>

                      {/* Cafe Orders */}
                      <td className="p-4">
                        {totalOrdersTally > 0 ? (
                          <div className="flex items-center gap-1 text-emerald-400 font-bold">
                            <Coffee className="h-3.5 w-3.5" />
                            <span>{totalOrdersTally} طلبات</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">لا يوجد</span>
                        )}
                      </td>

                      {/* Total bill paid */}
                      <td className="p-4 text-slate-100 font-bold font-mono text-sm leading-none">
                        {isCancelled ? (
                          <span className="text-red-400">0 د.ع</span>
                        ) : (
                          <span className="text-emerald-400">{(session.finalAmount || 0).toLocaleString('en-US')} د.ع</span>
                        )}
                      </td>

                      {/* Payment/Status */}
                      <td className="p-4">
                        {isCancelled ? (
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/10 font-bold">
                            ملغاة
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/10 font-bold">
                            {session.paymentMethod === 'cash' ? 'نقدي' : session.paymentMethod === 'card' ? 'بطاقة رصيد' : 'مشترك مخصوم'}
                          </span>
                        )}
                      </td>

                      {/* View Button */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedReceiptSession(session)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition border border-slate-700 hover:border-indigo-500 cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>الفاتورة</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Thermal Invoice POPUP Receipt render */}
      {selectedReceiptSession && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative text-right flex flex-col max-h-[90vh]">
            
            {/* Modal header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <button
                onClick={() => setSelectedReceiptSession(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                عرض الفاتورة المسجلة للفواتير
              </span>
            </div>

            {/* Simulated Paper POS bill container */}
            <div className="p-6 overflow-y-auto bg-slate-50 text-slate-900 font-mono text-xs flex-grow print:bg-white text-right">
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-400">
                <h3 className="font-sans font-black text-sm text-slate-950">مجمع أرکاد بليستيشن وبلياردو</h3>
                <p className="text-[10px] text-slate-600">بغداد، العراق - هاتف المحل: 07700000000</p>
                <p className="text-[10px] text-slate-600 font-sans">تاريخ الخدمة: {formatDateTime(selectedReceiptSession.startTime)}</p>
              </div>

              {/* Receipt Details metadata */}
              <div className="py-4 space-y-1 border-b border-dashed border-slate-400 text-[10px] text-slate-700 font-sans">
                <div className="flex justify-between">
                  <span>{selectedReceiptSession.id?.substring(0, 8) || 'S-1293'}</span>
                  <span className="font-semibold text-slate-500">رقم الفاتورة:</span>
                </div>
                <div className="flex justify-between">
                  <span>{selectedReceiptSession.customerName}</span>
                  <span className="font-semibold text-slate-500">الزبون لـ:</span>
                </div>
                <div className="flex justify-between">
                  <span>{selectedReceiptSession.deviceId === 'direct_sale' ? 'كافتيريا (بيع مباشر)' : (devices.find(d => d.id === selectedReceiptSession.deviceId)?.name || 'جهاز الألعاب')}</span>
                  <span className="font-semibold text-slate-500">جهاز اللعب:</span>
                </div>
                {selectedReceiptSession.deviceId !== 'direct_sale' && (
                  <div className="flex justify-between">
                    <span>{selectedReceiptSession.playType === 'single' ? 'لعب فردي' : 'لعب زوجي'}</span>
                    <span className="font-semibold text-slate-500 font-sans">أسلوب اللعبة:</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{formatDateTime(selectedReceiptSession.startTime)}</span>
                  <span className="font-semibold text-slate-500">توقيت البدء:</span>
                </div>
                {selectedReceiptSession.endTime && (
                  <div className="flex justify-between">
                    <span>{formatDateTime(selectedReceiptSession.endTime)}</span>
                    <span className="font-semibold text-slate-500">توقيت الانتهاء:</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{calculatePlayDuration(selectedReceiptSession)} دقيقة</span>
                  <span className="font-semibold text-slate-500">الزمن الفعلي للعب:</span>
                </div>
              </div>

              {/* Cafe Items orders lists */}
              <div className="py-4 border-b border-dashed border-slate-400 space-y-2">
                <p className="font-bold font-sans text-slate-900 border-b border-slate-300 pb-1">تفاصيل محاسبة التكلفة والطلبات:</p>
                
                {/* 1. Play time charge calculation */}
                <div className="flex justify-between text-slate-800">
                  <div className="font-mono">{(selectedReceiptSession.totalPlayAmount || 0).toLocaleString('en-US')} د.ع</div>
                  <div className="font-sans font-medium text-slate-600">أجرة وقت اللعبة:</div>
                </div>

                {/* 2. Cafe Drinks ordered bills */}
                {selectedReceiptSession.orders.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                    <p className="text-[10px] text-slate-500 font-semibold font-sans">طلبات المقصف والمشروبات:</p>
                    {selectedReceiptSession.orders.map((order, i) => (
                      <div key={i} className="flex justify-between text-slate-800 text-[10px] leading-tight">
                        <div className="font-mono">{(order.price * order.quantity).toLocaleString('en-US')} د.ع</div>
                        <div className="font-sans max-w-[170px] truncate text-slate-700 pl-2">
                          {order.name} <span className="font-mono text-slate-500">(x{order.quantity})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Receipts Total Bill Footer */}
              <div className="py-4 space-y-1.5 font-sans">
                <div className="flex justify-between text-xs text-slate-700">
                  <span className="font-mono">{((selectedReceiptSession.totalPlayAmount || 0) + (selectedReceiptSession.totalOrdersAmount || 0)).toLocaleString('en-US')} د.ع</span>
                  <span>المبلغ الفرعي:</span>
                </div>
                {selectedReceiptSession.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-red-600">
                    <span className="font-mono">-{selectedReceiptSession.discountAmount.toLocaleString('en-US')} د.ع</span>
                    <span>قيمة الخصم الممنوح:</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-300">
                  <span className="font-mono">{(selectedReceiptSession.finalAmount || 0).toLocaleString('en-US')} د.ع</span>
                  <span>المبلغ الصافي المدفوع:</span>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-dashed border-slate-400 font-sans text-[10px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-900">شكرًا لزيارتكم وصحتين وعافية!</p>
                <p>تم تسوية الحساب بواسطة: {selectedReceiptSession.endedBy || 'كاشير الصالة'}</p>
                <p className="text-[8px] text-slate-400">تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}</p>
              </div>
            </div>

            {/* Modal actions buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex gap-2">
              <button
                onClick={() => setSelectedReceiptSession(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-center text-xs font-bold transition cursor-pointer"
              >
                إغلاق النافذة
              </button>
              <button
                onClick={handlePrintReceipt}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة الفاتورة</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REACT PORTAL FOR PURE PRINTING (80MM THERMAL TICKET) */}
      {isPrinting && selectedReceiptSession && createPortal(
        <div className="portal-print-container thermal-receipt text-right font-mono p-4" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', color: '#000000', backgroundColor: '#ffffff' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0' }}>قاعة ألعاب صالة الأركاد المتكاملة</h3>
            <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#333333' }}>هاتف: 0780111222 | بغداد، العراق</p>
            <p style={{ fontSize: '11px', fontWeight: 'bold', borderTop: '1px solid #000000', paddingTop: '4px', marginTop: '4px', margin: '4px 0 0 0' }}>فاتورة حساب الجلسة (أرشيف)</p>
          </div>

          <div style={{ fontSize: '10px', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px', lineHeight: '1.5' }}>
            <div><strong>رقم الفاتورة:</strong> {selectedReceiptSession.id?.substring(0, 8).toUpperCase() || 'S-1293'}</div>
            <div><strong>القسم / الجهاز:</strong> {selectedReceiptSession.deviceId === 'direct_sale' ? 'مبيعات كافتيريا مباشرة' : (devices.find(d => d.id === selectedReceiptSession.deviceId)?.name || 'جهاز ألعاب')}</div>
            <div><strong>الزبون:</strong> {selectedReceiptSession.customerName}</div>
            <div><strong>وقت البدء:</strong> {formatDateTime(selectedReceiptSession.startTime)}</div>
            {selectedReceiptSession.deviceId !== 'direct_sale' && selectedReceiptSession.endTime && (
              <div><strong>وقت الانتهاء:</strong> {formatDateTime(selectedReceiptSession.endTime)}</div>
            )}
            {selectedReceiptSession.deviceId !== 'direct_sale' && (
              <div><strong>مدة اللعب الفعلية:</strong> {calculatePlayDuration(selectedReceiptSession)} دقيقة</div>
            )}
            <div><strong>طريقة الدفع:</strong> {selectedReceiptSession.paymentMethod === 'cash' ? 'نقدي (كاش)' : selectedReceiptSession.paymentMethod === 'card' ? 'شبكة / بطاقة' : 'رصيد المشترك (ساعات)'}</div>
            <div><strong>سجلت بواسطة:</strong> {selectedReceiptSession.endedBy || 'كاشير الصالة'}</div>
          </div>

          <div style={{ fontSize: '10px', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #000000', paddingBottom: '4px', marginBottom: '4px' }}>
              <span>البيان / تفصيل الخدمة</span>
              <span style={{ textAlign: 'left' }}>القيمة</span>
            </div>
            {selectedReceiptSession.deviceId !== 'direct_sale' && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>أجرة وقت اللعب</span>
                <span style={{ fontFamily: 'monospace' }}>{(selectedReceiptSession.totalPlayAmount || 0).toLocaleString('en-US')} د.ع</span>
              </div>
            )}
            {selectedReceiptSession.orders.map((o, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>- {o.name} (x{o.quantity})</span>
                <span style={{ fontFamily: 'monospace' }}>{(o.price * o.quantity).toLocaleString('en-US')} د.ع</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333333' }}>
              <span>المجموع الفرعي:</span>
              <span style={{ fontFamily: 'monospace' }}>{((selectedReceiptSession.totalPlayAmount || 0) + (selectedReceiptSession.totalOrdersAmount || 0)).toLocaleString('en-US')} د.ع</span>
            </div>
            {selectedReceiptSession.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>الخصم الممنوح:</span>
                <span style={{ fontFamily: 'monospace' }}>-{selectedReceiptSession.discountAmount.toLocaleString('en-US')} د.ع</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900', borderTop: '1px solid #000000', paddingTop: '4px', marginTop: '2px' }}>
              <span>إجمالي الصافي المدفوع:</span>
              <span style={{ fontFamily: 'monospace' }}>{(selectedReceiptSession.finalAmount || 0).toLocaleString('en-US')} د.ع</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '9px', paddingTop: '8px', borderTop: '1px dashed #000000', color: '#555555' }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>شكراً لزيارتكم وصحتين وعافية!</p>
            <p style={{ margin: '0' }}>تم استخراج هذه الفاتورة من سجلات الأرشيف المالي</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#888888' }}>تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}</p>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
