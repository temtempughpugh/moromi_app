import { useState, useEffect } from 'react';
import { saveMoromiData as saveToSupabase, getAvailableBYs, getMoromiByBY, getProcessesByMoromi, getAllData, isDatabaseEmpty } from '../utils/database';
import type { MoromiData, MoromiProcess, TaskManagement, OverdueTask, WeeklyDuty, WeeklyDutyAction, JosoHyoka } from '../utils/types';
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
  getAllTasks,
  addTask as dbAddTask,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  getOverdueTasks,
  getWeeklyDuties,
  saveWeeklyDuties as saveWeeklyDutiesToSupabase,
  getCurrentDutyStaff,
  getJosoHyokaByBY,
  saveJosoHyoka as saveJosoHyokaToSupabase,
  getWeeklyDutyActions,
  getWeeklyDutyActionsByStaff,
  saveWeeklyDutyAction as saveWeeklyDutyActionToSupabase,
  deleteWeeklyDutyAction as deleteWeeklyDutyActionFromSupabase,
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

  const [tasks, setTasks] = useState<TaskManagement[]>([]);
const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
const [weeklyDuties, setWeeklyDuties] = useState<WeeklyDuty[]>([]);
const [weeklyDutyActions, setWeeklyDutyActions] = useState<WeeklyDutyAction[]>([]);
const [josoHyokaList, setJosoHyokaList] = useState<JosoHyoka[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

useEffect(() => {
  if (availableBYs.length > 0) {
    loadMoromiByBY(currentBY);
    loadJosoHyoka();
    loadWeeklyDutyActions();  // ← この行を追加
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


  // 初期データ読み込み部分に追加（loadAllDataの中）
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const isEmpty = await isDatabaseEmpty();
      if (isEmpty) {
      }
      
      const bys = await getAvailableBYs();
      setAvailableBYs(bys);
      
      if (bys.length > 0) {
        setCurrentBY(bys[0]);
        await loadMoromiByBY(bys[0]);
      }
      
      await loadAllStaff();
      await loadShiftsByMonth(currentShiftMonth);
      await loadMonthlySettings(currentShiftMonth);
      await loadMemoRow(currentShiftMonth);
      await loadRiceDelivery(currentShiftMonth);
      await loadAllTasks();
      await loadWeeklyDuties();  // ← 追加
    } catch (error) {
      console.error('データ読み込みエラー:', error);
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

    const loadWeeklyDuties = async () => {
    try {
      const data = await getWeeklyDuties();
      setWeeklyDuties(data);
    } catch (error) {
      console.error('週番読み込みエラー:', error);
    }
  };

  const saveWeeklyDuties = async (duties: Omit<WeeklyDuty, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    try {
      await saveWeeklyDutiesToSupabase(duties);
      await loadWeeklyDuties();
    } catch (error) {
      console.error('週番保存エラー:', error);
      throw error;
    }
  };

const getCurrentDuty = (targetDate: Date): Staff | null => {
  return getCurrentDutyStaff(weeklyDuties, targetDate, staffList);
};

const loadJosoHyoka = async () => {
  try {
    const data = await getJosoHyokaByBY(currentBY);
    setJosoHyokaList(data);
  } catch (error) {
    console.error('上槽評価読み込みエラー:', error);
  }
};

const saveJosoHyoka = async (hyoka: Omit<JosoHyoka, 'createdAt' | 'updatedAt'>) => {
  try {
    await saveJosoHyokaToSupabase(hyoka);
    await loadJosoHyoka();
  } catch (error) {
    console.error('上槽評価保存エラー:', error);
    throw error;
  }
};

const loadWeeklyDutyActions = async () => {
  try {
    const data = await getWeeklyDutyActions();
    setWeeklyDutyActions(data);
  } catch (error) {
    console.error('週番アクション記録読み込みエラー:', error);
  }
};

const loadWeeklyDutyActionsByStaff = async (staffId: string): Promise<WeeklyDutyAction[]> => {
  try {
    return await getWeeklyDutyActionsByStaff(staffId);
  } catch (error) {
    console.error('週番アクション記録読み込みエラー:', error);
    return [];
  }
};

const saveWeeklyDutyAction = async (action: Omit<WeeklyDutyAction, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    await saveWeeklyDutyActionToSupabase(action);
    await loadWeeklyDutyActions();
  } catch (error) {
    console.error('週番アクション記録保存エラー:', error);
    throw error;
  }
};

const deleteWeeklyDutyAction = async (id: number) => {
  try {
    await deleteWeeklyDutyActionFromSupabase(id);
    await loadWeeklyDutyActions();
  } catch (error) {
    console.error('週番アクション記録削除エラー:', error);
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
  loadMoromiByBY,
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
  weeklyDuties,
  saveWeeklyDuties,
  getCurrentDuty,
  josoHyokaList,
  saveJosoHyoka,
  weeklyDutyActions,
  loadWeeklyDutyActionsByStaff,
  saveWeeklyDutyAction,
  deleteWeeklyDutyAction,
};
}