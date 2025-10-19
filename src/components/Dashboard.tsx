import { useState } from 'react';
import type { MoromiData, MoromiProcess, OverdueTask } from '../utils/types';
import { Fragment } from 'react';
import { KojiService } from '../services/KojiService';

interface DashboardProps {
  moromiData: MoromiData[];
  moromiProcesses: MoromiProcess[];
  getProcessesByMoromi: (by: number, jungoId: string) => Promise<MoromiProcess[]>;
  saveMoromiData: (moromiDataList: MoromiData[], processList: MoromiProcess[]) => Promise<void>;
  loadMoromiByBY: (by: number) => Promise<void>;
  currentBY: number;
  dataContext: any;  // ← 追加
}

interface TodayTask {
  jungoId: string;
  tankNo?: string;
  soeTankId?: string | null;
  kenteiTankId?: string | null;  // ← この行を追加
  processType?: string;
  riceType?: string;
  amount?: number;
  brewingCategory?: string;
  brewingSize?: number;
  process?: MoromiProcess;
}

export default function Dashboard({ moromiData, moromiProcesses, saveMoromiData, loadMoromiByBY, currentBY, dataContext }: DashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedJungo, setExpandedJungo] = useState<string | null>(null);
  const [processes, setProcesses] = useState<{ [key: string]: MoromiProcess[] }>({});

  const formatDate = (date: Date): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const getTodayTasks = () => {
  const tasks: {
    mori: TodayTask[];
    hikomi: TodayTask[];
    motoOroshi: TodayTask[];
    shikomi: TodayTask[];
    dekoji: TodayTask[];
    senmai: TodayTask[];
    edauchi: TodayTask[];
    joso: TodayTask[];
    tankWash: TodayTask[];      
    tankHotWater: TodayTask[];  
    matWash: TodayTask[];       // ← 追加
    kenteiChange: { prev: string; current: string }[];
  } = {
    mori: [],
    hikomi: [],
    motoOroshi: [],
    shikomi: [],
    dekoji: [],
    senmai: [],
    edauchi: [],
    joso: [],
    tankWash: [],      
    tankHotWater: [],  
    matWash: [],       // ← 追加
    kenteiChange: []   
  };
  
    moromiData.forEach((moromi: MoromiData) => {
      const moromiProcessList = moromiProcesses.filter(p => p.jungoId === moromi.jungoId);

      if (isSameDate(moromi.motoOroshiDate, currentDate)) {
  tasks.motoOroshi.push({ 
    jungoId: moromi.jungoId,
    tankNo: moromi.tankNo,       // ← 追加
    soeTankId: moromi.soeTankId
  });
  
}

if (isSameDate(moromi.uchikomiDate, currentDate)) {
  tasks.edauchi.push({ 
    jungoId: moromi.jungoId,
    tankNo: moromi.tankNo,
    soeTankId: moromi.soeTankId  // ← 追加
  });
}

      if (isSameDate(moromi.josoDate, currentDate)) {
  tasks.joso.push({
    jungoId: moromi.jungoId,
    tankNo: moromi.tankNo,
    kenteiTankId: moromi.kenteiTankId,  // ← この行を追加
    brewingCategory: moromi.brewingCategory,
    brewingSize: moromi.brewingSize
  });
}

      moromiProcessList.forEach((process: MoromiProcess) => {
        if (process.moriDate && isSameDate(process.moriDate, currentDate)) {
          tasks.mori.push({
            jungoId: moromi.jungoId,
            processType: process.processType,
            riceType: process.riceType,
            amount: process.amount || 0
          });
        }

        if (process.hikomiDate && isSameDate(process.hikomiDate, currentDate)) {
          tasks.hikomi.push({
            jungoId: moromi.jungoId,
            processType: process.processType,
            riceType: process.riceType,
            amount: process.amount || 0
          });
        }

        if (process.dekojiDate && isSameDate(process.dekojiDate, currentDate)) {
          tasks.dekoji.push({
            jungoId: process.jungoId,
            processType: process.processType,
            riceType: process.riceType,
            amount: process.amount || 0,
            process: process
          });
        }

        if (isSameDate(process.senmaiDate, currentDate)) {
          tasks.senmai.push({
            jungoId: moromi.jungoId,
            processType: process.processType,
            riceType: process.riceType,
            amount: process.amount || 0
          });
        }

        if (process.kakeShikomiDate && isSameDate(process.kakeShikomiDate, currentDate)) {
          if (process.processType === 'motoKake' || 
              process.processType === 'soeKake' || 
              process.processType === 'nakaKake' || 
              process.processType === 'tomeKake' || 
              process.processType === 'yodan') {
            tasks.shikomi.push({
              jungoId: moromi.jungoId,
              processType: process.processType,
              riceType: process.riceType,
              amount: process.amount || 0
            });
          }
        }
      });
    });

    // 1. タンク洗い（翌日の準備）
  // === 本日のタスク計算 ===
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  moromiData.forEach((moromi: MoromiData) => {
    // 1. タンク洗い（翌日の準備）
    // 1. タンク洗い（翌日の準備）
if (isSameDate(moromi.motoOroshiDate, tomorrow)) {
  const tankId = moromi.soeTankId || moromi.tankNo;
  const tankType = moromi.soeTankId ? '添タンク' : '仕込みタンク';
  tasks.tankWash.push({
    jungoId: moromi.jungoId,
    tankNo: tankId,
    processType: tankType
  });
}

// 打ち込み日の2日前にタンク洗い
const dayAfterTomorrow = new Date(currentDate);
dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

if (isSameDate(moromi.uchikomiDate, dayAfterTomorrow)) {
  if (moromi.soeTankId) {
    tasks.tankWash.push({
      jungoId: moromi.jungoId,
      tankNo: moromi.tankNo,
      processType: '仕込みタンク'
    });
  }
}

    // 2. タンクに湯（当日がモト卸しor打ち込み）
    if (isSameDate(moromi.motoOroshiDate, currentDate)) {
      const tankId = moromi.soeTankId || moromi.tankNo;
      const tankType = moromi.soeTankId ? '添タンク' : '仕込みタンク';
      tasks.tankHotWater.push({
        jungoId: moromi.jungoId,
        tankNo: tankId,
        processType: tankType
      });
    }
    
    if (isSameDate(moromi.uchikomiDate, currentDate)) {
      if (moromi.soeTankId) {
        tasks.tankHotWater.push({
          jungoId: moromi.jungoId,
          tankNo: moromi.tankNo,
          processType: '仕込みタンク'
        });
      }
    }

    // 3. マット洗い（翌日が上槽）
    if (isSameDate(moromi.josoDate, tomorrow)) {
      tasks.matWash.push({
        jungoId: moromi.jungoId,
        tankNo: moromi.tankNo
      });
    }
  });

  // 4. 検定タンク変更
  // 4. 検定タンク変更
  const todayJoso = moromiData.filter(m => isSameDate(m.josoDate, currentDate));
  
  if (todayJoso.length > 0) {
    // 上槽日でソート（昇順）
    const sortedTodayJoso = todayJoso.sort((a, b) => parseInt(a.jungoId) - parseInt(b.jungoId));
    
    // 本日の最初の上槽
    const firstTodayJoso = sortedTodayJoso[0];
    
    if (firstTodayJoso?.kenteiTankId) {
      // 直近の過去の上槽を取得
      const previousJoso = moromiData
        .filter(m => {
          const josoDate = new Date(m.josoDate);
          josoDate.setHours(0, 0, 0, 0);
          const current = new Date(currentDate);
          current.setHours(0, 0, 0, 0);
          return josoDate < current && m.kenteiTankId;
        })
        .sort((a, b) => new Date(b.josoDate).getTime() - new Date(a.josoDate).getTime())[0];
      
      if (previousJoso?.kenteiTankId && previousJoso.kenteiTankId !== firstTodayJoso.kenteiTankId) {
        tasks.kenteiChange.push({
          prev: previousJoso.kenteiTankId,
          current: firstTodayJoso.kenteiTankId
        });
      }
    }
  }

  return tasks;
};

  const getProcessName = (type: string): string => {
    const names: { [key: string]: string } = {
      motoKoji: 'モト麹',
      motoKake: 'モト掛',
      soeKoji: '初麹',
      soeKake: '初掛',
      nakaKoji: '仲麹',
      nakaKake: '仲掛',
      tomeKoji: '留麹',
      tomeKake: '留掛',
      yodan: '四段'
    };
    return names[type] || type;
  };

  // 📁 src/components/Dashboard.tsx の178行目付近

