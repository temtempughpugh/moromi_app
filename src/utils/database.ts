import { supabase } from '../lib/supabase';
import type { MoromiData, MoromiProcess, Staff, Shift, MonthlySettings, MemoRow, RiceDelivery, TaskManagement, WeeklyDuty, WeeklyDutyAction, JosoHyoka,WorkTimeRecord,
  WorkType } from './types';

// データ保存
export async function saveMoromiData(moromiDataList: MoromiData[], processList: MoromiProcess[]): Promise<void> {
  // moromi_data を保存（既存と同じ）
  const { error: moromiError } = await supabase
    .from('moromi_data')
    .upsert(moromiDataList.map(m => ({
      by: m.by,
      jungo_id: m.jungoId,
      brewing_size: m.brewingSize,
      tome_date: m.tomeDate,
      brewing_category: m.brewingCategory,
      method_category: m.methodCategory,
      joso_date: m.josoDate,
      tank_no: m.tankNo,
      soe_tank_id: m.soeTankId || null, 
      kentei_tank_id: m.kenteiTankId, // ← この行を追加
      memo: m.memo,
      moto_oroshi_date: m.motoOroshiDate,
      soe_shikomi_date: m.soeShikomiDate,
      uchikomi_date: m.uchikomiDate,
      naka_shikomi_date: m.nakaShikomiDate,
      tome_shikomi_date: m.tomeShikomiDate,
      yodan_shikomi_date: m.yodanShikomiDate,
      updated_at: new Date().toISOString()
    })), { onConflict: 'by,jungo_id' });

  if (moromiError) throw moromiError;

  // moromi_process を保存（新規フィールド追加）
  const { error: processError } = await supabase
    .from('moromi_process')
    .upsert(processList.map(p => ({
      by: p.by,
      jungo_id: p.jungoId,
      process_type: p.processType,
      senmai_date: p.senmaiDate,
      rice_type: p.riceType,
      polishing_ratio: p.polishingRatio,
      amount: p.amount,
      hikomi_date: p.hikomiDate,
      mori_date: p.moriDate,
      dekoji_date: p.dekojiDate,
      kake_shikomi_date: p.kakeShikomiDate,
      shikomi_date: p.shikomiDate,
      // 新規フィールド
      predicted_dekoji_rate: p.predictedDekojiRate,
      last_sheet_weight: p.lastSheetWeight,
      actual_dekoji_rate: p.actualDekojiRate,
      storage_type: p.storageType,
      updated_at: new Date().toISOString()
    })), { onConflict: 'by,jungo_id,process_type,rice_type' });

  if (processError) throw processError;
}

export async function updateDekojiData(processes: MoromiProcess[]): Promise<void> {
  const { error } = await supabase
    .from('moromi_process')
    .upsert(processes.map(p => ({
      by: p.by,
      jungo_id: p.jungoId,
      process_type: p.processType,
      senmai_date: p.senmaiDate,
      rice_type: p.riceType,
      polishing_ratio: p.polishingRatio,
      amount: p.amount,
      hikomi_date: p.hikomiDate,
      mori_date: p.moriDate,
      dekoji_date: p.dekojiDate,
      kake_shikomi_date: p.kakeShikomiDate,
      shikomi_date: p.shikomiDate,
      predicted_dekoji_rate: p.predictedDekojiRate,
      last_sheet_weight: p.lastSheetWeight,
      actual_dekoji_rate: p.actualDekojiRate,
      storage_type: p.storageType,
      updated_at: new Date().toISOString()
    })), { onConflict: 'by,jungo_id,process_type,rice_type' });

  if (error) throw error;
}


// BY一覧取得
export async function getAvailableBYs(): Promise<number[]> {
  const { data, error } = await supabase
    .from('moromi_data')
    .select('by');

  if (error) throw error;

  const bys = [...new Set(data.map(d => d.by))].sort((a, b) => b - a);
  return bys;
}

