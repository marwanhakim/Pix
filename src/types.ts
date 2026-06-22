export type Role = 'owner' | 'cashier' | 'captain';

export interface StaffUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export type DeviceType = string;
export type DeviceSection = 'standard' | 'vip' | 'billiards';
export type DeviceStatus = 'available' | 'busy' | 'maintenance';

export interface Device {
  id: string; // Document ID (e.g., '1', '2', etc.)
  name: string; // e.g., "جهاز 1" / "VIP Lounge"
  type: string;
  section: DeviceSection;
  status: DeviceStatus;
  currentSessionId: string | null;
  hourlyRateSingle: number;
  hourlyRateMulti: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  subscriptionId?: string | null;
  createdAt: string;
  visitsCount?: number;
  loyaltyPoints?: number;
  unclaimedRewards?: number;
}

export type SubscriptionType = 'hours' | 'unlimited';

export interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  planName: string; // e.g., "الاشتراك الفضي", "اللقاء الذهبي"
  type: SubscriptionType;
  totalHours: number; // For hours-based
  remainingHours: number;
  pricePaid: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired';
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  purchaseCost?: number; // سعر الشراء / التكلفة
  category: 'drinks' | 'snacks' | 'meals';
  stock: number;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  purchaseCost?: number; // سعر الشراء وقت الطلب
  timestamp: string;
}

export type SessionType = 'open' | 'fixed';
export type PlayType = 'single' | 'multi';
export type SessionStatus = 'active' | 'completed' | 'cancelled';

export interface GameSession {
  id: string;
  deviceId: string;
  deviceName: string;
  customerId: string; // 'guest' or Customer ID
  customerName: string; // Name of customer or 'زبون عابر'
  startTime: string; // ISO string
  endTime: string | null; // ISO string (computed if fixed, set on close if open)
  sessionType: SessionType;
  playType: PlayType;
  fixedDuration: number | null; // in minutes
  hourlyRate: number;
  status: SessionStatus;
  orders: OrderItem[];
  totalPlayAmount: number;
  totalOrdersAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: 'cash' | 'card' | 'subscription' | null;
  endedBy?: string; // UID of Staff who ended it
  closedAt?: string; // ISO string
}

export interface Transaction {
  id: string;
  sessionId: string | null;
  type: 'session_payment' | 'subscription_payment' | 'expense';
  amount: number;
  description: string;
  paymentMethod: 'cash' | 'card';
  timestamp: string;
  staffName: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: SubscriptionType;
  hours: number;
  price: number;
  durationDays: number;
}

// Default/Preset mock data
export const PRESET_DEVICES: Device[] = [
  { id: '1', name: 'جهاز عالي السرعة 1 (برو)', type: 'PS5 Pro', status: 'available', currentSessionId: null, hourlyRateSingle: 5000, hourlyRateMulti: 7500, section: 'standard' },
  { id: '2', name: 'جهاز صالة الشاشات 2', type: 'PS5', status: 'available', currentSessionId: null, hourlyRateSingle: 4000, hourlyRateMulti: 6000, section: 'standard' },
  { id: '3', name: 'جهاز VIP العائلي 3', type: 'PS5 Pro', status: 'available', currentSessionId: null, hourlyRateSingle: 6000, hourlyRateMulti: 9000, section: 'vip' },
  { id: '4', name: 'جهاز الواقع الافتراضي 4', type: 'PS5', status: 'available', currentSessionId: null, hourlyRateSingle: 5000, hourlyRateMulti: 7500, section: 'standard' },
  { id: '5', name: 'جهاز الكلاسيك 5', type: 'PS4 Pro', status: 'available', currentSessionId: null, hourlyRateSingle: 3000, hourlyRateMulti: 5000, section: 'standard' },
  { id: '6', name: 'جهاز المحاكاة 6 (السباقات)', type: 'PS5 Pro', status: 'available', currentSessionId: null, hourlyRateSingle: 8000, hourlyRateMulti: 12000, section: 'vip' },
];

export const PRESET_MENU_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'قهوة اسبريسو', price: 2000, purchaseCost: 500, category: 'drinks', stock: 100 },
  { id: 'm2', name: 'شاي أحمر/أخضر', price: 1000, purchaseCost: 200, category: 'drinks', stock: 150 },
  { id: 'm3', name: 'بيبسي / كوكاكولا', price: 1500, purchaseCost: 600, category: 'drinks', stock: 200 },
  { id: 'm4', name: 'ساندوتش دجاج', price: 4000, purchaseCost: 1800, category: 'meals', stock: 40 },
  { id: 'm5', name: 'بطاطس مقلية', price: 3000, purchaseCost: 1000, category: 'snacks', stock: 50 },
  { id: 'm6', name: 'كرواسون نوتيلا', price: 3500, purchaseCost: 1200, category: 'snacks', stock: 30 },
  { id: 'm7', name: 'ريد بول للطاقة', price: 4000, purchaseCost: 2000, category: 'drinks', stock: 60 },
];

export const PRESET_SUB_PLANS: SubscriptionPlan[] = [
  { id: 'p1', name: 'الاشتراك الفضي (10 ساعات)', type: 'hours', hours: 10, price: 35000, durationDays: 30 },
  { id: 'p2', name: 'الاشتراك الذهبي (30 ساعة)', type: 'hours', hours: 30, price: 90000, durationDays: 30 },
  { id: 'p3', name: 'الاشتراك الملكي (شامل ومفتوح)', type: 'unlimited', hours: 999, price: 175000, durationDays: 30 },
];

export interface ActivityLog {
  id: string;
  type: 'device' | 'customer' | 'subscription' | 'menu' | 'session' | 'transaction' | 'system' | 'staff';
  action: string;
  details: string;
  staffName: string;
  staffRole: string;
  timestamp: string;
}