// ✅ 正しい修正（KojiServiceの実装に合わせる）
const getDekojiDistribution = (tasks: TodayTask[]): string => {
  if (tasks.length === 0) return '';
  
  try {
    const processes = tasks.map(t => t.process).filter(p => p) as MoromiProcess[];
    
    // 掛米工程も取得
    const jungoIds = [...new Set(processes.map(p => p.jungoId))];
    const kakeProcesses = moromiProcesses.filter(p =>
      jungoIds.includes(p.jungoId) &&
      (p.processType === 'motoKake' || 
       p.processType === 'soeKake' || 
       p.processType === 'nakaKake' || 
       p.processType === 'tomeKake')
    );
    
    const lots = KojiService.calculateDistribution([...processes, ...kakeProcesses], 120);
    const shelfDist = KojiService.calculateShelfDistribution(lots);
    
    if (shelfDist.error) return '';
    
    // 保管方法も表示（用途付き）
    // 保管方法も表示（用途付き）
const storageInfo = lots
  .filter(lot => lot.storageType)
  .map(lot => {
    const usageName = lot.usage === '酒母' ? 'モト' : lot.usage;
    return `${lot.jungoId}号${usageName}${lot.storageType === '冷蔵' ? '💧' : '🧊'}`;
  })
  .join(' ');
    
    return `(${shelfDist.columnCounts.join(',')})${storageInfo ? ' ' + storageInfo : ''}`;
  } catch (error) {
    console.error('配分計算エラー:', error);
    return '';
  }
};
  const getProcessColor = (processType: string): string => {
  if (processType === 'motoKoji') return 'bg-red-300 text-red-900';
  if (processType === 'soeKoji') return 'bg-blue-300 text-blue-900';
  if (processType === 'nakaKoji') return 'bg-green-300 text-green-900';
  if (processType === 'tomeKoji') return 'bg-yellow-300 text-yellow-900';
  
  if (processType === 'motoKake') return 'bg-red-100 text-red-700';
  if (processType === 'soeKake') return 'bg-blue-100 text-blue-700';
  if (processType === 'nakaKake') return 'bg-green-100 text-green-700';
  if (processType === 'tomeKake') return 'bg-yellow-100 text-yellow-700';
  
  if (processType === 'yodan') return 'bg-purple-200 text-purple-800';
  
  return 'bg-gray-100 text-gray-700';
};

