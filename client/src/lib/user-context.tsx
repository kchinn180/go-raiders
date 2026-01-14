import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, Subscription, NotificationPrefs, DailyChallenge, RaidHistoryEntry } from "@shared/schema";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  /**
   * SECURITY: This function should ONLY be called after the server has verified
   * a valid purchase receipt. It updates the local state to match server-verified status.
   * The server is the source of truth for premium status.
   */
  syncPremiumFromServer: (isPremium: boolean, subscription: Subscription | null) => void;
  cancelSubscription: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateNotifications: (prefs: NotificationPrefs) => void;
  checkSubscriptionStatus: () => boolean;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  updateDailyChallenge: (challenge: DailyChallenge) => void;
  canSpinToday: () => boolean;
  addRaidToHistory: (entry: RaidHistoryEntry) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = "go-raiders-user-v3";
const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        const checkedUser = checkAndUpdateSubscription(parsedUser);
        setUserState(checkedUser);
        if (JSON.stringify(checkedUser) !== JSON.stringify(parsedUser)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedUser));
        }
      }
    } catch (e) {
      console.error("Storage error", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAndUpdateSubscription = (userData: User): User => {
    if (!userData.subscription) return userData;
    
    const now = Date.now();
    const sub = userData.subscription;
    
    if (sub.status === 'active' && sub.renewalDate && now > sub.renewalDate) {
      return {
        ...userData,
        isPremium: false,
        subscription: {
          ...sub,
          status: 'expired'
        }
      };
    }
    
    if (sub.status === 'canceled' && sub.renewalDate && now > sub.renewalDate) {
      return {
        ...userData,
        isPremium: false,
        subscription: {
          ...sub,
          status: 'expired'
        }
      };
    }
    
    return userData;
  };

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    try {
      if (newUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error("Storage save error", e);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const updateNotifications = (prefs: NotificationPrefs) => {
    if (user) {
      setUser({ ...user, notifications: prefs });
    }
  };

  /**
   * SECURITY: Sync premium status from server-verified data only.
   * This should ONLY be called after receiving verification from the backend.
   * The server verifies purchase receipts before granting premium status.
   */
  const syncPremiumFromServer = (isPremium: boolean, subscription: Subscription | null) => {
    if (user) {
      setUser({ 
        ...user, 
        isPremium,
        subscription: subscription || undefined
      });
    }
  };

  const cancelSubscription = () => {
    if (user && user.subscription) {
      setUser({
        ...user,
        subscription: {
          ...user.subscription,
          status: 'canceled',
          canceledAt: Date.now()
        }
      });
    }
  };

  const checkSubscriptionStatus = (): boolean => {
    if (!user?.subscription) return false;
    
    const now = Date.now();
    const sub = user.subscription;
    
    if (sub.status === 'active' && sub.renewalDate) {
      return now < sub.renewalDate;
    }
    
    if (sub.status === 'canceled' && sub.renewalDate) {
      return now < sub.renewalDate;
    }
    
    return false;
  };

  const addCoins = (amount: number) => {
    if (user) {
      const currentCoins = user.coins || 0;
      setUser({ ...user, coins: currentCoins + amount });
    }
  };

  const spendCoins = (amount: number): boolean => {
    if (!user) return false;
    const currentCoins = user.coins || 0;
    if (currentCoins < amount) return false;
    setUser({ ...user, coins: currentCoins - amount });
    return true;
  };

  const updateDailyChallenge = (challenge: DailyChallenge) => {
    if (user) {
      setUser({ ...user, dailyChallenge: challenge });
    }
  };

  const canSpinToday = (): boolean => {
    if (!user) return false;
    const lastSpin = user.dailyChallenge?.lastSpinDate;
    if (!lastSpin) return true;
    const today = new Date().toDateString();
    const lastSpinDate = new Date(lastSpin).toDateString();
    return today !== lastSpinDate;
  };

  const addRaidToHistory = (entry: RaidHistoryEntry) => {
    if (!user) return;
    const currentHistory = user.raidHistory || [];
    const updatedHistory = [entry, ...currentHistory].slice(0, 20);
    setUser({ ...user, raidHistory: updatedHistory });
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      isLoading, 
      syncPremiumFromServer,
      cancelSubscription,
      updateUser,
      updateNotifications,
      checkSubscriptionStatus,
      addCoins,
      spendCoins,
      updateDailyChallenge,
      canSpinToday,
      addRaidToHistory
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
