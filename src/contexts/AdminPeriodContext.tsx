import { createContext, useContext, useState, ReactNode } from 'react';
import { startOfDay, subDays, startOfQuarter, startOfYear } from 'date-fns';

export type PeriodPreset = '7d' | '30d' | 'qtd' | 'ytd' | 'custom';

interface PeriodRange {
  from: Date;
  to: Date;
}

interface AdminPeriodContextType {
  preset: PeriodPreset;
  dateRange: PeriodRange;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (from: Date, to: Date) => void;
}

const AdminPeriodContext = createContext<AdminPeriodContextType | undefined>(undefined);

const getPeriodRange = (preset: PeriodPreset): PeriodRange => {
  const today = startOfDay(new Date());
  
  switch (preset) {
    case '7d':
      return { from: subDays(today, 7), to: today };
    case '30d':
      return { from: subDays(today, 30), to: today };
    case 'qtd':
      return { from: startOfQuarter(today), to: today };
    case 'ytd':
      return { from: startOfYear(today), to: today };
    default:
      return { from: subDays(today, 30), to: today };
  }
};

export const AdminPeriodProvider = ({ children }: { children: ReactNode }) => {
  const [preset, setPresetState] = useState<PeriodPreset>('30d');
  const [dateRange, setDateRange] = useState<PeriodRange>(getPeriodRange('30d'));

  const setPreset = (newPreset: PeriodPreset) => {
    setPresetState(newPreset);
    if (newPreset !== 'custom') {
      setDateRange(getPeriodRange(newPreset));
    }
  };

  const setCustomRange = (from: Date, to: Date) => {
    setPresetState('custom');
    setDateRange({ from, to });
  };

  return (
    <AdminPeriodContext.Provider value={{ preset, dateRange, setPreset, setCustomRange }}>
      {children}
    </AdminPeriodContext.Provider>
  );
};

export const useAdminPeriod = () => {
  const context = useContext(AdminPeriodContext);
  if (!context) {
    throw new Error('useAdminPeriod must be used within AdminPeriodProvider');
  }
  return context;
};
