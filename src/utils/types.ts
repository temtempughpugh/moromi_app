// もろみ基本データ
export interface MoromiData {
  by: number;
  jungoId: string;
  brewingSize: number;
  tomeDate: string;
  brewingCategory: string;
  methodCategory: string | null;
  josoDate: string;
  tankNo: string;
  memo: string | null;
  motoOroshiDate: string;
  soeShikomiDate: string;
  uchikomiDate: string;
  nakaShikomiDate: string;
  tomeShikomiDate: string;
  yodanShikomiDate: string | null;
}

// もろみ工程データ
export interface MoromiProcess {
  by: number;
  jungoId: string;
  processType: ProcessType;
  senmaiDate: string;
  riceType: string;
  polishingRatio: number;
  amount: number | null;
  hikomiDate: string | null;
  moriDate: string | null;
  dekojiDate: string | null;
  kakeShikomiDate: string | null;
  shikomiDate: string;
}

// 工程タイプ
export type ProcessType = 
  | 'motoKoji'
  | 'motoKake'
  | 'soeKoji'
  | 'soeKake'
  | 'nakaKoji'
  | 'nakaKake'
  | 'tomeKoji'
  | 'tomeKake'
  | 'yodan';

  // シフト関連の型定義

export interface Staff {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  date: string;
  staffId: string;
  shiftType: 'normal' | 'early';
  workHours: 8.5 | 7 | 8 | 9 | 7.5 | 5.5 | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySettings {
  yearMonth: string;
  staffId: string;
  standardWorkHours: number;
  minimumStaff: number[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoRow {
  yearMonth: string;
  memos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RiceDelivery {
  yearMonth: string;
  deliveries: ('◯' | '⚫️' | '')[];
  createdAt: string;
  updatedAt: string;
}