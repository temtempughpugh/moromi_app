import { useState } from 'react';
import type { Staff, Shift, MonthlySettings, MemoRow, RiceDelivery } from '../utils/types';

interface ShiftCalendarProps {
  currentShiftMonth: string;
  setCurrentShiftMonth: (month: string) => void;
  staffList: Staff[];
  shifts: Shift[];
  monthlySettings: MonthlySettings[];
  memoRow: MemoRow | null;
  riceDelivery: RiceDelivery | null;
  saveShifts: (shifts: Omit<Shift, 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  saveMonthlySettings: (settings: Omit<MonthlySettings, 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  saveMemoRow: (memoRow: Omit<MemoRow, 'createdAt' | 'updatedAt'>) => Promise<void>;
  saveRiceDelivery: (riceDelivery: Omit<RiceDelivery, 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export default function ShiftCalendar({
  currentShiftMonth,
  setCurrentShiftMonth,
  staffList,
  shifts,
  monthlySettings,
  memoRow,
  riceDelivery,
  saveShifts,
  saveMonthlySettings,
  saveMemoRow,
  saveRiceDelivery,
}: ShiftCalendarProps) {
  const [localShifts, setLocalShifts] = useState<Record<string, Shift>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 日付配列生成（当月1-31 + 翌月1-5）
  const generateDates = () => {
    const dates: string[] = [];
    const [year, month] = currentShiftMonth.split('-').map(Number);
    
    // 当月の日数を取得
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 当月1日〜末日
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    
    // 翌月1日〜5日
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    for (let day = 1; day <= 5; day++) {
      dates.push(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    
    return dates;
  };

  const dates = generateDates();

  // 月移動
  const handlePrevMonth = () => {
    const [year, month] = currentShiftMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setCurrentShiftMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentShiftMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setCurrentShiftMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
  };

  // シフト取得
  const getShift = (staffId: string, date: string): Shift | null => {
    return shifts.find(s => s.staffId === staffId && s.date === date) || null;
  };

  // シフト変更
  const handleShiftChange = (staffId: string, date: string, value: string) => {
    const key = `${staffId}-${date}`;
    
    if (value === '') {
      // 空欄の場合は削除
      const newLocalShifts = { ...localShifts };
      delete newLocalShifts[key];
      setLocalShifts(newLocalShifts);
      return;
    }

    const [shiftType, workHoursStr] = value.split('-');
    const workHours = workHoursStr === 'rest' ? null : parseFloat(workHoursStr);

    const shift: Shift = {
      id: `${staffId}-${date}`,
      date,
      staffId,
      shiftType: shiftType as 'normal' | 'early',
      workHours: workHours as 8.5 | 7 | 8 | 9 | 7.5 | 5.5 | null,
      memo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setLocalShifts({ ...localShifts, [key]: shift });
  };

  // 保存
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const shiftsToSave = Object.values(localShifts);
      await saveShifts(shiftsToSave);
      setLocalShifts({});
      alert('保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            ← 前月
          </button>
          <h2 className="text-xl font-bold">{currentShiftMonth}</h2>
          <button
            onClick={handleNextMonth}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            次月 →
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || Object.keys(localShifts).length === 0}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 sticky left-0 bg-gray-100 z-10">スタッフ</th>
              {dates.map((date, i) => (
                <th key={date} className="border p-2 min-w-20">
                  {new Date(date).getDate()}
                </th>
              ))}
              <th className="border p-2">合計</th>
              <th className="border p-2">所定</th>
              <th className="border p-2">休日</th>
            </tr>
          </thead>
          <tbody>
            {staffList.filter(s => s.isActive).map(staff => {
              const monthShifts = dates.map(date => getShift(staff.id, date));
              const totalHours = monthShifts.reduce((sum, s) => sum + (s?.workHours || 0), 0);
              const restDays = monthShifts.filter(s => s?.workHours === null).length;

              return (
                <tr key={staff.id}>
                  <td className="border p-2 font-medium sticky left-0 bg-white z-10">
                    {staff.name}
                  </td>
                  {dates.map(date => {
                    const shift = getShift(staff.id, date);
                    const key = `${staff.id}-${date}`;
                    const localShift = localShifts[key];
                    const currentShift = localShift || shift;

                    return (
                      <td key={date} className="border p-1">
                        <select
                          className="w-full text-center border-0 bg-transparent text-xs"
                          value={currentShift ? `${currentShift.shiftType}-${currentShift.workHours || 'rest'}` : ''}
                          onChange={(e) => handleShiftChange(staff.id, date, e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="normal-8.5">8.5</option>
                          <option value="normal-7">7</option>
                          <option value="normal-8">8</option>
                          <option value="normal-9">9</option>
                          <option value="normal-7.5">7.5</option>
                          <option value="normal-5.5">5.5</option>
                          <option value="normal-rest">休</option>
                          <option value="early-8.5">早8.5</option>
                          <option value="early-7">早7</option>
                          <option value="early-8">早8</option>
                          <option value="early-9">早9</option>
                          <option value="early-7.5">早7.5</option>
                          <option value="early-5.5">早5.5</option>
                          <option value="early-rest">早休</option>
                        </select>
                      </td>
                    );
                  })}
                  <td className="border p-2 text-center">{totalHours}</td>
                  <td className="border p-2 text-center">208</td>
                  <td className="border p-2 text-center">{restDays}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}