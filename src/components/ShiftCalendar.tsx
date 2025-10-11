import { useState } from 'react';
import type { MoromiData, MoromiProcess, Staff, Shift, MonthlySettings, MemoRow, RiceDelivery } from '../utils/types';

interface ShiftCalendarProps {
  currentShiftMonth: string;
  setCurrentShiftMonth: (month: string) => void;
  staffList: Staff[];
  shifts: Shift[];
  monthlySettings: MonthlySettings[];
  memoRow: MemoRow | null;
  riceDelivery: RiceDelivery | null;
  moromiData: MoromiData[];
  moromiProcesses: MoromiProcess[];
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
  moromiData,
  moromiProcesses,
  saveShifts,
  saveMonthlySettings,
  saveMemoRow,
  saveRiceDelivery,
}: ShiftCalendarProps) {
  const [localShifts, setLocalShifts] = useState<Record<string, Shift>>({});
  const [localMemos, setLocalMemos] = useState<string[]>([]);
  const [localRiceDeliveries, setLocalRiceDeliveries] = useState<('◯' | '⚫️' | '')[]>([]);
  const [localMinimumStaff, setLocalMinimumStaff] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const generateDates = () => {
    const dates: string[] = [];
    const [year, month] = currentShiftMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    for (let day = 1; day <= 5; day++) {
      dates.push(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    
    return dates;
  };

  const dates = generateDates();

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

  const getShift = (staffId: string, date: string): Shift | null => {
    const key = `${staffId}-${date}`;
    return localShifts[key] || shifts.find(s => s.staffId === staffId && s.date === date) || null;
  };

  const handleShiftChange = (staffId: string, date: string, value: string) => {
    const key = `${staffId}-${date}`;
    
    if (value === '') {
      const newLocalShifts = { ...localShifts };
      delete newLocalShifts[key];
      setLocalShifts(newLocalShifts);
      return;
    }

    const [shiftType, workHoursStr] = value.split('-');
    const workHours = workHoursStr === 'rest' ? null : parseFloat(workHoursStr);

    const shift: Shift = {
      id: key,
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveShifts(Object.values(localShifts));
      if (localMemos.length > 0) {
        await saveMemoRow({ yearMonth: currentShiftMonth, memos: localMemos });
      }
      if (localRiceDeliveries.length > 0) {
        await saveRiceDelivery({ yearMonth: currentShiftMonth, deliveries: localRiceDeliveries });
      }
      setLocalShifts({});
      setLocalMemos([]);
      setLocalRiceDeliveries([]);
      alert('保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const getMoromiWork = (date: string): string => {
    const moromi = moromiData.find(m => 
      m.uchikomiDate === date || m.josoDate === date
    );
    
    if (!moromi) return '';
    if (moromi.uchikomiDate === date) return '打';
    if (moromi.josoDate === date) return '上';
    return '';
  };

  const getKojiAmount = (date: string): number => {
    const processes = moromiProcesses.filter(p => 
      p.hikomiDate === date && p.processType.includes('Koji')
    );
    return processes.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  const getSteaming = (date: string): string => {
    const hasKoji = moromiProcesses.some(p => 
      p.hikomiDate === date && p.processType.includes('Koji')
    );
    if (hasKoji) return '麹';
    
    const hasKake = moromiProcesses.some(p => 
      p.kakeShikomiDate === date
    );
    if (hasKake) return '◯';
    
    return '';
  };

  const getMori = (date: string): string => {
    const hasMori = moromiProcesses.some(p => p.moriDate === date);
    return hasMori ? '盛' : '';
  };

  const getDekoji = (date: string): string => {
    const hasDekoji = moromiProcesses.some(p => p.dekojiDate === date);
    return hasDekoji ? '出' : '';
  };

  const getWorkingStaffCount = (date: string): number => {
    return staffList.filter(staff => {
      const shift = getShift(staff.id, date);
      return shift && shift.workHours !== null;
    }).length;
  };

  const getSurplus = (date: string, minimum: number): number => {
    return getWorkingStaffCount(date) - minimum;
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
          disabled={isSaving}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 sticky left-0 bg-gray-100 z-10 min-w-24">項目</th>
              {dates.map((date) => (
                <th key={date} className="border p-1 min-w-16">
                  {new Date(date).getDate()}
                </th>
              ))}
              <th className="border p-2">合計</th>
              <th className="border p-2">所定</th>
              <th className="border p-2">休日</th>
            </tr>
          </thead>
          <tbody>
            {/* メモ行 */}
            <tr className="bg-pink-50">
              <td className="border p-2 font-medium sticky left-0 bg-pink-50 z-10">メモ</td>
              {dates.map((date, i) => (
                <td key={date} className="border p-1">
                  <input
                    type="text"
                    className="w-full text-center bg-transparent text-xs"
                    value={localMemos[i] || memoRow?.memos[i] || ''}
                    onChange={(e) => {
                      const newMemos = [...(memoRow?.memos || Array(dates.length).fill(''))];
                      newMemos[i] = e.target.value;
                      setLocalMemos(newMemos);
                    }}
                  />
                </td>
              ))}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* 米入荷 */}
            <tr>
              <td className="border p-2 font-medium sticky left-0 bg-white z-10">米入荷</td>
              {dates.map((date, i) => (
                <td key={date} className="border p-1">
                  <select
                    className="w-full text-center bg-transparent text-xs"
                    value={localRiceDeliveries[i] || riceDelivery?.deliveries[i] || ''}
                    onChange={(e) => {
                      const newDeliveries = [...(riceDelivery?.deliveries || Array(dates.length).fill(''))];
                      newDeliveries[i] = e.target.value as '◯' | '⚫️' | '';
                      setLocalRiceDeliveries(newDeliveries);
                    }}
                  >
                    <option value="">-</option>
                    <option value="◯">◯</option>
                    <option value="⚫️">●</option>
                  </select>
                </td>
              ))}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* 打ち込み */}
            <tr>
              <td className="border p-2 font-medium sticky left-0 bg-white z-10">打ち込み</td>
              {dates.map((date) => (
                <td key={date} className="border p-1 text-center">
                  {getMoromiWork(date) === '打' ? '打' : ''}
                </td>
              ))}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* 上槽 */}
            <tr>
              <td className="border p-2 font-medium sticky left-0 bg-white z-10">上槽</td>
              {dates.map((date) => (
                <td key={date} className="border p-1 text-center">
                  {getMoromiWork(date) === '上' ? '上' : ''}
                </td>
              ))}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* 麹量 */}
            <tr>
              <td className="border p-2 font-medium sticky left-0 bg-white z-10">麹量</td>
              {dates.map((date) => {
                const amount = getKojiAmount(date);
                return (
                  <td key={date} className="border p-1 text-center">
                    {amount > 0 ? amount : ''}
                  </td>
                );
              })}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* 蒸し */}
            <tr>
              <td className="border p-2 font-medium sticky left-0 bg-white z-10">蒸し</td>
              {dates.map((date) => (
                <td key={date} className="border p-1 text-center">
                  {getSteaming(date)}
                </td>
              ))}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* 盛り */}
            <tr>
              <td className="border p-2 font-medium sticky left-0 bg-white z-10">盛り</td>
              {dates.map((date) => (
                <td key={date} className="border p-1 text-center">
                  {getMori(date)}
                </td>
              ))}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* 出麹 */}
            <tr>
              <td className="border p-2 font-medium sticky left-0 bg-white z-10">出麹</td>
              {dates.map((date) => (
                <td key={date} className="border p-1 text-center">
                  {getDekoji(date)}
                </td>
              ))}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* Minimum */}
            <tr className="bg-yellow-50">
              <td className="border p-2 font-medium sticky left-0 bg-yellow-50 z-10">Minimum</td>
              {dates.map((date, i) => (
                <td key={date} className="border p-1">
                  <input
                    type="number"
                    className="w-full text-center bg-transparent text-xs"
                    value={localMinimumStaff[i] || 3}
                    onChange={(e) => {
                      const newMinimum = [...localMinimumStaff];
                      newMinimum[i] = parseInt(e.target.value) || 3;
                      setLocalMinimumStaff(newMinimum);
                    }}
                  />
                </td>
              ))}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* Surplus */}
            <tr className="bg-green-50">
              <td className="border p-2 font-medium sticky left-0 bg-green-50 z-10">Surplus</td>
              {dates.map((date, i) => {
                const minimum = localMinimumStaff[i] || 3;
                const surplus = getSurplus(date, minimum);
                return (
                  <td key={date} className="border p-1 text-center">
                    {surplus}
                  </td>
                );
              })}
              <td colSpan={3} className="border"></td>
            </tr>

            {/* スタッフシフト */}
            {staffList.filter(s => s.isActive).map(staff => {
              const monthShifts = dates.map(date => getShift(staff.id, date));
              const totalHours = monthShifts.reduce((sum, s) => sum + (s?.workHours || 0), 0);
              const restDays = monthShifts.filter(s => s?.workHours === null).length;
              const settings = monthlySettings.find(ms => ms.staffId === staff.id);

              return (
                <tr key={staff.id}>
                  <td className="border p-2 font-medium sticky left-0 bg-white z-10">
                    {staff.name}
                  </td>
                  {dates.map(date => {
                    const shift = getShift(staff.id, date);
                    const value = shift 
                      ? `${shift.shiftType}-${shift.workHours || 'rest'}` 
                      : '';
                    
                    const isEarly = shift?.shiftType === 'early';
                    const isRest = shift?.workHours === null || shift?.workHours === 5.5;

                    return (
                      <td 
                        key={date} 
                        className={`border p-1 ${isEarly ? 'bg-blue-100' : ''}`}
                      >
                        <select
                          className={`w-full text-center border-0 bg-transparent text-xs ${isRest ? 'text-red-600 font-bold' : ''}`}
                          value={value}
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
                  <td className="border p-2 text-center">{settings?.standardWorkHours || 208}</td>
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