const calculateTotal = (tasks: TodayTask[]): number => {
  return tasks.reduce((sum, task) => sum + (task.amount || 0), 0);
};

  const handleRowClick = (jungoId: string) => {
  if (expandedJungo === jungoId) {
    setExpandedJungo(null);
  } else {
    const processList = moromiProcesses.filter(p => p.jungoId === jungoId);
    setProcesses(prev => ({ ...prev, [jungoId]: processList }));
    setExpandedJungo(jungoId);
  }
};

// ← ここに追加
async function handleSoeTankChange(by: number, jungoId: string, soeTankId: string) {
  const updatedMoromi = moromiData.map(m => 
    m.by === by && m.jungoId === jungoId 
      ? { ...m, soeTankId: soeTankId || null }
      : m
  );
  
  await saveMoromiData(updatedMoromi, moromiProcesses);
  await loadMoromiByBY(currentBY);
}

async function handleKenteiTankChange(by: number, jungoId: string, kenteiTankId: string) {
  const updatedMoromi = moromiData.map(m => 
    m.by === by && m.jungoId === jungoId 
      ? { ...m, kenteiTankId: kenteiTankId || null }
      : m
  );
  
  await saveMoromiData(updatedMoromi, moromiProcesses);
  await loadMoromiByBY(currentBY);
}

  const calculateMoromiDays = (tomeDate: string, josoDate: string): number => {
  const tome = new Date(tomeDate);
  const joso = new Date(josoDate);
  const diffTime = Math.abs(joso.getTime() - tome.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 開始日を含むため+1
};

  // 日付比較のヘルパー関数
  const isSameDate = (date1: string | Date, date2: string | Date): boolean => {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return d1.toDateString() === d2.toDateString();
  };

  // もろみのステータスを判定する関数
  const getMoromiStatus = (moromi: MoromiData, currentDate: Date) => {
  const motoKakeProcess = moromiProcesses.find(
    p => p.jungoId === moromi.jungoId && p.processType === 'motoKake'
  );
  
  const motoKakeDate = motoKakeProcess?.kakeShikomiDate 
    ? new Date(motoKakeProcess.kakeShikomiDate) 
    : null;
  
  const motoOroshiDate = new Date(moromi.motoOroshiDate);
  const soeShikomiDate = new Date(moromi.soeShikomiDate);
  const nakaShikomiDate = new Date(moromi.nakaShikomiDate);
  const tomeShikomiDate = new Date(moromi.tomeShikomiDate);
  const josoDate = new Date(moromi.josoDate);
  
  // 🔥 重要：すべての日付を0時0分0秒に正規化
  const normalizedCurrentDate = new Date(currentDate);
  normalizedCurrentDate.setHours(0, 0, 0, 0);
  
  if (motoKakeDate) motoKakeDate.setHours(0, 0, 0, 0);
  motoOroshiDate.setHours(0, 0, 0, 0);
  soeShikomiDate.setHours(0, 0, 0, 0);
  nakaShikomiDate.setHours(0, 0, 0, 0);
  tomeShikomiDate.setHours(0, 0, 0, 0);
  josoDate.setHours(0, 0, 0, 0);
  
  if (motoKakeDate && normalizedCurrentDate < motoKakeDate) {
    return { status: '準備', color: 'bg-gray-200 text-gray-700', sortOrder: 4 };
  }
  else if (isSameDate(motoOroshiDate, normalizedCurrentDate)) {
    return { status: 'モト卸', color: 'bg-purple-200 text-purple-800', sortOrder: 3 };
  }
  else if (motoKakeDate && normalizedCurrentDate >= motoKakeDate && normalizedCurrentDate < motoOroshiDate) {
    return { status: 'モト', color: 'bg-purple-200 text-purple-800', sortOrder: 3 };
  }
  else if (normalizedCurrentDate > motoOroshiDate && normalizedCurrentDate <= tomeShikomiDate) {
    let detail = '';
    if (isSameDate(soeShikomiDate, normalizedCurrentDate)) detail = '添';
    else if (isSameDate(moromi.uchikomiDate, normalizedCurrentDate)) detail = '踊';
    else if (isSameDate(nakaShikomiDate, normalizedCurrentDate)) detail = '仲';
    else if (isSameDate(tomeShikomiDate, normalizedCurrentDate)) detail = '留';
    
    return { status: `${detail ? `${detail}` : ''}`, color: 'bg-blue-200 text-blue-800', sortOrder: 2 };
  }
  else if (normalizedCurrentDate > tomeShikomiDate && normalizedCurrentDate <= josoDate) {
    const moromiDays = Math.ceil((normalizedCurrentDate.getTime() - tomeShikomiDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { status: `${moromiDays}日目`, color: 'bg-green-200 text-green-800', sortOrder: 1 };
  }
  else {
    return { status: '完了', color: 'bg-gray-300 text-gray-600', sortOrder: 5 };
  }
};
 interface TaskSectionProps {
  title: string;
  tasks: TodayTask[];
  renderContent: (tasks: TodayTask[]) => React.ReactElement;
  subtitle?: string;  // ← 追加
}

 const TaskSection = ({ title, tasks, renderContent, subtitle }: TaskSectionProps) => {
  if (!tasks || tasks.length === 0) return null;
  
  return (
    <div className="mb-4">
      <h4 className="text-sm font-bold mb-2 text-blue-800 border-b border-blue-200 pb-1">
        {title}
        {subtitle && (
          <span className="ml-2 text-xs font-normal text-gray-700">
            BOX: {subtitle.replace('BOX: ', '').split('・').map((part, index) => (
              <span key={index}>
                {index > 0 && <span>・</span>}
                <span className={part.includes('黄色') ? 'text-yellow-600 font-semibold' : 'text-blue-600 font-semibold'}>
                  {part}
                </span>
              </span>
            ))}
          </span>
        )}
      </h4>
      <div className="space-y-1">
        {renderContent(tasks)}
      </div>
    </div>
  );
};

  const todayTasks = getTodayTasks();
  const hasAnyTasks = Object.values(todayTasks).some(tasks => tasks.length > 0);

  return (
    <div className="p-6">
      {/* 日付ナビゲーション */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg p-4 mb-4">
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => changeDate(-1)}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
          >
            <span className="text-xl">←</span>
          </button>
          
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg transition-colors relative"
          >
            <span className="text-lg font-semibold">本日（{formatDate(currentDate)}）</span>
            
            {showCalendar && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white text-gray-800 p-4 rounded-lg shadow-xl z-10">
                <p className="text-sm">カレンダー機能（実装予定）</p>
              </div>
            )}
          </button>
           {/* 週番表示 */}
          {(() => {
            const currentDutyStaff = dataContext.getCurrentDuty(currentDate);
            return currentDutyStaff ? (
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <span className="text-sm font-semibold">週番: {currentDutyStaff.name}</span>
              </div>
            ) : null;
          })()}
          
          <button 
            onClick={() => changeDate(1)}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
          >
            <span className="text-xl">→</span>
          </button>
        </div>
      </div>

      {/* 本日の予定 */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
  <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-blue-200 pb-2">
    📅 本日の予定
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
    <div className="space-y-4">
      <TaskSection
        title="🌾 盛り"
        tasks={todayTasks.mori}
        renderContent={(tasks) => {
          const total = calculateTotal(tasks);
          return (
            <>
              {tasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                  <span className="font-bold text-blue-600">{task.jungoId}号</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getProcessColor(task.processType || '')}`}>
                    {getProcessName(task.processType || '')}
                  </span>
                  <span className="ml-2 font-bold">{task.amount}kg</span>
                  <span className="ml-1 text-gray-500">({task.riceType})</span>
                </div>
              ))}
              <div className="border-t border-gray-300 mt-2 pt-2 text-right text-sm">
                <span className="font-bold">合計: {total}kg</span>
              </div>
            </>
          );
        }}
      />

      <TaskSection
        title="🌾 出麹"
        tasks={todayTasks.dekoji}
        renderContent={(tasks) => {
          const distribution = getDekojiDistribution(tasks);
          const total = calculateTotal(tasks);
          
          return (
            <>
              {distribution && (
                <div className="mb-2">
                  <button 
  onClick={() => {
    const dateStr = currentDate.toISOString().split('T')[0];
    window.dispatchEvent(new CustomEvent('navigateToDekojiPage', { detail: { date: dateStr } }));
  }}
  className="inline-block bg-green-100 hover:bg-green-200 px-3 py-1 rounded text-sm font-bold text-green-700 transition-colors cursor-pointer"
>
  📊 棚配分 {distribution}
</button>
                </div>
              )}
              
              {tasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                  <span className="font-bold text-green-600">{task.jungoId}号</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getProcessColor(task.processType || '')}`}>
                    {getProcessName(task.processType || '')}
                  </span>
                  <span className="ml-2 font-bold">{task.amount}kg</span>
                  <span className="ml-1 text-gray-500">({task.riceType})</span>
                </div>
              ))}
              
              {tasks.length > 0 && (
                <div className="border-t border-gray-300 mt-2 pt-2 text-right text-sm">
                  <span className="font-bold">合計: {total}kg</span>
                </div>
              )}
            </>
          );
        }}
      />
    </div>

    <div className="space-y-4">
      <TaskSection
        title="🏺 引き込み"
        tasks={todayTasks.hikomi}
        renderContent={(tasks) => {
          const total = calculateTotal(tasks);
          return (
            <>
              {tasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                  <span className="font-bold text-blue-600">{task.jungoId}号</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getProcessColor(task.processType || '')}`}>
                    {getProcessName(task.processType || '')}
                  </span>
                  <span className="ml-2 font-bold">{task.amount}kg</span>
                  <span className="ml-1 text-gray-500">({task.riceType})</span>
                </div>
              ))}
              <div className="border-t border-gray-300 mt-2 pt-2 text-right text-sm">
                <span className="font-bold">合計: {total}kg</span>
              </div>
            </>
          );
        }}
      />

      <TaskSection
        title="⚗️ 仕込み"
        tasks={todayTasks.shikomi}
        renderContent={(tasks) => {
          const processOrder = ['motoKake', 'soeKake', 'nakaKake', 'tomeKake', 'yodan'];
          const sortedTasks = [...tasks].sort((a, b) => {
            const orderA = processOrder.indexOf(a.processType || '');
            const orderB = processOrder.indexOf(b.processType || '');
            return orderA - orderB;
          });
          
          return (
            <>
              {sortedTasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                  <span className="font-bold text-blue-600">{task.jungoId}号</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getProcessColor(task.processType || '')}`}>
                    {getProcessName(task.processType || '')}
                  </span>
                  <span className="ml-2 font-bold">{task.amount}kg</span>
                  <span className="ml-1 text-gray-500">({task.riceType})</span>
                </div>
              ))}
            </>
          );
        }}
      />
    </div>

    <div className="space-y-4">
      <TaskSection
  title="🌾 洗米"
  subtitle={(() => {
    const kojiTasks = todayTasks.senmai.filter(t => t.processType?.includes('Koji'));
    const motoKakeTasks = todayTasks.senmai.filter(t => t.processType === 'motoKake');
    const otherTasks = todayTasks.senmai.filter(t => !t.processType?.includes('Koji') && t.processType !== 'motoKake');
    
    const kojiTotal = kojiTasks.reduce((sum, task) => sum + (task.amount || 0), 0);
    
    let yellowBoxes = 0;
    let blueBoxes = 0;
    
    if (kojiTotal > 0) yellowBoxes += Math.ceil(kojiTotal / 180);
    motoKakeTasks.forEach(task => { yellowBoxes += Math.ceil((task.amount || 0) / 180); });
    otherTasks.forEach(task => { blueBoxes += Math.ceil((task.amount || 0) / 180); });
    
    yellowBoxes = Math.min(yellowBoxes, 2);
    blueBoxes = Math.min(blueBoxes, 4);
    
    const boxText = [
      yellowBoxes > 0 ? `黄色${yellowBoxes}個` : '',
      blueBoxes > 0 ? `青${blueBoxes}個` : ''
    ].filter(Boolean).join('・');
    
    return boxText ? `BOX: ${boxText}` : '';
  })()}
  tasks={todayTasks.senmai}
  renderContent={(tasks) => {
    const processOrder = ['motoKoji', 'motoKake', 'soeKoji', 'soeKake', 'nakaKoji', 'nakaKake', 'tomeKoji', 'tomeKake', 'yodan'];
    const sortedTasks = [...tasks].sort((a, b) => {
      const orderA = processOrder.indexOf(a.processType || '');
      const orderB = processOrder.indexOf(b.processType || '');
      return orderA - orderB;
    });
    
    const kojiTasks = sortedTasks.filter(t => t.processType?.includes('Koji'));
const otherTasks = sortedTasks.filter(t => !t.processType?.includes('Koji'));
const kojiTotal = calculateTotal(kojiTasks);

// 同じ順号+工程でグループ化してサブ合計を計算
const getGroupSubtotals = (tasks: TodayTask[]) => {
  const groups = new Map<string, number>();
  tasks.forEach(task => {
    const key = `${task.jungoId}-${task.processType}`;
    groups.set(key, (groups.get(key) || 0) + (task.amount || 0));
  });
  return groups;
};

const kojiSubtotals = getGroupSubtotals(kojiTasks);
const otherSubtotals = getGroupSubtotals(otherTasks);

return (
  <>
    {kojiTasks.map((task, index) => {
      const key = `${task.jungoId}-${task.processType}`;
      const isLastInGroup = index === kojiTasks.length - 1 || 
        kojiTasks[index + 1]?.jungoId !== task.jungoId || 
        kojiTasks[index + 1]?.processType !== task.processType;
      const subtotal = kojiSubtotals.get(key) || 0;
      const showSubtotal = isLastInGroup && subtotal > (task.amount || 0);
      
      return (
        <div key={index}>
          <div className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
            <span className="font-bold text-blue-600">{task.jungoId}号</span>
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getProcessColor(task.processType || '')}`}>
              {getProcessName(task.processType || '')}
            </span>
            <span className="ml-2 font-bold">{task.amount}kg</span>
            <span className="ml-1 text-gray-500">({task.riceType})</span>
          </div>
          {showSubtotal && (
            <div className="bg-blue-50 p-1 text-xs text-right text-blue-700 font-semibold">
              → {task.jungoId}号 {getProcessName(task.processType || '')} 合計: {subtotal}kg
            </div>
          )}
        </div>
      );
    })}
    <div className="border-t border-gray-300 mt-2 pt-2 text-right text-sm">
      <span className="font-bold">合計: {kojiTotal}kg</span>
    </div>
    {otherTasks.map((task, index) => {
      const key = `${task.jungoId}-${task.processType}`;
      const isLastInGroup = index === otherTasks.length - 1 || 
        otherTasks[index + 1]?.jungoId !== task.jungoId || 
        otherTasks[index + 1]?.processType !== task.processType;
      const subtotal = otherSubtotals.get(key) || 0;
      const showSubtotal = isLastInGroup && subtotal > (task.amount || 0);
      
      return (
        <div key={index}>
          <div className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
            <span className="font-bold text-blue-600">{task.jungoId}号</span>
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getProcessColor(task.processType || '')}`}>
              {getProcessName(task.processType || '')}
            </span>
            <span className="ml-2 font-bold">{task.amount}kg</span>
            <span className="ml-1 text-gray-500">({task.riceType})</span>
          </div>
          {showSubtotal && (
            <div className="bg-blue-50 p-1 text-xs text-right text-blue-700 font-semibold">
              → {task.jungoId}号 {getProcessName(task.processType || '')} 合計: {subtotal}kg
            </div>
          )}
        </div>
      );
    })}
  </>
);
  }}
