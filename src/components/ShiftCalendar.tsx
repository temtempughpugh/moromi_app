import { useState, useEffect, useRef } from 'react';
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
  saveStaff: (staff: Omit<Staff, 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;
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
  saveStaff,
  deleteStaff,
}: ShiftCalendarProps) {
const [localShifts, setLocalShifts] = useState<Record<string, Shift>>({});
const [localMemos, setLocalMemos] = useState<string[]>([]);
const [localRiceDeliveries, setLocalRiceDeliveries] = useState<('◯' | '⚫️' | '')[]>([]);
const [localMinimumStaff, setLocalMinimumStaff] = useState<number[]>([]);
const [localStandardHours, setLocalStandardHours] = useState<Record<string, number>>({});
const [isSaving, setIsSaving] = useState(false);
const [dragStart, setDragStart] = useState<{ staffId: string; date: string } | null>(null);
const [dragValue, setDragValue] = useState<string | null>(null);
const [openDropdown, setOpenDropdown] = useState<string | null>(null);
const [dragBuffer, setDragBuffer] = useState<Record<string, Shift>>({});
const dragBufferRef = useRef<Record<string, Shift>>({});

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

  const colors = [
    'bg-red-200',
    'bg-blue-200', 
    'bg-green-200',
    'bg-yellow-200',
    'bg-purple-200',
    'bg-pink-200',
    'bg-orange-200',
    'bg-teal-200'
  ];

  const getRelevantMoromi = () => {
  const [year, month] = currentShiftMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 5);

  return moromiData.filter(m => {
    const processes = moromiProcesses.filter(p => p.jungoId === m.jungoId);
    const motoKake = processes.find(p => p.processType === 'motoKake');
    const soeKake = processes.find(p => p.processType === 'soeKake');
    
    // モト掛がある場合はモト掛の日付、ない場合は初掛の日付を開始日とする
    let startDate: Date;
    if (motoKake && motoKake.kakeShikomiDate) {
      startDate = new Date(motoKake.kakeShikomiDate);
    } else if (soeKake && soeKake.kakeShikomiDate) {
      startDate = new Date(soeKake.kakeShikomiDate);
    } else {
      return false;
    }
    
    const josoDate = new Date(m.josoDate);
    return (startDate <= monthEnd && josoDate >= monthStart);
  }).sort((a, b) => parseInt(a.jungoId) - parseInt(b.jungoId));
};

  const relevantMoromi = getRelevantMoromi();

  const getMoromiColor = (moromi: MoromiData, index: number): string => {
    if (index === 0) return colors[0];
    
    const prevMoromi = relevantMoromi[index - 1];
    if (moromi.brewingCategory === prevMoromi.brewingCategory) {
      return getMoromiColor(prevMoromi, index - 1);
    }
    
    const usedColorIndices = new Set<number>();
    for (let i = 0; i < index; i++) {
      const colorIndex = colors.indexOf(getMoromiColor(relevantMoromi[i], i));
      usedColorIndices.add(colorIndex);
    }
    
    for (let i = 0; i < colors.length; i++) {
      if (!usedColorIndices.has(i)) {
        return colors[i];
      }
    }
    
    return colors[index % colors.length];
  };

  const getMoromiForDate = (date: string) => {
  return relevantMoromi.filter(m => {
    const processes = moromiProcesses.filter(p => p.jungoId === m.jungoId);
    const motoKake = processes.find(p => p.processType === 'motoKake');
    const soeKake = processes.find(p => p.processType === 'soeKake');
    
    // モト掛がある場合はモト掛の日付、ない場合は初掛の日付を開始日とする
    let startDate: Date;
    if (motoKake && motoKake.kakeShikomiDate) {
      startDate = new Date(motoKake.kakeShikomiDate);
    } else if (soeKake && soeKake.kakeShikomiDate) {
      startDate = new Date(soeKake.kakeShikomiDate);
    } else {
      return false;
    }
    
    const endDate = new Date(m.josoDate);
    const currentDate = new Date(date);
    return currentDate >= startDate && currentDate <= endDate;
  });
};

  const getProcessMarkForDate = (moromi: MoromiData, date: string): string => {
    const processes = moromiProcesses.filter(p => p.jungoId === moromi.jungoId);
    
    const motoKake = processes.find(p => p.processType === 'motoKake');
    
    if (motoKake && motoKake.kakeShikomiDate === date) return 'モト';
    
    if (moromi.motoOroshiDate === date) return '卸';
    if (moromi.soeShikomiDate === date) return '添';
    if (moromi.uchikomiDate === date) return '打';
    if (moromi.nakaShikomiDate === date) return '仲';
    if (moromi.tomeShikomiDate === date) return '留';
    if (moromi.yodanShikomiDate && moromi.yodanShikomiDate === date) return '四';
    if (moromi.josoDate === date) return '上';
    return '';
  };

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
  return dragBuffer[key] || localShifts[key] || shifts.find(s => s.staffId === staffId && s.date === date) || null;
};

  const handleShiftChange = (staffId: string, date: string, value: string) => {
  const key = `${staffId}-${date}`;
  
  if (value === '') {
    setLocalShifts(prev => {
      const newShifts = { ...prev };
      delete newShifts[key];
      return newShifts;
    });
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

  setLocalShifts(prev => ({ ...prev, [key]: shift }));
};

const handleMouseDown = (staffId: string, date: string, value: string) => {
  if (value === '') return;
  setDragStart({ staffId, date });
  setDragValue(value);
  setDragBuffer({});
  dragBufferRef.current = {};
};

const handleMouseEnter = (staffId: string, date: string) => {
  if (!dragStart || !dragValue) return;
  if (staffId !== dragStart.staffId) return;
  
  const key = `${staffId}-${date}`;
  const [shiftType, workHoursStr] = dragValue.split('-');
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

  dragBufferRef.current[key] = shift;
  setDragBuffer({ ...dragBufferRef.current });
};

const handleMouseUp = () => {
  if (Object.keys(dragBufferRef.current).length > 0) {
    setLocalShifts(prev => ({ ...prev, ...dragBufferRef.current }));
  }
  setDragStart(null);
  setDragValue(null);
  setDragBuffer({});
  dragBufferRef.current = {};
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
      
      if (Object.keys(localStandardHours).length > 0 || localMinimumStaff.length > 0) {
        const settings = staffList.map(staff => ({
          yearMonth: currentShiftMonth,
          staffId: staff.id,
          standardWorkHours: localStandardHours[staff.id] || getStandardHours(staff.id),
          minimumStaff: localMinimumStaff.length > 0 ? localMinimumStaff : Array(dates.length).fill(3),
        }));
        await saveMonthlySettings(settings);
      }
      
      setLocalShifts({});
      setLocalMemos([]);
      setLocalRiceDeliveries([]);
      setLocalStandardHours({});
      setLocalMinimumStaff([]);
      alert('保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const getKojiAmount = (date: string): number => {
    const processes = moromiProcesses.filter(p => 
      p.hikomiDate && p.hikomiDate.includes(date.substring(5)) && p.processType.includes('Koji')
    );
    return processes.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  const getSteaming = (date: string): string => {
    const hasKoji = moromiProcesses.some(p => 
      p.hikomiDate && p.hikomiDate.includes(date.substring(5)) && p.processType.includes('Koji')
    );
    if (hasKoji) return '麹';
    
    const hasKake = moromiProcesses.some(p => 
      p.kakeShikomiDate && p.kakeShikomiDate.includes(date.substring(5))
    );
    if (hasKake) return '◯';
    
    return '';
  };

  const getMori = (date: string): string => {
    const hasMori = moromiProcesses.some(p => p.moriDate && p.moriDate.includes(date.substring(5)));
    return hasMori ? '盛' : '';
  };

  const getDekoji = (date: string): string => {
    const hasDekoji = moromiProcesses.some(p => p.dekojiDate && p.dekojiDate.includes(date.substring(5)));
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

  const getStandardHours = (staffId: string): number => {
    if (localStandardHours[staffId]) return localStandardHours[staffId];
    const settings = monthlySettings.find(ms => ms.staffId === staffId);
    return settings?.standardWorkHours || 208;
  };

  return (
  <div className="p-6" onMouseUp={handleMouseUp} onClick={() => setOpenDropdown(null)}>
      <div className="mb-4 flex items-center justify-between no-print">
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
        <div className="flex gap-2">
          <button
  onClick={() => {
    const printWindow = window.open('', '_blank');
    const table = document.querySelector('.overflow-x-auto table');
    const clonedTable = table?.cloneNode(true) as HTMLTableElement;
    
    // すべてのselect要素を選択されたテキストに置き換え
    clonedTable?.querySelectorAll('select').forEach(select => {
      const selectedText = select.options[select.selectedIndex]?.text || '';
      const span = document.createElement('span');
      span.textContent = selectedText;
      select.replaceWith(span);
    });
    
    // すべてのinput要素を値に置き換え
    clonedTable?.querySelectorAll('input').forEach(input => {
      const span = document.createElement('span');
      span.textContent = input.value || '';
      input.replaceWith(span);
    });
    
    printWindow?.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A3 landscape; margin: 5mm; }
          * { 
            print-color-adjust: exact !important; 
            -webkit-print-color-adjust: exact !important; 
            box-sizing: border-box;
          }
          body { 
            margin: 0; 
            padding: 5mm; 
            font-family: sans-serif; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 6pt;
            table-layout: fixed;
          }
          th, td { 
            border: 0.5px solid #666; 
            padding: 1mm; 
            text-align: center;
            line-height: 1.2;
            overflow: hidden;
          }
          th:first-child, td:first-child { 
            width: 12%; 
            font-size: 5pt;
          }
          .bg-red-200 { background-color: #fecaca !important; }
          .bg-blue-200 { background-color: #bfdbfe !important; }
          .bg-green-200 { background-color: #bbf7d0 !important; }
          .bg-yellow-200 { background-color: #fef08a !important; }
          .bg-purple-200 { background-color: #e9d5ff !important; }
          .bg-pink-200 { background-color: #fbcfe8 !important; }
          .bg-orange-200 { background-color: #fed7aa !important; }
          .bg-teal-200 { background-color: #99f6e4 !important; }
          .bg-pink-50 { background-color: #fdf2f8 !important; }
          .bg-yellow-50 { background-color: #fefce8 !important; }
          .bg-green-50 { background-color: #f0fdf4 !important; }
          .bg-blue-100 { background-color: #dbeafe !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        ${clonedTable?.outerHTML || ''}
      </body>
      </html>
    `);
    printWindow?.document.close();
  }}
  className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
>
  印刷
</button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
        </div>

      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse text-[10px] table-fixed">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1 sticky left-0 bg-gray-100 z-10 w-20">号/項目</th>
              {dates.map((date) => (
                <th key={date} className={`border p-0.5 w-8 ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
  {new Date(date).getDate()}
</th>
              ))}
<th className="border p-1 w-12"></th>
<th className="border p-1 w-12"></th>
<th className="border p-1 w-12"></th>
            </tr>
          </thead>
          <tbody>
  {/* もろみスケジュール */}
  {relevantMoromi.map((moromi, index) => {
    const moromiColor = getMoromiColor(moromi, index);
    
    return (
      <tr key={moromi.jungoId}>
        <td className={`border p-1 font-medium sticky left-0 ${moromiColor} z-10 text-[10px]`}>
          {moromi.jungoId}号 {moromi.tankNo}タンク {moromi.brewingCategory}
        </td>
        {dates.map((date) => {
          const mark = getProcessMarkForDate(moromi, date);
          const isActive = getMoromiForDate(date).some(m => m.jungoId === moromi.jungoId);
          return (
            <td 
              key={date} 
              className={`border p-1 text-center ${isActive ? moromiColor : ''} ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}
            >
              {mark}
            </td>
          );
        })}
        <td colSpan={3} className="border"></td>
      </tr>
    );
  })}

  <tr><td colSpan={dates.length + 4} className="border-t-4 border-gray-400"></td></tr>

  {/* メモ行 */}
  <tr className="bg-pink-50">
    <td className="border p-2 font-medium sticky left-0 bg-pink-50 z-10">メモ</td>
    {dates.map((date, i) => (
      <td key={date} className={`border p-1 ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
        <input
          type="text"
          className="w-full text-center bg-transparent text-[10px]"
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
      <td key={date} className={`border p-1 ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
        <select
          className="w-full text-center bg-transparent text-[10px] appearance-none"
          value={localRiceDeliveries[i] || riceDelivery?.deliveries[i] || ''}
          onChange={(e) => {
            const newDeliveries = [...(riceDelivery?.deliveries || Array(dates.length).fill(''))];
            newDeliveries[i] = e.target.value as '◯' | '⚫️' | '';
            setLocalRiceDeliveries(newDeliveries);
          }}
        >
          <option value=""></option>
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
    {dates.map((date) => {
      const moromi = moromiData.find(m => m.uchikomiDate.includes(date.substring(5)));
      return (
        <td key={date} className={`border p-1 text-center ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
          {moromi ? '打' : ''}
        </td>
      );
    })}
    <td colSpan={3} className="border"></td>
  </tr>

  {/* 上槽 */}
  <tr>
    <td className="border p-2 font-medium sticky left-0 bg-white z-10">上槽</td>
    {dates.map((date) => {
      const moromi = moromiData.find(m => m.josoDate.includes(date.substring(5)));
      return (
        <td key={date} className={`border p-1 text-center ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
          {moromi ? '上' : ''}
        </td>
      );
    })}
    <td colSpan={3} className="border"></td>
  </tr>

  {/* 麹量 */}
  <tr>
    <td className="border p-2 font-medium sticky left-0 bg-white z-10">麹量</td>
    {dates.map((date) => {
      const amount = getKojiAmount(date);
      return (
        <td key={date} className={`border p-1 text-center ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
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
      <td key={date} className={`border p-1 text-center ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
        {getSteaming(date)}
      </td>
    ))}
    <td colSpan={3} className="border"></td>
  </tr>

  {/* 盛り */}
  <tr>
    <td className="border p-2 font-medium sticky left-0 bg-white z-10">盛り</td>
    {dates.map((date) => (
      <td key={date} className={`border p-1 text-center ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
        {getMori(date)}
      </td>
    ))}
    <td colSpan={3} className="border"></td>
  </tr>

  {/* 出麹 */}
  <tr>
    <td className="border p-2 font-medium sticky left-0 bg-white z-10">出麹</td>
    {dates.map((date) => (
      <td key={date} className={`border p-1 text-center ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
        {getDekoji(date)}
      </td>
    ))}
    <td colSpan={3} className="border"></td>
  </tr>

  {/* 空白行 */}
  <tr><td colSpan={dates.length + 4} className="border-t-4 border-gray-400"></td></tr>

  {/* ヘッダー行 */}
  <tr className="bg-gray-100">
    <th className="border p-1 sticky left-0 bg-gray-100 z-10">号/項目</th>
    {dates.map((date) => (
      <th key={date} className={`border p-0.5 ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
        {new Date(date).getDate()}
      </th>
    ))}
    <th className="border p-1">合計</th>
    <th className="border p-1">所定</th>
    <th className="border p-1">休日</th>
  </tr>

  {/* Minimum */}
  <tr className="bg-yellow-50">
    <td className="border p-2 font-medium sticky left-0 bg-yellow-50 z-10">Minimum</td>
    {dates.map((date, i) => (
      <td key={date} className={`border p-1 ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
        <input
          type="number"
          className="w-full text-center bg-transparent text-[10px]"
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
        <td key={date} className={`border p-1 text-center ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}>
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
  const standardHours = getStandardHours(staff.id);

  const shiftOptions = [
    { value: '', label: '-', group: '' },
    { value: 'normal-8.5', label: '8.5', group: '通常' },
    { value: 'normal-7', label: '7', group: '通常' },
    { value: 'normal-8', label: '8', group: '通常' },
    { value: 'normal-9', label: '9', group: '通常' },
    { value: 'normal-7.5', label: '7.5', group: '通常' },
    { value: 'normal-5.5', label: '5.5', group: '通常' },
    { value: 'normal-rest', label: '休', group: '通常' },
    { value: 'early-8.5', label: '8.5', group: '早出' },
    { value: 'early-7', label: '7', group: '早出' },
    { value: 'early-8', label: '8', group: '早出' },
    { value: 'early-9', label: '9', group: '早出' },
    { value: 'early-7.5', label: '7.5', group: '早出' },
    { value: 'early-5.5', label: '5.5', group: '早出' },
    { value: 'early-rest', label: '休', group: '早出' },
  ];

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
        const cellKey = `${staff.id}-${date}`;
        const isOpen = openDropdown === cellKey;

        const displayText = value 
          ? shiftOptions.find(opt => opt.value === value)?.label || ''
          : '';

        return (
          <td 
            key={date} 
            className={`border p-1 relative ${isEarly ? 'bg-blue-100' : ''} ${new Date(date).getDate() === 1 ? 'border-l-2 border-l-gray-800' : ''}`}
            onMouseDown={(e) => {
              if (!isOpen) {
                handleMouseDown(staff.id, date, value);
              }
            }}
            onMouseEnter={() => handleMouseEnter(staff.id, date)}
          >
            <div
              className={`w-full text-center text-[10px] cursor-pointer select-none ${isRest ? 'text-red-600 font-bold' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(isOpen ? null : cellKey);
              }}
            >
              {isEarly && displayText && displayText !== '休' && '早'}
              {displayText}
            </div>

            {isOpen && (
              <div 
                className="absolute top-full left-0 bg-white border border-gray-300 shadow-lg z-50 min-w-[80px]"
                onClick={(e) => e.stopPropagation()}
              >
                {['', '通常', '早出'].map(group => (
                  <div key={group}>
                    {group && (
                      <div className="bg-gray-100 px-2 py-1 text-[10px] font-bold border-b">
                        {group}
                      </div>
                    )}
                    {shiftOptions
                      .filter(opt => opt.group === group)
                      .map(option => (
                        <div
                          key={option.value}
                          className="px-2 py-1 text-[10px] hover:bg-blue-100 cursor-pointer"
                          onClick={() => {
                            handleShiftChange(staff.id, date, option.value);
                            setOpenDropdown(null);
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}
          </td>
        );
      })}
      <td className="border p-2 text-center">{totalHours}</td>
      <td className="border p-2">
        <input
          type="number"
          className="w-full text-center text-[10px]"
          value={standardHours}
          onChange={(e) => {
            setLocalStandardHours({
              ...localStandardHours,
              [staff.id]: parseInt(e.target.value) || 208
            });
          }}
        />
      </td>
      <td className="border p-2 text-center">{restDays}</td>
    </tr>
  );
})}
</tbody>
        </table>
      </div>

      {/* スタッフ管理セクション */}
      {/* スタッフ管理セクション */}
      <div className="no-print">
        <StaffManagementSection staffList={staffList} saveStaff={saveStaff} deleteStaff={deleteStaff} />
      </div>
    </div>
  );
}

interface StaffManagementSectionProps {
  staffList: Staff[];
  saveStaff: (staff: Omit<Staff, 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;
}

function StaffManagementSection({ staffList, saveStaff, deleteStaff }: StaffManagementSectionProps) {
  const [newStaffName, setNewStaffName] = useState('');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) {
      alert('スタッフ名を入力してください');
      return;
    }

    const newStaff = {
      id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      displayOrder: staffList.length + 1,
      isActive: true,
    };

    await saveStaff(newStaff);
    setNewStaffName('');
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setEditName(staff.name);
  };

  const handleSaveEdit = async () => {
    if (!editingStaff || !editName.trim()) return;

    await saveStaff({
      ...editingStaff,
      name: editName.trim(),
    });

    setEditingStaff(null);
    setEditName('');
  };

  const handleToggleActive = async (staff: Staff) => {
    await saveStaff({
      ...staff,
      isActive: !staff.isActive,
    });
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm('このスタッフを削除しますか？')) return;
    await deleteStaff(staffId);
  };

  const moveStaff = async (staff: Staff, direction: 'up' | 'down') => {
    const sortedStaff = [...staffList].sort((a, b) => a.displayOrder - b.displayOrder);
    const currentIndex = sortedStaff.findIndex(s => s.id === staff.id);
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedStaff.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetStaff = sortedStaff[targetIndex];

    await saveStaff({
      ...staff,
      displayOrder: targetStaff.displayOrder,
    });

    await saveStaff({
      ...targetStaff,
      displayOrder: staff.displayOrder,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-6">スタッフ管理</h3>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newStaffName}
          onChange={(e) => setNewStaffName(e.target.value)}
          placeholder="新しいスタッフ名"
          className="flex-1 px-4 py-2 border rounded"
          onKeyPress={(e) => e.key === 'Enter' && handleAddStaff()}
        />
        <button
          onClick={handleAddStaff}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          追加
        </button>
      </div>

      <div className="space-y-2">
        {[...staffList]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((staff) => (
            <div
              key={staff.id}
              className={`flex items-center gap-4 p-4 border rounded ${
                staff.isActive ? 'bg-white' : 'bg-gray-100'
              }`}
            >
              <div className="flex gap-2">
                <button
                  onClick={() => moveStaff(staff, 'up')}
                  className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveStaff(staff, 'down')}
                  className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                >
                  ↓
                </button>
              </div>

              {editingStaff?.id === staff.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingStaff(null)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 font-medium">
                    {staff.name}
                    {!staff.isActive && (
                      <span className="ml-2 text-sm text-gray-500">(無効)</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(staff)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleToggleActive(staff)}
                    className={`px-4 py-2 rounded ${
                      staff.isActive
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'bg-green-500 hover:bg-green-600'
                    } text-white`}
                  >
                    {staff.isActive ? '無効化' : '有効化'}
                  </button>
                  <button
                    onClick={() => handleDelete(staff.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    削除
                  </button>
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

