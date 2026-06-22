import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { MenuItem, GameSession } from '../types';
import { 
  X, Check, Plus, Minus, Trash2, Printer, Coffee, Search, ShoppingCart, Info
} from 'lucide-react';

interface DirectSaleModalProps {
  onClose: () => void;
}

export const DirectSaleModal: React.FC<DirectSaleModalProps> = ({ onClose }) => {
  const { menuItems, addDirectSale, currentUser } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'drinks' | 'snacks' | 'meals'>('all');
  
  // Cart state: item ID as key, quantity and item details as value
  const [cart, setCart] = useState<{ [id: string]: { item: MenuItem; quantity: number } }>({});
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [errorText, setErrorText] = useState('');
  
  // Receipt and Printing states
  const [isPrinting, setIsPrinting] = useState(false);
  const [printedSession, setPrintedSession] = useState<GameSession | null>(null);

  // Filter menu items by search and category
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const cartList = Object.values(cart) as { item: MenuItem; quantity: number }[];
  const totalAmount = cartList.reduce((sum, ci) => sum + (ci.item.price * ci.quantity), 0);

  const addToCart = (item: MenuItem) => {
    if (item.stock <= 0) {
      setErrorText(`عذراً، المنتج ${item.name} غير متوفر في المخزون حالياً.`);
      return;
    }
    
    setCart(prev => {
      const existing = prev[item.id];
      const maxQty = item.stock;
      
      if (existing) {
        if (existing.quantity >= maxQty) {
          setErrorText(`الكمية المطلوبة تتجاوز المتاح في المخزون لـ ${item.name}.`);
          return prev;
        }
        setErrorText('');
        return {
          ...prev,
          [item.id]: { ...existing, quantity: existing.quantity + 1 }
        };
      } else {
        setErrorText('');
        return {
          ...prev,
          [item.id]: { item, quantity: 1 }
        };
      }
    });
  };

  const updateQuantity = (itemId: string, diff: number) => {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      
      const newQty = existing.quantity + diff;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      
      if (newQty > existing.item.stock) {
        setErrorText(`الكمية المطلوبة تتجاوز المتاح في المخزون لـ ${existing.item.name}.`);
        return prev;
      }
      
      setErrorText('');
      return {
        ...prev,
        [itemId]: { ...existing, quantity: newQty }
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  // Robust print sequence
  useEffect(() => {
    if (isPrinting && printedSession) {
      let printTimer: any;
      const rAF1 = requestAnimationFrame(() => {
        const rAF2 = requestAnimationFrame(() => {
          printTimer = setTimeout(() => {
            window.print();
            setTimeout(() => {
              setIsPrinting(false);
              onClose();
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
  }, [isPrinting, printedSession, onClose]);

  const handleCheckout = async (printReceipt: boolean) => {
    if (cartList.length === 0) {
      setErrorText('الرجاء إضافة منتجات إلى السلة أولاً.');
      return;
    }

    try {
      const directSession = await addDirectSale(
        customerName.trim() || 'زبون كافتيريا مباشر',
        cartList,
        paymentMethod
      );

      if (printReceipt) {
        setPrintedSession(directSession);
        setIsPrinting(true);
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      setErrorText('حدث خطأ أثناء إتمام عملية البيع.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative text-right" dir="rtl">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">مبيعات كافتيريا مباشرة</h3>
                <p className="text-xs text-slate-400">بيع مشروبات ومأكولات لزبون خارجي دون فتح جلسة لعب</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Content Split Grid */}
          <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            
            {/* Right: Items Picker Catalog (7 cols) */}
            <div className="lg:col-span-7 p-4 flex flex-col h-full overflow-hidden border-l border-slate-800">
              {/* Search & Categories tabs */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <span className="absolute inset-y-0 right-3 flex items-center text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="ابحث عن منتج بالاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                      activeCategory === 'all' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setActiveCategory('drinks')}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                      activeCategory === 'drinks' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    مشروبات ☕
                  </button>
                  <button
                    onClick={() => setActiveCategory('snacks')}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                      activeCategory === 'snacks' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    مقبلات 🍟
                  </button>
                  <button
                    onClick={() => setActiveCategory('meals')}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                      activeCategory === 'meals' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    وجبات سريعة 🍔
                  </button>
                </div>
              </div>

              {/* Items grid */}
              <div className="flex-grow overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredMenuItems.map(item => {
                  const itemsInCartNum = cart[item.id]?.quantity || 0;
                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`p-3 bg-slate-950/40 hover:bg-slate-950 rounded-xl border transition cursor-pointer text-right flex flex-col justify-between ${
                        item.stock <= 0
                          ? 'border-slate-850 opacity-40 cursor-not-allowed'
                          : itemsInCartNum > 0
                          ? 'border-emerald-500/50 bg-emerald-950/5'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded leading-none">
                            {item.category === 'drinks' && 'مشروب'}
                            {item.category === 'snacks' && 'مقبلات'}
                            {item.category === 'meals' && 'وجبة'}
                          </span>
                          {itemsInCartNum > 0 && (
                            <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold leading-none font-mono">
                              {itemsInCartNum} بالسلة
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-slate-100 text-xs mt-2 line-clamp-2">{item.name}</h4>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-slate-900/60 flex justify-between items-end">
                        <span className="text-[10px] text-slate-500 font-mono">المخزون: {item.stock}</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">{item.price.toLocaleString()} د.ع</span>
                      </div>
                    </div>
                  );
                })}

                {filteredMenuItems.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500">
                    <Coffee className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs">لم يتم العثور على أي منتج يطابق خيار البحث.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Left: Cart & Checkout (5 cols) */}
            <div className="lg:col-span-5 p-4 bg-slate-950/20 flex flex-col h-full overflow-hidden justify-between">
              
              {/* Top Section: Customer Name & Cart list */}
              <div className="flex-grow flex flex-col overflow-hidden space-y-4">
                {/* Customer name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">اسم الزبون (اختياري)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثال: أحمد محمود (زبون كافتيريا)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-600 transition text-right"
                  />
                </div>

                {/* Cart list title */}
                <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/40 text-xs">
                  <span className="font-bold text-slate-300">سلة المبيعات المباشرة</span>
                  <span className="text-[10px] text-slate-400">إجمالي الأصناف: {cartList.length}</span>
                </div>

                {/* Selected Items Scroll container */}
                <div className="flex-grow overflow-y-auto pr-1 space-y-2">
                  {cartList.map(ci => (
                    <div
                      key={ci.item.id}
                      className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/50 flex justify-between items-center gap-2"
                    >
                      <div className="flex-grow text-right leading-relaxed select-none">
                        <span className="text-xs font-bold text-slate-100 block">{ci.item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{(ci.item.price).toLocaleString()} د.ع</span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg p-1.5 border border-slate-850">
                        <button
                          type="button"
                          onClick={() => updateQuantity(ci.item.id, 1)}
                          className="p-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-705 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold font-mono px-1.5 text-slate-100">{ci.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(ci.item.id, -1)}
                          className="p-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-705 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="text-left select-none pr-1">
                        <span className="text-xs font-bold text-indigo-400 font-mono block">{(ci.item.price * ci.quantity).toLocaleString()} د.ع</span>
                      </div>

                      <button
                        onClick={() => removeFromCart(ci.item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                        title="إزالة من السلة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {cartList.length === 0 && (
                    <div className="py-12 text-center text-slate-600 border border-dashed border-slate-850 rounded-xl bg-slate-950/10">
                      <ShoppingCart className="h-7 w-7 text-slate-800 mx-auto mb-2" />
                      <p className="text-xs">سلة التسوق فارغة حالياً. اضغط على أي منتج من القائمة لتعبئة السلة.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Section: Error message, Payment Method selection, Totals, Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/70 space-y-3.5">
                {errorText && (
                  <div className="p-2 border border-red-500/20 bg-red-950/20 text-red-400 rounded-xl text-[11px] font-medium flex items-center gap-1.5 animate-pulse">
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}

                {/* Payment Method selector */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 shadow-md shadow-emerald-950/30'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Check className={`h-3 w-3 ${paymentMethod === 'cash' ? 'opacity-100' : 'opacity-0'}`} />
                    الدفع كاش نقداً
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-950/20 text-indigo-400 shadow-md shadow-indigo-950/30'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Check className={`h-3 w-3 ${paymentMethod === 'card' ? 'opacity-100' : 'opacity-0'}`} />
                    دفع شبكة / بطاقة
                  </button>
                </div>

                {/* Sub-totals display */}
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">إجمالي أسعار السلة</span>
                    <span className="font-bold text-slate-200 font-mono">{totalAmount.toLocaleString()} د.ع</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 border-t border-slate-900/60 pt-2">
                    <span className="font-bold text-slate-100">المبلغ الإجمالي المستحق</span>
                    <span className="font-bold text-emerald-400 font-mono text-base">{totalAmount.toLocaleString()} د.ع</span>
                  </div>
                </div>

                {/* Invoice actions */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleCheckout(true)}
                    disabled={cartList.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-indigo-600 hover:to-indigo-500 disabled:opacity-40 text-slate-200 hover:text-white rounded-xl font-semibold transition cursor-pointer border border-slate-750 hover:border-indigo-500 shadow-md"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    طباعة وتسجيل كود الفاتورة
                  </button>
                  <button
                    onClick={() => handleCheckout(false)}
                    disabled={cartList.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white rounded-xl font-bold transition cursor-pointer shadow-md shadow-emerald-950/40"
                  >
                    تسجيل وقبض الفاتورة مباشرة
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* REACT PORTAL FOR DIRECT PRINTING (80MM THERMAL TICKET) */}
      {isPrinting && printedSession && createPortal(
        <div className="portal-print-container thermal-receipt text-right font-mono p-4" dir="rtl" style={{ direction: 'rtl', textAlign: 'right', color: '#000000', backgroundColor: '#ffffff' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '10px', marginBottom: '10px' }}>
            <h3 style={{ fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0' }}>قاعة ألعاب صالة الأركاد المتكاملة</h3>
            <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#333333' }}>هاتف: 0780111222 | بغداد، العراق</p>
            <p style={{ fontSize: '11px', fontWeight: 'bold', borderTop: '1px solid #000000', paddingTop: '4px', marginTop: '4px', margin: '4px 0 0 0' }}>فاتورة كافتيريا (مبيعات مباشرة)</p>
          </div>

          <div style={{ fontSize: '10px', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px', lineHeight: '1.5' }}>
            <div><strong>رقم الفاتورة:</strong> {printedSession.id.substring(0, 8).toUpperCase()}</div>
            <div><strong>القسم:</strong> مبيعات المقصف المباشرة</div>
            <div><strong>الزبون:</strong> {printedSession.customerName}</div>
            <div><strong>تاريخ البيع:</strong> {new Date(printedSession.startTime).toLocaleString('ar-EG')}</div>
            <div><strong>بواسطة الموظف:</strong> {currentUser?.name || 'مبيعات الصالة'}</div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', marginBottom: '8px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <th style={{ textAlign: 'right', padding: '4px 0' }}>الصنف</th>
                <th style={{ textAlign: 'center', padding: '4px 0' }}>الكمية</th>
                <th style={{ textAlign: 'left', padding: '4px 0' }}>السعر</th>
              </tr>
            </thead>
            <tbody>
              {printedSession.orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px dashed #e0e0e0' }}>
                  <td style={{ padding: '4px 0' }}>{o.name}</td>
                  <td style={{ textAlign: 'center', padding: '4px 0' }}>{o.quantity}</td>
                  <td style={{ textAlign: 'left', padding: '4px 0' }}>{(o.price * o.quantity).toLocaleString()} د.ع</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pricing Totals */}
          <div style={{ fontSize: '10px', lineHeight: '1.6', borderTop: '1px solid #000000', paddingTop: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>إجمالي المبيعات:</span>
              <strong>{(printedSession.totalOrdersAmount).toLocaleString()} د.ع</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginTop: '4px', borderTop: '1px dashed #000000', paddingTop: '4px' }}>
              <span>المبلع المقبوض:</span>
              <span>{(printedSession.finalAmount).toLocaleString()} د.ع</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555555', marginTop: '3px' }}>
              <span>طريقة الدفع:</span>
              <strong>{printedSession.paymentMethod === 'cash' ? 'كاش نقداً' : 'بطاقة شبكة'}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '8px', borderTop: '1px dashed #000000', fontSize: '9px' }}>
            <p>شكراً لزيارتكم! نرحب بكم دائماً في صالة ألعاب الأركاد.</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