// 特定BYのもろみデータ取得
// 特定BYのもろみデータ取得
export async function getMoromiByBY(by: number): Promise<MoromiData[]> {
  const { data, error } = await supabase
    .from('moromi_data')
    .select('*')
    .eq('by', by);

  if (error) throw error;

  // 順号を数値に変換してソート
  return (data || [])
    .map(d => ({
      by: d.by,
      jungoId: d.jungo_id,
      brewingSize: d.brewing_size,
      tomeDate: d.tome_date,
      brewingCategory: d.brewing_category,
      methodCategory: d.method_category,
      josoDate: d.joso_date,
      tankNo: d.tank_no,
      soeTankId: d.soe_tank_id || null, 
      kenteiTankId: d.kentei_tank_id || null,  // ← この行を追加
      memo: d.memo,
      motoOroshiDate: d.moto_oroshi_date,
      soeShikomiDate: d.soe_shikomi_date,
      uchikomiDate: d.uchikomi_date,
      nakaShikomiDate: d.naka_shikomi_date,
      tomeShikomiDate: d.tome_shikomi_date,
      yodanShikomiDate: d.yodan_shikomi_date,
    }))
    .sort((a, b) => parseInt(a.jungoId) - parseInt(b.jungoId));
}

// 特定もろみの工程データ取得
export async function getProcessesByMoromi(by: number, jungoId: string): Promise<MoromiProcess[]> {
  const { data, error } = await supabase
    .from('moromi_process')
    .select('*')
    .eq('by', by)
    .eq('jungo_id', jungoId);

  if (error) throw error;

  return (data || []).map(p => ({
    by: p.by,
    jungoId: p.jungo_id,
    processType: p.process_type,
    senmaiDate: p.senmai_date,
    riceType: p.rice_type,
    polishingRatio: p.polishing_ratio,
    amount: p.amount,
    hikomiDate: p.hikomi_date,
    moriDate: p.mori_date,
    dekojiDate: p.dekoji_date,
    kakeShikomiDate: p.kake_shikomi_date,
    shikomiDate: p.shikomi_date,
     predictedDekojiRate: p.predicted_dekoji_rate,
    lastSheetWeight: p.last_sheet_weight,
    actualDekojiRate: p.actual_dekoji_rate,
    storageType: p.storage_type,
  }));
}

// 全データ取得
export async function getAllData(): Promise<{ moromiData: MoromiData[], moromiProcesses: MoromiProcess[] }> {
  const { data: moromiData, error: moromiError } = await supabase
    .from('moromi_data')
    .select('*');

  if (moromiError) throw moromiError;

  const { data: processData, error: processError } = await supabase
    .from('moromi_process')
    .select('*');

  if (processError) throw processError;

  return {
    moromiData: (moromiData || []).map(d => ({
      by: d.by,
      jungoId: d.jungo_id,
      brewingSize: d.brewing_size,
      tomeDate: d.tome_date,
      brewingCategory: d.brewing_category,
      methodCategory: d.method_category,
      josoDate: d.joso_date,
      tankNo: d.tank_no,
      soeTankId: d.soe_tank_id || null, 
      kenteiTankId: d.kentei_tank_id || null, // ← この行を追加
      memo: d.memo,
      motoOroshiDate: d.moto_oroshi_date,
      soeShikomiDate: d.soe_shikomi_date,
      uchikomiDate: d.uchikomi_date,
      nakaShikomiDate: d.naka_shikomi_date,
      tomeShikomiDate: d.tome_shikomi_date,
      yodanShikomiDate: d.yodan_shikomi_date,
    })),
    moromiProcesses: (processData || []).map(p => ({
  by: p.by,
  jungoId: p.jungo_id,
  processType: p.process_type,
  senmaiDate: p.senmai_date,
  riceType: p.rice_type,
  polishingRatio: p.polishing_ratio,
  amount: p.amount,
  hikomiDate: p.hikomi_date,
  moriDate: p.mori_date,
  dekojiDate: p.dekoji_date,
  kakeShikomiDate: p.kake_shikomi_date,
  shikomiDate: p.shikomi_date,
  // 出麹データのフィールドを追加
  predictedDekojiRate: p.predicted_dekoji_rate,
  lastSheetWeight: p.last_sheet_weight,
  actualDekojiRate: p.actual_dekoji_rate,
  storageType: p.storage_type,
})),
  };
}

