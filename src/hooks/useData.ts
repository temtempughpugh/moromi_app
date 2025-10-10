import { useState, useEffect } from 'react';
import { parseCSV } from '../utils/csvParser';
import { saveMoromiData as saveToSupabase, getAvailableBYs, getMoromiByBY, getProcessesByMoromi, getAllData, isDatabaseEmpty } from '../utils/database';
import type { MoromiData, MoromiProcess } from '../utils/types';

export function useData() {
  const [isLoading, setIsLoading] = useState(true);
  const [availableBYs, setAvailableBYs] = useState<number[]>([]);
  const [currentBY, setCurrentBY] = useState<number>(2025);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);

      const isEmpty = await isDatabaseEmpty();
      if (isEmpty) {
        await importFromLocalCSV();
      }

      const bys = await getAvailableBYs();
      setAvailableBYs(bys);
      if (bys.length > 0) {
        setCurrentBY(bys[0]);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      alert('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const importFromLocalCSV = async () => {
    try {
      const response = await fetch('/data/Book1.csv');
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const file = new File([blob], 'Book1.csv', { type: 'text/csv' });

      const { moromiData, moromiProcesses } = await parseCSV(file);
      await saveToSupabase(moromiData, moromiProcesses);

      console.log(`初回CSV読み込み完了: もろみ${moromiData.length}件, 工程${moromiProcesses.length}件`);
    } catch (error) {
      console.error('CSV自動読み込みエラー:', error);
      throw error;
    }
  };

  const saveMoromiData = async (moromiDataList: MoromiData[], processList: MoromiProcess[]) => {
    await saveToSupabase(moromiDataList, processList);
    // 保存後にBY一覧を再取得して状態更新
    const bys = await getAvailableBYs();
    setAvailableBYs(bys);
  };

  const refreshBYs = async () => {
    const bys = await getAvailableBYs();
    setAvailableBYs(bys);
    if (bys.length > 0 && !bys.includes(currentBY)) {
      setCurrentBY(bys[0]);
    }
  };

  return {
    isLoading,
    availableBYs,
    currentBY,
    setCurrentBY,
    refreshBYs,
    getMoromiByBY,
    getProcessesByMoromi,
    getAllData,
    saveMoromiData,
  };
}