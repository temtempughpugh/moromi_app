import { useState, useEffect } from 'react';
import type { MoromiData, MoromiProcess } from '../utils/types';
import { Fragment } from 'react';

interface DashboardProps {
  currentBY: number;
  getMoromiByBY: (by: number) => Promise<MoromiData[]>;
  getProcessesByMoromi: (by: number, jungoId: string) => Promise<MoromiProcess[]>;
}

interface TodayTask {
  jungoId: string;
  tankNo?: string;
  processType?: string;
  riceType?: string;
  amount?: number;
  brewingCategory?: string;
  brewingSize?: number;
}

export default function Dashboard({ currentBY, getMoromiByBY, getProcessesByMoromi }: DashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [moromiList, setMoromiList] = useState<MoromiData[]>([]);
  const [allProcesses, setAllProcesses] = useState<{ [key: string]: MoromiProcess[] }>({});
  const [expandedJungo, setExpandedJungo] = useState<string | null>(null);
  const [processes, setProcesses] = useState<{ [key: string]: MoromiProcess[] }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentBY]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getMoromiByBY(currentBY);
      setMoromiList(data);
      
      const processesMap: { [key: string]: MoromiProcess[] } = {};
      for (const moromi of data) {
        const processList = await getProcessesByMoromi(currentBY, moromi.jungoId);
        processesMap[moromi.jungoId] = processList;
      }
      setAllProcesses(processesMap);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const isSameDate = (date1: string | Date, date2: Date): boolean => {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    return d1.getFullYear() === date2.getFullYear() &&
           d1.getMonth() === date2.getMonth() &&
           d1.getDate() === date2.getDate();
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
    } = {
      mori: [],
      hikomi: [],
      motoOroshi: [],
      shikomi: [],
      dekoji: [],
      senmai: [],
      edauchi: [],
      joso: []
    };

    moromiList.forEach(moromi => {
      const processList = allProcesses[moromi.jungoId] || [];

      if (isSameDate(moromi.motoOroshiDate, currentDate)) {
        tasks.motoOroshi.push({ jungoId: moromi.jungoId });
      }

      if (isSameDate(moromi.uchikomiDate, currentDate)) {
        tasks.edauchi.push({ 
          jungoId: moromi.jungoId,
          tankNo: moromi.tankNo
        });
      }

      if (isSameDate(moromi.josoDate, currentDate)) {
        tasks.joso.push({
          jungoId: moromi.jungoId,
          tankNo: moromi.tankNo,
          brewingCategory: moromi.brewingCategory,
          brewingSize: moromi.brewingSize
        });
      }

      processList.forEach(process => {
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
            jungoId: moromi.jungoId,
            processType: process.processType,
            riceType: process.riceType,
            amount: process.amount || 0
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

  const calculateTotal = (tasks: TodayTask[]): number => {
    return tasks.reduce((sum, task) => sum + (task.amount || 0), 0);
  };

  const handleRowClick = async (jungoId: string) => {
    if (expandedJungo === jungoId) {
      setExpandedJungo(null);
    } else {
      try {
        const processList = await getProcessesByMoromi(currentBY, jungoId);
        setProcesses(prev => ({ ...prev, [jungoId]: processList }));
        setExpandedJungo(jungoId);
      } catch (error) {
        console.error('工程データ取得エラー:', error);
      }
    }
  };

  const calculateMoromiDays = (tomeDate: string, josoDate: string): number => {
    const tome = new Date(tomeDate);
    const joso = new Date(josoDate);
    const diffTime = Math.abs(joso.getTime() - tome.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  interface TaskSectionProps {
    title: string;
    tasks: TodayTask[];
    renderContent: (tasks: TodayTask[]) => React.ReactElement;
  }

  const TaskSection = ({ title, tasks, renderContent }: TaskSectionProps) => {
    if (!tasks || tasks.length === 0) return null;
    
    return (
      <div className="mb-4">
        <h4 className="text-sm font-bold mb-2 text-blue-800 border-b border-blue-200 pb-1">
          {title}
        </h4>
        <div className="space-y-1">
          {renderContent(tasks)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-700"></div>
      </div>
    );
  }

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
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
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
          title="🏺 引き込み"
          tasks={todayTasks.hikomi}
          renderContent={(tasks) => {
            const total = calculateTotal(tasks);
            return (
              <>
                {tasks.map((task, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                    <span className="font-bold text-blue-600">{task.jungoId}号</span>
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
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
          renderContent={(tasks) => (
            <>
              {tasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                  <span className="font-bold text-blue-600">{task.jungoId}号</span>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                    {getProcessName(task.processType || '')}
                  </span>
                  <span className="ml-2 font-bold">{task.amount}kg</span>
                  <span className="ml-1 text-gray-500">({task.riceType})</span>
                </div>
              ))}
            </>
          )}
        />

        <TaskSection
          title="✨ 出麹"
          tasks={todayTasks.dekoji}
          renderContent={(tasks) => {
            const total = calculateTotal(tasks);
            return (
              <>
                {tasks.map((task, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                    <span className="font-bold text-blue-600">{task.jungoId}号</span>
                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
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
          title="💧 洗米"
          tasks={todayTasks.senmai}
          renderContent={(tasks) => {
            const kojiTasks = tasks.filter(t => 
              t.processType === 'motoKoji' || 
              t.processType === 'soeKoji' || 
              t.processType === 'nakaKoji' || 
              t.processType === 'tomeKoji'
            );
            const otherTasks = tasks.filter(t => 
              t.processType !== 'motoKoji' && 
              t.processType !== 'soeKoji' && 
              t.processType !== 'nakaKoji' && 
              t.processType !== 'tomeKoji'
            );
            const kojiTotal = calculateTotal(kojiTasks);
            
            return (
              <>
                {kojiTasks.map((task, index) => (
                  <div key={`koji-${index}`} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                    <span className="font-bold text-blue-600">{task.jungoId}号</span>
                    <span className="ml-2 px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-semibold">
                      {getProcessName(task.processType || '')}
                    </span>
                    <span className="ml-2 font-bold">{task.amount}kg</span>
                    <span className="ml-1 text-gray-500">({task.riceType})</span>
                  </div>
                ))}
                {kojiTasks.length > 0 && (
                  <div className="border-t border-gray-300 mt-2 pt-2 mb-2 text-right text-sm">
                    <span className="font-bold">麹 合計: {kojiTotal}kg</span>
                  </div>
                )}
                {otherTasks.map((task, index) => (
                  <div key={`other-${index}`} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                    <span className="font-bold text-blue-600">{task.jungoId}号</span>
                    <span className="ml-2 px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-semibold">
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

        <TaskSection
          title="🍶 酒母卸"
          tasks={todayTasks.motoOroshi}
          renderContent={(tasks) => (
            <>
              {tasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                  <span className="font-bold text-blue-600">{task.jungoId}号</span>
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
              {tasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                  <span className="font-bold text-blue-600">{task.jungoId}号</span>
                  <span className="ml-2 text-gray-600">{task.tankNo}</span>
                </div>
              ))}
            </>
          )}
        />

        <TaskSection
          title="🍶 上槽"
          tasks={todayTasks.joso}
          renderContent={(tasks) => (
            <>
              {tasks.map((task, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200 text-sm flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-600">{task.jungoId}号</span>
                    <span className="ml-2 text-gray-600">{task.tankNo}</span>
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

        {!hasAnyTasks && (
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
                <th className="px-4 py-3 text-left text-sm font-bold">タンク</th>
                <th className="px-4 py-3 text-left text-sm font-bold">仕込規模</th>
                <th className="px-4 py-3 text-left text-sm font-bold">仕込区分</th>
                <th className="px-4 py-3 text-left text-sm font-bold">留日</th>
                <th className="px-4 py-3 text-left text-sm font-bold">上槽予定</th>
                <th className="px-4 py-3 text-left text-sm font-bold">日数</th>
              </tr>
            </thead>
            <tbody>
              {moromiList.map((moromi) => {
                const moromiDays = calculateMoromiDays(moromi.tomeDate, moromi.josoDate);
                return (
                  <Fragment key={moromi.jungoId}>
                    <tr
                      onClick={() => handleRowClick(moromi.jungoId)}
                      className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-blue-700">{moromi.jungoId}号</td>
                      <td className="px-4 py-3">{moromi.tankNo}</td>
                      <td className="px-4 py-3">{moromi.brewingSize}kg</td>
                      <td className="px-4 py-3">{moromi.brewingCategory}</td>
                      <td className="px-4 py-3">{moromi.tomeDate.substring(5)}</td>
                      <td className="px-4 py-3">{moromi.josoDate.substring(5)}</td>
                      <td className="px-4 py-3">{moromiDays}日</td>
                    </tr>
                    {expandedJungo === moromi.jungoId && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-slate-50">
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
                                  {processes[moromi.jungoId]?.map((process) => (
                                    <tr key={`${process.processType}-${process.senmaiDate}`} className="border-b">
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
      </div>
    </div>
  );
}