// データベースが空かチェック
export async function isDatabaseEmpty(): Promise<boolean> {
  const { count, error } = await supabase
    .from('moromi_data')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;

  return count === 0;
}

// スタッフ関連
// ============================================

export const getAllStaff = async (): Promise<Staff[]> => {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    name: row.name,
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const saveStaff = async (staff: Omit<Staff, 'createdAt' | 'updatedAt'>): Promise<void> => {
  const { error } = await supabase
    .from('staff')
    .upsert({
      id: staff.id,
      name: staff.name,
      display_order: staff.displayOrder,
      is_active: staff.isActive,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
};

export const deleteStaff = async (staffId: string): Promise<void> => {
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', staffId);

  if (error) throw error;
};

// ============================================
// シフト関連
// ============================================

export const getShiftsByMonth = async (yearMonth: string): Promise<Shift[]> => {
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;

  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    date: row.date,
    staffId: row.staff_id,
    shiftType: row.shift_type,
    workHours: row.work_hours,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const saveShifts = async (shifts: Omit<Shift, 'createdAt' | 'updatedAt'>[], yearMonth: string): Promise<void> => {
  // 先に該当月のデータを全削除
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;
  
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .gte('date', startDate)
    .lte('date', endDate);

  if (deleteError) throw deleteError;

  // 新しいデータを挿入
  if (shifts.length > 0) {
    const records = shifts.map(shift => ({
      id: shift.id,
      date: shift.date,
      staff_id: shift.staffId,
      shift_type: shift.shiftType,
      work_hours: shift.workHours,
      memo: shift.memo,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('shifts')
      .insert(records);

    if (error) throw error;
  }
};

export const deleteShift = async (shiftId: string): Promise<void> => {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId);

  if (error) throw error;
};

// ============================================
// 月別設定関連
// ============================================

export const getMonthlySettings = async (yearMonth: string): Promise<MonthlySettings[]> => {
  const { data, error } = await supabase
    .from('monthly_settings')
    .select('*')
    .eq('year_month', yearMonth);

  if (error) throw error;

  return data.map(row => ({
    yearMonth: row.year_month,
    staffId: row.staff_id,
    standardWorkHours: row.standard_work_hours,
    minimumStaff: row.minimum_staff,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const saveMonthlySettings = async (settings: Omit<MonthlySettings, 'createdAt' | 'updatedAt'>[]): Promise<void> => {
  const records = settings.map(s => ({
    year_month: s.yearMonth,
    staff_id: s.staffId,
    standard_work_hours: s.standardWorkHours,
    minimum_staff: s.minimumStaff,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('monthly_settings')
    .upsert(records);

  if (error) throw error;
};

// ============================================
// メモ行関連
// ============================================

export const getMemoRow = async (yearMonth: string): Promise<MemoRow | null> => {
  const { data, error } = await supabase
    .from('memo_rows')
    .select('*')
    .eq('year_month', yearMonth)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    yearMonth: data.year_month,
    memos: data.memos,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const saveMemoRow = async (memoRow: Omit<MemoRow, 'createdAt' | 'updatedAt'>): Promise<void> => {
  const { error } = await supabase
    .from('memo_rows')
    .upsert({
      year_month: memoRow.yearMonth,
      memos: memoRow.memos,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
};

// ============================================
// 米入荷関連
// ============================================

export const getRiceDelivery = async (yearMonth: string): Promise<RiceDelivery | null> => {
  const { data, error } = await supabase
    .from('rice_deliveries')
    .select('*')
    .eq('year_month', yearMonth)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    yearMonth: data.year_month,
    deliveries: data.deliveries,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

export const saveRiceDelivery = async (riceDelivery: Omit<RiceDelivery, 'createdAt' | 'updatedAt'>): Promise<void> => {
  const { error } = await supabase
    .from('rice_deliveries')
    .upsert({
      year_month: riceDelivery.yearMonth,
      deliveries: riceDelivery.deliveries,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
};

// ============================================
// 上槽評価関連
// ============================================

export const getJosoHyokaByBY = async (by: number): Promise<JosoHyoka[]> => {
  const { data, error } = await supabase
    .from('joso_hyoka')
    .select('*')
    .eq('by', by);

  if (error) throw error;

  return (data || []).map(row => ({
  by: row.by,
  jungoId: row.jungo_id,
  rating: row.rating,
  ratingComment: row.rating_comment || '',
  staffComments: row.staff_comments || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));
};

export const saveJosoHyoka = async (hyoka: Omit<JosoHyoka, 'createdAt' | 'updatedAt'>): Promise<void> => {
  const { error } = await supabase
    .from('joso_hyoka')
    .upsert({
      by: hyoka.by,
      jungo_id: hyoka.jungoId,
      rating: hyoka.rating,
      rating_comment: hyoka.ratingComment || '',
      staff_comments: hyoka.staffComments,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
};
/**
 * すべてのタスクを取得
 */
export const getAllTasks = async (): Promise<TaskManagement[]> => {
  const { data, error } = await supabase
    .from('task_management')
    .select('*')
    .order('task_name', { ascending: true });
  
  if (error) {
    console.error('タスク取得エラー:', error);
    throw error;
  }
  
  return (data || []).map(row => ({
    id: row.id,
    taskName: row.task_name,
    lastCompletedDate: row.last_completed_date,
    cycleDays: row.cycle_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

/**
 * タスクを追加
 */
export const addTask = async (task: Omit<TaskManagement, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskManagement> => {
  const { data, error } = await supabase
    .from('task_management')
    .insert({
      task_name: task.taskName,
      last_completed_date: task.lastCompletedDate,
      cycle_days: task.cycleDays
    })
    .select()
    .single();
  
  if (error) {
    console.error('タスク追加エラー:', error);
    throw error;
  }
  
  return {
    id: data.id,
    taskName: data.task_name,
    lastCompletedDate: data.last_completed_date,
    cycleDays: data.cycle_days,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

/**
 * タスクを更新
 */
export const updateTask = async (id: number, task: Partial<Omit<TaskManagement, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const updateData: any = {};
  if (task.taskName) updateData.task_name = task.taskName;
  if (task.lastCompletedDate) updateData.last_completed_date = task.lastCompletedDate;
  if (task.cycleDays !== undefined) updateData.cycle_days = task.cycleDays;
  updateData.updated_at = new Date().toISOString();
  
  const { error } = await supabase
    .from('task_management')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    console.error('タスク更新エラー:', error);
    throw error;
  }
};

/**
 * タスクを削除
 */
export const deleteTask = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('task_management')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('タスク削除エラー:', error);
    throw error;
  }
};

/**
 * 期限切れのタスクを取得
 */
export const getOverdueTasks = (tasks: TaskManagement[], currentDate: Date): import('./types').OverdueTask[] => {
  const overdueTasks: import('./types').OverdueTask[] = [];
  
  tasks.forEach(task => {
    const lastDate = new Date(task.lastCompletedDate);
    const diffTime = currentDate.getTime() - lastDate.getTime();
    const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (elapsedDays > task.cycleDays) {
      overdueTasks.push({
        id: task.id!,
        taskName: task.taskName,
        lastCompletedDate: task.lastCompletedDate,
        cycleDays: task.cycleDays,
        elapsedDays
      });
    }
  });
  
  return overdueTasks.sort((a, b) => b.elapsedDays - a.elapsedDays);
};

// ============================================
// 週番関連
// ============================================

export const getWeeklyDuties = async (): Promise<WeeklyDuty[]> => {
  const { data, error } = await supabase
    .from('weekly_duty')
    .select('*')
    .eq('is_active', true)
    .order('order_number', { ascending: true });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    staffId: row.staff_id,
    orderNumber: row.order_number,
    baseDate: row.base_date,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const saveWeeklyDuties = async (duties: Omit<WeeklyDuty, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> => {
  // 既存のデータを全て無効化
  const { error: deactivateError } = await supabase
    .from('weekly_duty')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('is_active', true);

  if (deactivateError) throw deactivateError;

  // 新しいデータを挿入
  const { error: insertError } = await supabase
    .from('weekly_duty')
    .insert(
      duties.map(duty => ({
        staff_id: duty.staffId,
        order_number: duty.orderNumber,
        base_date: duty.baseDate,
        is_active: true,
        updated_at: new Date().toISOString(),
      }))
    );

  if (insertError) throw insertError;
};

// 指定された日付の当番を取得する関数
export const getCurrentDutyStaff = (
  duties: WeeklyDuty[],
  targetDate: Date,
  staffList: Staff[]
): Staff | null => {
  if (duties.length === 0 || staffList.length === 0) return null;

  // 基準日を取得(最初の当番の基準日)
  const baseDate = new Date(duties[0].baseDate);
  baseDate.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  // 基準日からの経過週数を計算
  const diffTime = target.getTime() - baseDate.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));

  // 当番のインデックスを計算（循環）
  // 負の値にも対応するため、((n % m) + m) % m のパターンを使用
  const dutyIndex = ((diffWeeks % duties.length) + duties.length) % duties.length;
  const currentDuty = duties[dutyIndex];

  // currentDuty が存在しない場合の安全チェック
  if (!currentDuty) return null;

  // スタッフを検索
  return staffList.find(s => s.id === currentDuty.staffId) || null;
};

// 週番アクション記録を取得
export const getWeeklyDutyActions = async (): Promise<WeeklyDutyAction[]> => {
  const { data, error } = await supabase
    .from('weekly_duty_actions')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    staffId: row.staff_id,
    date: row.date,
    action: row.action,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

// 特定スタッフのアクション記録を取得
export const getWeeklyDutyActionsByStaff = async (staffId: string): Promise<WeeklyDutyAction[]> => {
  const { data, error } = await supabase
    .from('weekly_duty_actions')
    .select('*')
    .eq('staff_id', staffId)
    .order('date', { ascending: false });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    staffId: row.staff_id,
    date: row.date,
    action: row.action,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

// 週番アクション記録を保存
export const saveWeeklyDutyAction = async (
  action: Omit<WeeklyDutyAction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  // 同じ日付・スタッフのアクションが既に存在するかチェック
  const { data: existing, error: checkError } = await supabase
    .from('weekly_duty_actions')
    .select('id')
    .eq('staff_id', action.staffId)
    .eq('date', action.date)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  if (existing) {
    // 更新
    const { error } = await supabase
      .from('weekly_duty_actions')
      .update({
        action: action.action,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // 新規追加
    const { error } = await supabase
      .from('weekly_duty_actions')
      .insert({
        staff_id: action.staffId,
        date: action.date,
        action: action.action,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  }
};

// 週番アクション記録を削除
export const deleteWeeklyDutyAction = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('weekly_duty_actions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============================================
// 作業タイム記録関連
// ============================================

export const getWorkTimeRecords = async (date: string, workType?: WorkType): Promise<WorkTimeRecord[]> => {
  let query = supabase
    .from('work_time_records')
    .select('id, date, work_type, staff_names, start_time, stop_time, total_seconds, dekoji, shikomi, tasks, created_at, updated_at')
    .eq('date', date)
    .order('created_at', { ascending: false });

  if (workType) {
    query = query.eq('work_type', workType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getWorkTimeRecords エラー:', error);
    throw error;
  }

  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    workType: row.work_type || 'morning',
    staffNames: row.staff_names || '',
    startTime: row.start_time || '',
    stopTime: row.stop_time || '',
    totalSeconds: row.total_seconds || 0,
    dekoji: row.dekoji,
    shikomi: row.shikomi,
    tasks: row.tasks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const saveWorkTimeRecord = async (record: Omit<WorkTimeRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  
  const { error } = await supabase
    .from('work_time_records')
    .insert({
  date: record.date,
  work_type: record.workType,
  staff_names: record.staffNames,
  start_time: record.startTime,
  stop_time: record.stopTime,
  total_seconds: record.totalSeconds,
  dekoji: record.dekoji || null,
  shikomi: record.shikomi || null,
  tasks: record.tasks || null,
  joso: record.joso || null,
  updated_at: new Date().toISOString(),
});

  if (error) throw error;
};

export const deleteWorkTimeRecord = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('work_time_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
};