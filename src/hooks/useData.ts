import { useState, useEffect } from 'react';
import { parseCSV } from '../utils/csvParser';
import { saveMoromiData as saveToSupabase, getAvailableBYs, getMoromiByBY, getProcessesByMoromi, getAllData, isDatabaseEmpty } from '../utils/database';
import type { MoromiData, MoromiProcess } from '../utils/types';

export function useData() {
  const [isLoading, setIsLoading] = useState(true);
  const [availableBYs, setAvailableBYs] = useState<number[]>([]);
  const [currentBY, setCurrentBY] = useState<number>(2025);
  const [moromiData, setMoromiData] = useState<MoromiData[]>([]);
  const [moromiProcesses, setMoromiProcesses] = useState<MoromiProcess[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  // currentBY が変わったらデータ読み込み
  useEffect(() => {
    if (availableBYs.length > 0) {
      loadMoromiByBY(currentBY);
    }
  }, [currentBY, availableBYs]);

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

  const loadMoromiByBY = async (by: number) => {
  try {
    console.log('===== loadMoromiByBY 開始 =====');
    console.log('取得するBY:', by);
    const data = await getMoromiByBY(by);
    console.log('取得したデータ数:', data.length);
    setMoromiData(data);
    console.log('setMoromiData 完了');
    console.log('===== loadMoromiByBY 終了 =====');
  } catch (error) {
    console.error('もろみデータ取得エラー:', error);
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
  console.log('===== saveMoromiData 開始 =====');
  console.log('保存するデータ数:', moromiDataList.length);
  
  await saveToSupabase(moromiDataList, processList);
  console.log('Supabase保存完了');
  
  // 保存後にBY一覧を再取得
  const bys = await getAvailableBYs();
  console.log('取得したBY一覧:', bys);
  setAvailableBYs(bys);
  
  // 現在のBYのデータを再読み込み
  console.log('現在のBY:', currentBY);
  await loadMoromiByBY(currentBY);
  console.log('データ再読み込み完了');
  console.log('===== saveMoromiData 終了 =====');
};

  return {
    isLoading,
    availableBYs,
    currentBY,
    setCurrentBY,
    moromiData,
    moromiProcesses,
    getProcessesByMoromi,
    getAllData,
    saveMoromiData,
  };
}