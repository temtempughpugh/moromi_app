import { useState, useEffect } from 'react';
import { parseCSV } from '../utils/csvParser';
import { saveMoromiData as saveToSupabase, getAvailableBYs, getMoromiByBY, getProcessesByMoromi, getAllData, isDatabaseEmpty } from '../utils/database';
import type { MoromiData, MoromiProcess, TaskManagement, OverdueTask } from '../utils/types';  // ← TaskManagement, OverdueTask を追加
import type { Staff, Shift, MonthlySettings, MemoRow, RiceDelivery } from '../utils/types';
import {
  getAllStaff,
  saveStaff as saveStaffToSupabase,
  deleteStaff as deleteStaffFromSupabase,
  getShiftsByMonth,
  saveShifts as saveShiftsToSupabase,
  getMonthlySettings,
  saveMonthlySettings as saveMonthlySettingsToSupabase,
  getMemoRow,
  saveMemoRow as saveMemoRowToSupabase,
  getRiceDelivery,
  saveRiceDelivery as saveRiceDeliveryToSupabase,
  getAllTasks,  // ← 追加
  addTask as dbAddTask,  // ← 追加
  updateTask as dbUpdateTask,  // ← 追加
  deleteTask as dbDeleteTask,  // ← 追加
  getOverdueTasks,  // ← 追加
} from '../utils/database';

export function useData() {
  const [isLoading, setIsLoading] = useState(true);
  const [availableBYs, setAvailableBYs] = useState<number[]>([]);
  const [currentBY, setCurrentBY] = useState<number>(2025);
  const [moromiData, setMoromiData] = useState<MoromiData[]>([]);
 const [moromiProcesses, setMoromiProcesses] = useState<MoromiProcess[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [monthlySettings, setMonthlySettings] = useState<MonthlySettings[]>([]);
  const [memoRow, setMemoRow] = useState<MemoRow | null>(null);
  const [riceDelivery, setRiceDelivery] = useState<RiceDelivery | null>(null);
  const [currentShiftMonth, setCurrentShiftMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // タスク管理用state
  const [tasks, setTasks] = useState<TaskManagement[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  // currentBY が変わったらデータ読み込み
  useEffect(() => {
    if (availableBYs.length > 0) {
      loadMoromiByBY(currentBY);
    }
  }, [currentBY, availableBYs]);

  useEffect(() => {
    loadShiftsByMonth(currentShiftMonth);
    loadMonthlySettings(currentShiftMonth);
    loadMemoRow(currentShiftMonth);
    loadRiceDelivery(currentShiftMonth);
  }, [currentShiftMonth]);

  useEffect(() => {
    loadAllStaff();
  }, []);

   // タスク管理データの初回読み込み
  useEffect(() => {
    loadAllTasks();
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
      await loadAllTasks();
    } catch (error) {
      console.error('データ読み込みエラー:', error);
console.error('エラー詳細:', JSON.stringify(error, null, 2));
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
    
    // 全もろみの工程データを取得
    const allProcesses: MoromiProcess[] = [];
    for (const moromi of data) {
      const processes = await getProcessesByMoromi(by, moromi.jungoId);
      allProcesses.push(...processes);
    }
    console.log('取得した工程データ数:', allProcesses.length);
    setMoromiProcesses(allProcesses);
    
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

  // ========== シフト関連の関数 ==========
  const loadAllStaff = async () => {
    const data = await getAllStaff();
    setStaffList(data);
  };

  const saveStaff = async (staff: Omit<Staff, 'createdAt' | 'updatedAt'>) => {
    await saveStaffToSupabase(staff);
    await loadAllStaff();
  };

  const deleteStaff = async (staffId: string) => {
    await deleteStaffFromSupabase(staffId);
    await loadAllStaff();
  };

  const loadShiftsByMonth = async (yearMonth: string) => {
    const data = await getShiftsByMonth(yearMonth);
    setShifts(data);
  };

const saveShifts = async (shiftsData: Omit<Shift, 'createdAt' | 'updatedAt'>[]) => {
  await saveShiftsToSupabase(shiftsData, currentShiftMonth);
  await loadShiftsByMonth(currentShiftMonth);
};

  const loadMonthlySettings = async (yearMonth: string) => {
    const data = await getMonthlySettings(yearMonth);
    setMonthlySettings(data);
  };

  const saveMonthlySettings = async (settings: Omit<MonthlySettings, 'createdAt' | 'updatedAt'>[]) => {
    await saveMonthlySettingsToSupabase(settings);
    await loadMonthlySettings(currentShiftMonth);
  };

  const loadMemoRow = async (yearMonth: string) => {
    const data = await getMemoRow(yearMonth);
    setMemoRow(data);
  };

  const saveMemoRow = async (memoRowData: Omit<MemoRow, 'createdAt' | 'updatedAt'>) => {
    await saveMemoRowToSupabase(memoRowData);
    await loadMemoRow(currentShiftMonth);
  };

  const loadRiceDelivery = async (yearMonth: string) => {
    const data = await getRiceDelivery(yearMonth);
    setRiceDelivery(data);
  };

  const saveRiceDelivery = async (riceDeliveryData: Omit<RiceDelivery, 'createdAt' | 'updatedAt'>) => {
    await saveRiceDeliveryToSupabase(riceDeliveryData);
    await loadRiceDelivery(currentShiftMonth);
  };

  // ========== タスク管理関連の関数 ==========
  const loadAllTasks = async () => {
    try {
      const taskData = await getAllTasks();
      setTasks(taskData);
      
      // 期限切れタスクの計算
      const today = new Date();
      const overdue = getOverdueTasks(taskData, today);
      setOverdueTasks(overdue);
    } catch (error) {
      console.error('タスク読み込みエラー:', error);
    }
  };

  const addTask = async (task: Omit<TaskManagement, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await dbAddTask(task);
      await loadAllTasks();
    } catch (error) {
      console.error('タスク追加エラー:', error);
      throw error;
    }
  };

  const updateTask = async (id: number, task: Partial<Omit<TaskManagement, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      await dbUpdateTask(id, task);
      await loadAllTasks();
    } catch (error) {
      console.error('タスク更新エラー:', error);
      throw error;
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await dbDeleteTask(id);
      await loadAllTasks();
    } catch (error) {
      console.error('タスク削除エラー:', error);
      throw error;
    }
  };

  return {
    isLoading,
    availableBYs,
    currentBY,
    setCurrentBY,
    moromiData,
    moromiProcesses,
    getMoromiByBY,
    getProcessesByMoromi,
    getAllData,
    saveMoromiData,
    loadMoromiByBY,  // ← 追加
  staffList,
    shifts,
    monthlySettings,
    memoRow,
    riceDelivery,
    currentShiftMonth,
    setCurrentShiftMonth,
    saveStaff,
    deleteStaff,
    saveShifts,
    saveMonthlySettings,
    saveMemoRow,
    saveRiceDelivery,
    tasks,
    overdueTasks,
    addTask,
    updateTask,
    deleteTask,
    refreshTasks: loadAllTasks,
  };
}