/>
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <TaskSection
  title="🍶 酒母卸"
  tasks={todayTasks.motoOroshi}
  renderContent={(tasks) => (
    <>
      {tasks.map((task, index) => (
        <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
          <span className="font-bold text-blue-600">{task.jungoId}号</span>
          <span className="ml-2 text-gray-600">
            →No.{task.soeTankId || task.tankNo}
          </span>
        </div>
      ))}
    </>
  )}
/>

    <TaskSection
  title="🔨 枝打ち"
  tasks={todayTasks.edauchi}
  renderContent={(tasks) => (
    <>
      {tasks.map((task, index) => {
        // 添タンクがあれば表示
        if (task.soeTankId) {
          return (
            <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
              <span className="font-bold text-blue-600">{task.jungoId}号</span>
              <span className="ml-2 text-gray-600">No.{task.soeTankId}→No.{task.tankNo}</span>
            </div>
          );
        }
        // 添タンクがない場合は表示しない
        return null;
      })}
    </>
  )}
/>
  </div>

  <TaskSection
  title="🍶 上槽"
  tasks={todayTasks.joso}
  renderContent={(tasks) => (
    <>
      {tasks.map((task, index) => (
        <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm flex items-center justify-between">
          <div>
            <span className="font-bold text-blue-600">{task.jungoId}号</span>
            <span className="ml-2 text-gray-600">
              No.{task.tankNo}→{task.kenteiTankId ? `No.${task.kenteiTankId}` : '未設定'}
            </span>
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
              {task.brewingCategory}
            </span>
          </div>
          <span className="text-gray-600 text-xs">
            仕込規模: {task.brewingSize}kg
          </span>
        </div>
      ))}
    </>
  )}
