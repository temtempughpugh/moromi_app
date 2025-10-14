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
  soeTankId: string | null;
  kenteiTankId: string | null;  // ← この行を追加
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
  predictedDekojiRate?: number;  // 予想出麹歩合(%)
  lastSheetWeight?: number;      // 最後の1枚の重量(kg)
  actualDekojiRate?: number;     // 真の出麹歩合(%)
  storageType?: string | null;   // 保管方法（null=通常、'冷蔵'、'冷凍'）
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

// 出麹ロット
export interface DekojiLot {
  jungoId: string;              // 順号
  usage: string;                // 用途（酒母、添、仲、留）
  riceWeight: number;           // 白米重量(kg)
  predictedWeight: number;      // 予想出麹重量(kg)
  sheetCount: number;           // 枚数
  weightPerSheet: number;       // 1枚あたり予想出麹重量(kg)
  processes: MoromiProcess[];   // 該当する工程データ
  columns: string[];            // 配分列（例：['A', 'B']）
  storageType: string | null;   // 保管方法
}

// 棚のセル
export interface ShelfCell {
  jungoId: string | null;
  usage: string | null;
  weightPerSheet: number | null;
  storageType: string | null;
}

// 棚配分結果
export interface ShelfDistribution {
  matrix: ShelfCell[][];        // 4列×N行のマトリックス
  columnCounts: number[];       // [A列枚数, B列枚数, C列枚数, D列枚数]
  error?: string;               // エラーメッセージ
}

// 出麹作業データ
export interface DekojiWorkData {
  date: string;                 // 出麹日
  dekojiRate: number;           // 出麹歩合(%)
  lots: DekojiLot[];            // ロット一覧
  distribution: ShelfDistribution; // 棚配分
  totalRiceWeight: number;      // 総白米重量(kg)
  totalSheetCount: number;      // 総枚数
  lastSheetWeight?: number;     // 最後の1枚の重量(kg)
  actualDekojiRate?: number;    // 真の出麹歩合(%)
}