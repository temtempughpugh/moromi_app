import type { MoromiData, MoromiProcess } from './types';

// メモリ内データストア
let moromiDataStore: MoromiData[] = [];
let moromiProcessStore: MoromiProcess[] = [];

// データ保存
export function saveMoromiData(moromiDataList: MoromiData[], processList: MoromiProcess[]): void {
  moromiDataStore = [...moromiDataList];
  moromiProcessStore = [...processList];
}

// BY一覧取得
export function getAvailableBYs(): number[] {
  const bys = [...new Set(moromiDataStore.map(m => m.by))];
  return bys.sort((a, b) => b - a);
}

// 特定BYのもろみデータ取得
export function getMoromiByBY(by: number): MoromiData[] {
  return moromiDataStore.filter(m => m.by === by);
}

// 特定もろみの工程データ取得
export function getProcessesByMoromi(by: number, jungoId: string): MoromiProcess[] {
  return moromiProcessStore.filter(p => p.by === by && p.jungoId === jungoId);
}

// 全データ取得（デバッグ用）
export function getAllData() {
  return {
    moromiData: moromiDataStore,
    moromiProcesses: moromiProcessStore,
  };
}