/>

{/* 本日のタスク・定期タスク（2列） */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
    {/* 左列: 本日のタスク */}
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-3 text-blue-800 border-b-2 border-blue-200 pb-2">
        📝 本日のタスク
      </h3>
      
      {/* タンク洗い */}
      {todayTasks.tankWash.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2 text-gray-700">🧼 タンク洗い</h4>
          <div className="space-y-1">
            {todayTasks.tankWash.map((task, index) => (
              <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                <span className="font-bold text-blue-600">{task.jungoId}号:</span>
                <span className="ml-2 text-gray-700">No.{task.tankNo}</span>
                <span className="ml-1 text-gray-500 text-xs">({task.processType})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* タンクに湯 */}
      {todayTasks.tankHotWater.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2 text-gray-700">🚰 タンクに湯</h4>
          <div className="space-y-1">
            {todayTasks.tankHotWater.map((task, index) => (
              <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                <span className="font-bold text-blue-600">{task.jungoId}号:</span>
                <span className="ml-2 text-gray-700">No.{task.tankNo}</span>
                <span className="ml-1 text-gray-500 text-xs">({task.processType})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* マット洗い */}
      {todayTasks.matWash.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold mb-2 text-gray-700">🧽 マット洗い</h4>
          <div className="space-y-1">
            {todayTasks.matWash.map((task, index) => (
              <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                <span className="font-bold text-blue-600">{task.jungoId}号:</span>
                <span className="ml-2 text-gray-700">No.{task.tankNo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 検定タンク変更 */}
{todayTasks.kenteiChange.length > 0 && (
  <div className="mb-4">
    <h4 className="text-sm font-bold mb-2 text-gray-700">🔄 検定タンク変更</h4>
    <div className="space-y-1">
      {todayTasks.kenteiChange.map((change, index) => (
        <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
          <span className="font-bold text-orange-600">
            No.{change.prev} → No.{change.current}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
      
      {todayTasks.tankWash.length === 0 && 
       todayTasks.tankHotWater.length === 0 && 
       todayTasks.matWash.length === 0 && 
       todayTasks.kenteiChange.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">
          本日のタスクはありません
        </div>
      )}
    </div>
    
    {/* 右列: 定期タスク */}
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-3 text-red-800 border-b-2 border-red-200 pb-2">
        📋 定期タスク
      </h3>
      
      {dataContext.overdueTasks && dataContext.overdueTasks.length > 0 ? (
        <div className="space-y-2">
          {dataContext.overdueTasks.map((task: OverdueTask) => (
            <div 
              key={task.id} 
              className="bg-red-50 p-3 rounded border border-red-200 text-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-red-700">{task.taskName}</span>
                  <span className="ml-2 text-gray-600 text-xs block mt-1">
                    最終完了: {task.lastCompletedDate}
                  </span>
                </div>
                <span className="text-red-600 font-semibold whitespace-nowrap ml-2">
                  {task.elapsedDays}日経過 ⚠️
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400 text-sm">
          期限切れタスクはありません
        </div>
      )}
    </div>
  </div>

  {!hasAnyTasks && (!dataContext.overdueTasks || dataContext.overdueTasks.length === 0) && (
    <div className="text-center py-6 text-gray-400 text-sm">
      本日の予定はありません
    </div>
  )}
</div>

      {/* もろみ一覧 */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="bg-slate-800 px-4 py-3">
          <h2 className="text-xl font-bold text-white">📋 もろみ一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-300">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold">順号</th>
                <th className="px-4 py-3 text-left text-sm font-bold">ステータス</th>
                <th className="px-4 py-3 text-left text-sm font-bold">添タンク</th>
                <th className="px-4 py-3 text-left text-sm font-bold">タンク</th>
                <th className="px-4 py-3 text-left text-sm font-bold">仕込規模</th>
                <th className="px-4 py-3 text-left text-sm font-bold">仕込区分</th>
                <th className="px-4 py-3 text-left text-sm font-bold">留日</th>
                <th className="px-4 py-3 text-left text-sm font-bold">上槽予定</th>
                <th className="px-4 py-3 text-left text-sm font-bold">日数</th>
                <th className="px-4 py-3 text-left text-sm font-bold">検定タンク</th>
              </tr>
            </thead>
            <tbody>
              {[...moromiData]
                .sort((a, b) => {
                  const statusA = getMoromiStatus(a, currentDate);
                  const statusB = getMoromiStatus(b, currentDate);
                  
                  if (statusA.sortOrder !== statusB.sortOrder) {
                    return statusA.sortOrder - statusB.sortOrder;
                  }
                  
                  return parseInt(a.jungoId) - parseInt(b.jungoId);
                })
                .map((moromi: MoromiData) => {
                  const moromiDays = calculateMoromiDays(moromi.tomeDate, moromi.josoDate);
                  const statusInfo = getMoromiStatus(moromi, currentDate);
                  return (
                    <Fragment key={moromi.jungoId}>
                      <tr
                        onClick={() => handleRowClick(moromi.jungoId)}
                        className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-bold text-blue-700">{moromi.jungoId}号</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusInfo.color}`}>
                            {statusInfo.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={moromi.soeTankId || ''}
                            onChange={(e) => handleSoeTankChange(moromi.by, moromi.jungoId, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="">-</option>
                            <option value="550">No.550</option>
                            <option value="552">No.552</option>
                            <option value="803">No.803</option>
                            <option value="804">No.804</option>
                          </select>
                        </td>
<td className="px-4 py-3">{moromi.tankNo ? `No.${moromi.tankNo}` : '-'}</td>
<td className="px-4 py-3">{moromi.brewingSize}kg</td>
                      <td className="px-4 py-3">{moromi.brewingCategory}</td>
                      <td className="px-4 py-3">{moromi.tomeDate.substring(5)}</td>
                        <td className="px-4 py-3">{moromi.josoDate.substring(5)}</td>
                        <td className="px-4 py-3">{moromiDays}日</td>
                        <td className="px-4 py-3">
                          <select
                            value={moromi.kenteiTankId || ''}
                            onChange={(e) => handleKenteiTankChange(moromi.by, moromi.jungoId, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="">-</option>
                            <option value="31">No.31</option>
                            <option value="33">No.33</option>
                            <option value="99">No.99</option>
                            <option value="101">No.101</option>
                            <option value="108">No.108</option>
                            <option value="102">No.102</option>
                            <option value="103">No.103</option>
                            <option value="100">No.100</option>
                            <option value="107">No.107</option>
                            <option value="109">No.109</option>
                            <option value="132">No.132</option>
                            <option value="131">No.131</option>
                            <option value="135">No.135</option>
                            <option value="40">No.40</option>
                            <option value="42">No.42</option>
                            <option value="87">No.87</option>
                            <option value="83">No.83</option>
                            <option value="262">No.262</option>
                            <option value="263">No.263</option>
                            <option value="288">No.288</option>
                            <option value="888">No.888</option>
                            <option value="264">No.264</option>
                          </select>
                        </td>
                      </tr>
                   {expandedJungo === moromi.jungoId && (
                      <tr>
                        <td colSpan={10} className="px-4 py-4 bg-slate-50">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded">
                              <h3 className="font-bold mb-2">基本情報</h3>
                              <div className="text-sm space-y-1">
                                <div>製法区分: {moromi.methodCategory || '-'}</div>
                                <div>留日: {moromi.tomeDate.substring(5)}</div>
                                <div>上槽予定: {moromi.josoDate.substring(5)}</div>
                                <div>もろみ日数: {moromiDays}日</div>
                                <div className="mt-2 pt-2 border-t">
                                  <div>酒母卸: {moromi.motoOroshiDate.substring(5)}</div>
                                  <div>添仕込: {moromi.soeShikomiDate.substring(5)}</div>
                                  <div>仲仕込: {moromi.nakaShikomiDate.substring(5)}</div>
                                  <div>留仕込: {moromi.tomeShikomiDate.substring(5)}</div>
                                  {moromi.yodanShikomiDate && <div>四段: {moromi.yodanShikomiDate.substring(5)}</div>}
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded">
                              <h3 className="font-bold mb-2">工程一覧</h3>
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="px-2 py-1 text-left">工程</th>
                                    <th className="px-2 py-1 text-left">米品種</th>
                                    <th className="px-2 py-1 text-left">精米</th>
                                    <th className="px-2 py-1 text-left">数量</th>
                                    <th className="px-2 py-1 text-left">洗米</th>
                                    <th className="px-2 py-1 text-left">仕込</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {processes[moromi.jungoId]?.map((process: MoromiProcess) => (
                                    <tr key={`${process.processType}-${process.riceType}-${process.senmaiDate}`} className="border-b">
                                      <td className="px-2 py-1">{getProcessName(process.processType)}</td>
                                      <td className="px-2 py-1">{process.riceType}</td>
                                      <td className="px-2 py-1">{process.polishingRatio}%</td>
                                      <td className="px-2 py-1">{process.amount || '-'}</td>
                                      <td className="px-2 py-1">{process.senmaiDate.substring(5)}</td>
                                      <td className="px-2 py-1">{process.shikomiDate.substring(5)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* スマホ版 - カード表示 */}
<div className="md:hidden p-4 space-y-3">
  {[...moromiData]
    .sort((a, b) => {
      const statusA = getMoromiStatus(a, currentDate);
      const statusB = getMoromiStatus(b, currentDate);
      if (statusA.sortOrder !== statusB.sortOrder) {
        return statusA.sortOrder - statusB.sortOrder;
      }
      return parseInt(a.jungoId) - parseInt(b.jungoId);
    })
    .map((moromi: MoromiData) => {
      const moromiDays = calculateMoromiDays(moromi.tomeDate, moromi.josoDate);
      const statusInfo = getMoromiStatus(moromi, currentDate);
      const isExpanded = expandedJungo === moromi.jungoId;
      return (
        <div key={moromi.jungoId} className="bg-white border-2 border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 cursor-pointer active:bg-slate-50" onClick={() => setExpandedJungo(isExpanded ? null : moromi.jungoId)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-blue-600">{moromi.jungoId}号</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${statusInfo.color}`}>{statusInfo.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-600">規模:</span><span className="ml-1 font-semibold">{moromi.brewingSize}kg</span></div>
              <div><span className="text-gray-600">日数:</span><span className="ml-1 font-semibold">{moromiDays}日</span></div>
              <div><span className="text-gray-600">留日:</span><span className="ml-1">{moromi.tomeDate.substring(5)}</span></div>
              <div><span className="text-gray-600">上槽:</span><span className="ml-1">{moromi.josoDate.substring(5)}</span></div>
            </div>
            <div className="mt-2 text-xs text-gray-600">{moromi.brewingCategory}</div>
            <div className="text-right mt-2"><span className="text-blue-600 text-sm font-semibold">{isExpanded ? '▲ 閉じる' : '▼ 詳細'}</span></div>
          </div>
          {isExpanded && (
            <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-3">
              <div className="text-xs space-y-1">
                <div><span className="text-gray-600">添タンク:</span> <span className="font-semibold">{moromi.soeTankId || '-'}</span></div>
                <div><span className="text-gray-600">タンク:</span> <span className="font-semibold">{moromi.tankNo || '-'}</span></div>
                <div><span className="text-gray-600">検定タンク:</span> <span className="font-semibold">{moromi.kenteiTankId || '-'}</span></div>
                <div className="pt-2 border-t">
                  <div>酒母卸: {moromi.motoOroshiDate.substring(5)}</div>
                  <div>添仕込: {moromi.soeShikomiDate.substring(5)}</div>
                  <div>仲仕込: {moromi.nakaShikomiDate.substring(5)}</div>
                  <div>留仕込: {moromi.tomeShikomiDate.substring(5)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    })}
</div>
      </div>
    </div>
  );
}