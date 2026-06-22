import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ClipboardList, Search, RefreshCw, Trash2, Shield, Calendar, 
  User, Computer, ShoppingCart, Tag, CreditCard, Users, AlertTriangle, CheckCircle,
  Download, FileText, Mail
} from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const { activityLogs, clearAllTestData, clearActivityLogs, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isDeletingLogs, setIsDeletingLogs] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  // Filter logs by search query, type selector and date range
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const logAction = log.action || '';
      const logDetails = log.details || '';
      const logStaffName = log.staffName || '';

      const matchesSearch = 
        logAction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        logDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
        logStaffName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === 'all' || log.type === selectedType;
      
      let matchesDate = true;
      if (log.timestamp) {
        const logDateStr = log.timestamp.split('T')[0];
        if (startDate && logDateStr < startDate) matchesDate = false;
        if (endDate && logDateStr > endDate) matchesDate = false;
      } else {
        if (startDate || endDate) matchesDate = false;
      }
      
      return matchesSearch && matchesType && matchesDate;
    });
  }, [activityLogs, searchTerm, selectedType, startDate, endDate]);

  const handleResetData = async () => {
    const isConfirmed = window.confirm('تحذير: هل أنت متأكد من رغبتك في مسح كافة بيانات الجلسات والعمليات والطلبات الحالية؟ لن يتم حذف الأجهزة أو الموظفين أو المنتجات، ولكن سيتم تصفير النشاط والتقارير المالية تماماً.');
    
    if (!isConfirmed) return;

    try {
      setIsResetting(true);
      await clearAllTestData();
      setResetMessage('تم تصفير البيانات التجريبية بنجاح وإعادة تشغيل النظام.');
      setTimeout(() => setResetMessage(null), 5000);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تصفير البيانات.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDownloadTxt = () => {
    if (activityLogs.length === 0) {
      alert('السجل فارغ حالياً، لا يوجد بيانات لتصديرها.');
      return;
    }

    const header = `==================================================
              سجل النشاط الإداري العام
     نظام إدارة صالة الألعاب والاشتراكات والمنيو
==================================================
تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}
إجمالي عدد العمليات المسجلة: ${activityLogs.length}
--------------------------------------------------\n\n`;

    const body = activityLogs.map((log, index) => {
      let formattedTime = 'تاريخ غير معروف';
      try {
        if (log.timestamp) {
          formattedTime = new Date(log.timestamp).toLocaleString('ar-EG');
        }
      } catch (err) {}
      const typeProps = getLogTypeProps(log.type);
      const typeLabel = typeProps ? typeProps.label : 'عام';
      return `${index + 1}. [${formattedTime}] (${typeLabel})
   الحدث: ${log.action}
   التفاصيل: ${log.details}
   المسؤول: ${log.staffName} (${log.staffRole === 'owner' ? 'مالك' : 'موظف'})
--------------------------------------------------`;
    }).join('\n\n');

    const fullBlobText = header + body;
    const blob = new Blob([fullBlobText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `سجل_النشاط_العام_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    if (activityLogs.length === 0) {
      alert('السجل فارغ حالياً، لا يوجد بيانات لتصديرها.');
      return;
    }
    const blob = new Blob([JSON.stringify(activityLogs, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `سجل_النشاط_العام_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendEmail = () => {
    if (activityLogs.length === 0) {
      alert('السجل فارغ حالياً، لا يوجد بيانات لإرسالها.');
      return;
    }

    const email = 'mero7.rap7@gmail.com';
    const subject = encodeURIComponent('سجل النشاط والأحداث اليومية - صالة الألعاب');
    
    // safe slice
    const recentLogs = activityLogs.slice(0, 30);
    const dateStr = new Date().toLocaleString('ar-EG');
    
    let bodyText = `أهلاً بك،\n\nنرفق لك تقرير سجل النشاط لآخر ${recentLogs.length} عملية مسجلة في النظام كملخص سريع.\n`;
    bodyText += `تاريخ التصدير: ${dateStr}\n`;
    bodyText += `إجمالي العمليات في النظام: ${activityLogs.length}\n\n`;
    bodyText += `--- ملخص السجل (آخر 30 حدث) ---\n\n`;

    recentLogs.forEach((log, index) => {
      let formattedTime = 'تاريخ غير معروف';
      try {
        if (log.timestamp) {
          formattedTime = new Date(log.timestamp).toLocaleString('ar-EG');
        }
      } catch (err) {}
      const typeProps = getLogTypeProps(log.type);
      const typeLabel = typeProps ? typeProps.label : 'عام';
      bodyText += `${index + 1}. [${formattedTime}] - ${log.action} (${typeLabel})\n`;
      bodyText += `   التفاصيل: ${log.details}\n`;
      bodyText += `   بواسطة: ${log.staffName}\n`;
      bodyText += `-------------------------------------------\n`;
    });

    bodyText += `\n\nتنويه: يمكنك الحصول على النسخة الكاملة لكافة سجلات العمليات والنشاط دفعة واحدة عبر زر "تنزيل السجل" كملف نصي (.txt) أو ملف (.json) من داخل لوحة إعدادات النظام.`;

    const body = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleDeleteLogs = async () => {
    try {
      setIsDeletingLogs(true);
      await clearActivityLogs();
      setDeleteMessage('تم إفراغ وحذف سجل العمليات والأنشطة الإدارية بالكامل بنجاح!');
      setShowDeleteConfirm(false);
      setTimeout(() => setDeleteMessage(null), 5000);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء محاولة حذف السجل.');
    } finally {
      setIsDeletingLogs(false);
    }
  };

  // Helper to format activity type badges
  const getLogTypeProps = (type: string) => {
    switch (type) {
      case 'device':
        return { label: 'الأجهزة', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: Computer };
      case 'customer':
        return { label: 'الزبائن', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: User };
      case 'subscription':
        return { label: 'الاشتراكات', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Tag };
      case 'menu':
        return { label: 'المنيو والمقهى', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: ShoppingCart };
      case 'session':
        return { label: 'جلسات اللعب', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: ClipboardList };
      case 'transaction':
        return { label: 'حسابات ومبيعات', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: CreditCard };
      case 'staff':
        return { label: 'الموظفين', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Users };
      default:
        return { label: 'عام', color: 'bg-slate-500/10 text-slate-400 border-slate-700/50', icon: Shield };
    }
  };

  // Helper to get Role labels
  const getRoleLabel = (role: string) => {
    if (role === 'owner') return 'مالك';
    if (role === 'cashier') return 'كاشير';
    return 'كابتن';
  };

  if (currentUser?.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-yellow-500 animate-pulse" />
        <h3 className="text-xl font-bold text-white">غير مصرح بدخول هذه الصفحة</h3>
        <p className="text-sm text-slate-400">سجل النشاط والإعدادات الإدارية مخصصة لمالك الصالة حصرياً.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-12" id="settings-manager-view">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-3 py-1 rounded-full border border-indigo-500/10 tracking-wider">
            صلاحيات المالك حصراً
          </span>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2 mt-2">
            <Shield className="h-6 w-6 text-indigo-400" />
            إعدادات النظام وسجل النشاط العام
          </h2>
          <p className="text-xs text-slate-400 select-none mt-1">تتبع كافة أحداث الإضافة والتعديل والحذف وتشغيل الجلسات لحظة بلحظة لتدقيق العمل اليومي.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Controls Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 space-y-6">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-400" />
              أدوات الإدارة والتحكم
            </h3>

            {/* Total count statistic */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 text-center">
              <span className="text-slate-500 text-[11px] block select-none">إجمالي الأحداث المسجلة</span>
              <span className="text-2xl font-black text-indigo-400 font-mono mt-1 block">
                {activityLogs.length}
              </span>
              <span className="text-[9px] text-slate-400 block mt-1">يتم الاحتفاظ بآخر ٥٠٠٠ عملية بالسجل لتتبع مكثف</span>
            </div>

            {/* Export & Save Logs Tools */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 select-none">
                <Download className="h-3.5 w-3.5 text-indigo-400" />
                تصدير وحفظ السجل
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                قم بالاحتفاظ بنسخة ورقية أو رقمية من العمليات الإدارية وتنزيلها مباشرة إلى جهازك أو إرسالها لبريدك المعتمد.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="تنزيل كتقرير نصي منسق ومفهوم"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>ملف نصي</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="تنزيل البيانات بصيغة JSON البرمجية"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>نسخة JSON</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendEmail}
                className="w-full py-2.5 bg-indigo-950/40 opacity-100 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/25 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="h-4 w-4 text-indigo-400" />
                <span>إرسال بالبريد الإلكتروني</span>
              </button>
            </div>

            {/* Clear Activity Logs Tool */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 select-none">
                <Trash2 className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                تصفير وإفراغ سجل النشاط
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                تفريغ وحذف كافة السجلات الزمنية للأحداث. هذا الخيار يمسح سجل التدقيق فقط دون المساس ببيانات الموظفين أو الجلسات.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 bg-rose-950/30 text-rose-400 hover:bg-rose-900/40 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>حذف السجل بالكامل</span>
                </button>
              ) : (
                <div className="p-3.5 bg-rose-950/60 border-2 border-rose-600 rounded-xl space-y-3 animate-pulse">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[11px] font-black text-rose-200">تحذير أمني وقانوني حرج!</h5>
                      <p className="text-[10px] text-rose-300 leading-normal mt-1">
                        أنت على وشك مسح سجل النشاط الإداري كلياً. سيترتب على هذا الإجراء حذف كافة تفاصيل العمليات وأنشطة الموظفين المسجلة بالتوقيت، ولا يمكن التراجع عن هذه الخطوة أبداً!
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDeletingLogs}
                      onClick={handleDeleteLogs}
                      className="py-1.5 bg-rose-600 text-white rounded-lg text-xs font-black hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isDeletingLogs ? 'جاري الحذف...' : 'نعم، احذف نهائياً'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingLogs}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      تراجع وإلغاء
                    </button>
                  </div>
                </div>
              )}

              {deleteMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs leading-normal flex items-start gap-1.5">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{deleteMessage}</span>
                </div>
              )}
            </div>

            {/* Clear Database Tool */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                صيانة وتصفير الجلسات والطلبات
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                برجاء استخدام هذا الخيار بحذر. يقوم بتصفير الجلسات وحذف سجل المبيعات والمدفوعات لتجهيز النظام لوردية أو فترة عمل جديدة.
              </p>
              
              <button
                type="button"
                onClick={handleResetData}
                disabled={isResetting}
                className="w-full py-2 bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'جاري التصفير...' : 'تصفير البيانات التجريبية'}</span>
              </button>

              {resetMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs leading-normal flex items-start gap-1.5">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{resetMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Logs Table Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Filters Bar card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="ابحث بالحدث، التفاصيل أو الموظف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 font-sans focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            {/* Categories horizontal list */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto overflow-x-auto select-none no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                  selectedType === 'all'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-950/60 border-slate-850 hover:bg-slate-905 text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
              {(['device', 'customer', 'subscription', 'menu', 'session', 'transaction', 'staff'] as const).map(type => {
                const props = getLogTypeProps(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border flex items-center gap-1.5 ${
                      selectedType === type
                        ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-950/60 border-slate-850 hover:bg-slate-905 text-slate-400 hover:text-white'
                    }`}
                  >
                    <props.icon className="h-3.5 w-3.5" />
                    <span>{props.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Date Filter Bar */}
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between mt-3 text-xs select-none">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-400" />
                تصفية حسب النطاق الزمني:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-500">من تاريخ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-slate-200 outline-none focus:ring-0 font-mono text-center w-28 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-500">إلى تاريخ:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-slate-200 outline-none focus:ring-0 font-mono text-center w-28 text-xs"
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-1.5 bg-rose-950/45 hover:bg-rose-900/50 text-rose-400 border border-rose-500/15 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1"
                id="clear-logs-date-filter"
              >
                مسح فلتر التاريخ
              </button>
            )}
          </div>

          {/* Table view layout */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-850 text-slate-400 text-xs font-bold leading-none select-none">
                    <th className="py-4 px-5">الوقت والتاريخ</th>
                    <th className="py-4 px-5">تصنيف العملية</th>
                    <th className="py-4 px-5">النشاط</th>
                    <th className="py-4 px-5">التفاصيل الكاملة</th>
                    <th className="py-4 px-5">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-500 font-sans">
                        <ClipboardList className="h-12 w-12 mx-auto text-slate-700 mb-3" />
                        <span>لم يتم العثور على أي نشاطات مطابقة لمعايير البحث حالياً.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const props = getLogTypeProps(log.type);
                      const IconComponent = props.icon;
                      let formattedTime = 'سجل غير معروف التاريخ';
                      try {
                        if (log.timestamp) {
                          formattedTime = new Date(log.timestamp).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          });
                        }
                      } catch (err) {
                        console.error('Failed to parse log timestamp', err);
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-905/30 transition-colors">
                          {/* Date and hour */}
                          <td className="py-3 px-5 whitespace-nowrap text-slate-400 font-mono">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                              <span>{formattedTime}</span>
                            </div>
                          </td>

                          {/* Type category */}
                          <td className="py-3 px-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[10px] uppercase font-bold tracking-wide ${props.color}`}>
                              <IconComponent className="h-3 w-3 shrink-0" />
                              <span>{props.label}</span>
                            </span>
                          </td>

                          {/* Log Title */}
                          <td className="py-3 px-5 whitespace-nowrap font-bold text-slate-200">
                            {log.action}
                          </td>

                          {/* Log Details */}
                          <td className="py-3 px-5 text-slate-300 leading-relaxed font-sans max-w-xs md:max-w-md truncate" title={log.details}>
                            {log.details}
                          </td>

                          {/* Operator name and role */}
                          <td className="py-3 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-200 font-medium">{log.staffName}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                                log.staffRole === 'owner' 
                                  ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                                  : log.staffRole === 'cashier'
                                    ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' 
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              }`}>
                                {getRoleLabel(log.staffRole)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
