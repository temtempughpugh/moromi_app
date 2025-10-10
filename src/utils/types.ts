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