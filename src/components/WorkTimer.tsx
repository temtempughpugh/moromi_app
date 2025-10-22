// src/components/WorkTimer.tsx

import { useState, useEffect } from 'react';
import type { Staff, Shift, MoromiData, MoromiProcess, WorkTimeRecord } from '../utils/types';
import { KojiService } from '../services/KojiService';
import { useData } from '../hooks/useData';

interface WorkTimerProps {
  staffList: Staff[];
  shifts: Shift[];
  moromiData: MoromiData[];
  moromiProcesses: MoromiProcess[];
  tasks: any[];
  currentBY: number;
  onBack: () => void;
}

export default function WorkTimer({
  staffList,
  shifts,
  moromiData,
  moromiProcesses,
  currentBY,
  onBack
}: WorkTimerProps) {
  const dataContext = useData();
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // 各作業タイプごとのタイマー状態
  const [morningStartTime, setMorningStartTime] = useState<string | null>(null);
  const [morningStopTime, setMorningStopTime] = useState<string | null>(null);
  const [koshikiStartTime, setKoshikiStartTime] = useState<string | null>(null);
  const [koshikiStopTime, setKoshikiStopTime] = useState<string | null>(null);
  const [kasuStartTime, setKasuStartTime] = useState<string | null>(null);
  const [kasuStopTime, setKasuStopTime] = useState<string | null>(null);
  
  // 各作業タイプごとの展開状態
  const [morningExpanded, setMorningExpanded] = useState(true);
  const [koshikiExpanded, setKoshikiExpanded] = useState(true);
  const [kasuExpanded, setKasuExpanded] = useState(true);
  
  // 各作業タイプごとの記録展開インデックス
  const [morningExpandedRecordIndex, setMorningExpandedRecordIndex] = useState<number | null>(null);
  
  // 甑準備・粕取りの選択スタッフ
  const [koshikiSelectedStaff, setKoshikiSelectedStaff] = useState<string[]>([]);
  const [kasuSelectedStaff, setKasuSelectedStaff] = useState<string[]>([]);
  const [koshikiDropdownOpen, setKoshikiDropdownOpen] = useState(false);
  const [kasuDropdownOpen, setKasuDropdownOpen] = useState(false);

  // データ読み込み
  useEffect(() => {
    dataContext.loadWorkTimeRecords(currentDate);
  }, [currentDate]);

  // 記録をタイプ別に分類
 const morningRecords = dataContext.workTimeRecords.filter((r: WorkTimeRecord) => r.workType === 'morning');
const koshikiRecords = dataContext.workTimeRecords.filter((r: WorkTimeRecord) => r.workType === 'koshiki');
const kasuRecords = dataContext.workTimeRecords.filter((r: WorkTimeRecord) => r.workType === 'kasu');

  // 早番スタッフを取得（休みは除外）
  const getEarlyShiftStaff = (): Staff[] => {
    const todayShifts = shifts.filter(s => 
      s.date === currentDate && 
      s.shiftType === 'early' && 
      s.workHours !== null
    );
    return todayShifts
      .map(s => staffList.find(staff => staff.id === s.staffId))
      .filter((staff): staff is Staff => staff !== undefined);
  };

  const earlyStaff = getEarlyShiftStaff();
  const activeStaffList = staffList.filter(s => s.isActive);

  // 前日の出麹を取得
  const getYesterdayDekoji = () => {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const kojiProcesses = moromiProcesses.filter(p => 
      p.by === currentBY &&
      p.processType?.includes('Koji') && 
      p.dekojiDate === yesterdayStr
    );

    return kojiProcesses.map(koji => {
      const kake = moromiProcesses.find(p => 
        p.jungoId === koji.jungoId && 
        koji.processType &&
        p.processType === koji.processType.replace('Koji', 'Kake')
      );
      
      const storageType = KojiService.determineStorageType(
        koji.dekojiDate || '',
        kake?.kakeShikomiDate || null
      );

      return { ...koji, storageType };
    });
  };

  // 本日の仲・留仕込みを取得
  const getTodayNakaTomeShikomi = () => {
    return moromiData.filter(m => {
      if (m.by !== currentBY) return false;
      return m.nakaShikomiDate === currentDate || m.tomeShikomiDate === currentDate;
    }).map(m => ({
      ...m,
      status: m.nakaShikomiDate === currentDate ? '仲' : '留'
    }));
  };

  // 本日のタスクを取得
  // 本日のタスクを取得
const getTodayTasks = () => {
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const taskList: string[] = [];
  
  // isSameDate関数を追加
  const isSameDate = (date1: string | Date, date2: string | Date): boolean => {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return d1.toDateString() === d2.toDateString();
  };
  
  const currentDateObj = new Date(currentDate);

  moromiData.forEach(m => {
    if (m.by !== currentBY) return;
    
    // タンク洗い（翌日がモト卸し）
    if (isSameDate(m.motoOroshiDate, tomorrow)) {
      const tankId = m.soeTankId || m.tankNo;
      const tankType = m.soeTankId ? '添タンク' : '仕込みタンク';
      taskList.push(`タンク洗い(${tankType}): ${m.jungoId}号 No.${tankId}`);
    }
    
    // タンクに湯（当日がモト卸し）
    if (isSameDate(m.motoOroshiDate, currentDateObj)) {
      const tankId = m.soeTankId || m.tankNo;
      const tankType = m.soeTankId ? '添タンク' : '仕込みタンク';
      taskList.push(`タンクに湯(${tankType}): ${m.jungoId}号 No.${tankId}`);
    }
    
    // タンクに湯（当日が打ち込み日 かつ 添タンクがある場合は仕込みタンクに湯）
    if (isSameDate(m.uchikomiDate, currentDateObj) && m.soeTankId) {
      taskList.push(`タンクに湯(仕込みタンク): ${m.jungoId}号 No.${m.tankNo}`);
    }
    
    // マット洗い
    if (isSameDate(m.josoDate, tomorrow)) {
      taskList.push(`マット洗い: ${m.jungoId}号 No.${m.tankNo}`);
    }
  });

  return taskList;
};

  const yesterdayDekoji = getYesterdayDekoji();
  const todayShikomi = getTodayNakaTomeShikomi();
  const todayTasksList = getTodayTasks();

  const getProcessName = (processType: string): string => {
    const map: { [key: string]: string } = {
      'motoKoji': 'モト麹', 'soeKoji': '初麹', 'nakaKoji': '仲麹', 'tomeKoji': '留麹'
    };
    return map[processType] || processType;
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeOnly = (timeStr: string): string => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}/${date.getDate()}(${weekdays[date.getDay()]})`;
  };

  // 午前作業のハンドラー
  const handleMorningStart = () => {
    const now = new Date().toISOString();
    setMorningStartTime(now);
    setMorningStopTime(null);
  };

  const handleMorningStop = async () => {
    if (!morningStartTime) return;
    
    const now = new Date().toISOString();
    setMorningStopTime(now);
    
    const start = new Date(morningStartTime).getTime();
    const stop = new Date(now).getTime();
    const totalSeconds = Math.floor((stop - start) / 1000);
    
    const record: Omit<WorkTimeRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date: currentDate,
      workType: 'morning',
      staffNames: earlyStaff.map(s => s.name).join('、') || '未設定',
      startTime: morningStartTime,
      stopTime: now,
      totalSeconds: totalSeconds,
      dekoji: yesterdayDekoji,
      shikomi: todayShikomi,
      tasks: todayTasksList
    };
    
    try {
      await dataContext.saveWorkTimeRecord(record);
      setMorningStartTime(null);
      setMorningStopTime(null);
    } catch (error) {
      console.error('午前作業記録保存エラー:', error);
      alert('記録の保存に失敗しました');
    }
  };

  // 甑準備作業のハンドラー
  const handleKoshikiStart = () => {
    const now = new Date().toISOString();
    setKoshikiStartTime(now);
    setKoshikiStopTime(null);
  };

  const handleKoshikiStop = async () => {
    if (!koshikiStartTime) return;
    
    const now = new Date().toISOString();
    setKoshikiStopTime(now);
    
    const start = new Date(koshikiStartTime).getTime();
    const stop = new Date(now).getTime();
    const totalSeconds = Math.floor((stop - start) / 1000);
    
    const record: Omit<WorkTimeRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date: currentDate,
      workType: 'koshiki',
      staffNames: koshikiSelectedStaff.map(id => 
        activeStaffList.find(s => s.id === id)?.name
      ).filter(Boolean).join('、') || '未設定',
      startTime: koshikiStartTime,
      stopTime: now,
      totalSeconds: totalSeconds
    };
    
    try {
      await dataContext.saveWorkTimeRecord(record);
      setKoshikiStartTime(null);
      setKoshikiStopTime(null);
    } catch (error) {
      console.error('甑準備作業記録保存エラー:', error);
      alert('記録の保存に失敗しました');
    }
  };

  // 粕取り作業のハンドラー
  const handleKasuStart = () => {
    const now = new Date().toISOString();
    setKasuStartTime(now);
    setKasuStopTime(null);
  };

  const handleKasuStop = async () => {
    if (!kasuStartTime) return;
    
    const now = new Date().toISOString();
    setKasuStopTime(now);
    
    const start = new Date(kasuStartTime).getTime();
    const stop = new Date(now).getTime();
    const totalSeconds = Math.floor((stop - start) / 1000);
    
    const record: Omit<WorkTimeRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date: currentDate,
      workType: 'kasu',
      staffNames: kasuSelectedStaff.map(id => 
        activeStaffList.find(s => s.id === id)?.name
      ).filter(Boolean).join('、') || '未設定',
      startTime: kasuStartTime,
      stopTime: now,
      totalSeconds: totalSeconds
    };
    
    try {
      await dataContext.saveWorkTimeRecord(record);
      setKasuStartTime(null);
      setKasuStopTime(null);
    } catch (error) {
      console.error('粕取り作業記録保存エラー:', error);
      alert('記録の保存に失敗しました');
    }
  };

  // 削除ハンドラー
  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    if (!confirm('削除しますか？')) return;
    
    try {
      await dataContext.deleteWorkTimeRecord(id, currentDate);
    } catch (error) {
      console.error('記録削除エラー:', error);
      alert('記録の削除に失敗しました');
    }
  };

  // スタッフ選択トグル
  const toggleKoshikiStaff = (staffId: string) => {
    setKoshikiSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const toggleKasuStaff = (staffId: string) => {
    setKasuSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">⏱️ 作業タイム測定</h2>
          <button onClick={onBack} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">← 戻る</button>
        </div>
      </div>

      {/* 午前作業 */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
          onClick={() => setMorningExpanded(!morningExpanded)}
        >
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>{morningExpanded ? '▼' : '▶'}</span>
            <span>午前作業</span>
          </h3>
        </div>
        
        {morningExpanded && (
          <div className="p-4 border-t">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-bold mb-2">
                    作業員: {earlyStaff.length > 0 ? earlyStaff.map(s => s.name).join('、') : '未設定'}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">開始:</span>
                      <span className="ml-1 font-mono">{morningStartTime ? formatTimeOnly(morningStartTime) : '--:--:--'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">終了:</span>
                      <span className="ml-1 font-mono">{morningStopTime ? formatTimeOnly(morningStopTime) : '--:--:--'}</span>
                    </div>
                    {morningStopTime && morningStartTime && (
                      <div>
                        <span className="text-gray-600">タイム:</span>
                        <span className="ml-1 font-mono font-bold text-blue-600">
                          {formatTime(Math.floor((new Date(morningStopTime).getTime() - new Date(morningStartTime).getTime()) / 1000))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleMorningStart} disabled={morningStartTime !== null} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-bold">
                    スタート
                  </button>
                  <button onClick={handleMorningStop} disabled={!morningStartTime || morningStopTime !== null} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 text-sm font-bold">
                    ストップ
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded p-3">
                <h4 className="font-bold mb-2 text-sm">🌾 出麹（前日）</h4>
                {yesterdayDekoji.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    {yesterdayDekoji.map((p, idx) => (
                      <div key={idx} className="bg-white p-1 rounded">
                        <div className="font-bold text-blue-600">
                          {p.jungoId}号 {getProcessName(p.processType || '')}
                          {p.storageType && <span className="ml-1 text-purple-600">{p.storageType === '冷蔵' ? '💧' : '🧊'}</span>}
                        </div>
                        <div className="text-gray-600">{p.amount}kg</div>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-gray-400 text-center py-2 text-xs">なし</p>)}
              </div>

              <div className="bg-gray-50 rounded p-3">
                <h4 className="font-bold mb-2 text-sm">💧 水麹準備</h4>
                {todayShikomi.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    {todayShikomi.map((m, idx) => (
                      <div key={idx} className="bg-white p-1 rounded">
                        <div className="flex justify-between">
                          <span className="font-bold text-blue-600">{m.jungoId}号</span>
                          <span className="px-1 bg-green-100 text-green-700 rounded text-xs">{m.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-gray-400 text-center py-2 text-xs">なし</p>)}
              </div>

              <div className="bg-gray-50 rounded p-3">
                <h4 className="font-bold mb-2 text-sm">✅ 本日のタスク</h4>
                {todayTasksList.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    {todayTasksList.map((task, idx) => (
                      <div key={idx} className="bg-white p-1 rounded text-xs">{task}</div>
                    ))}
                  </div>
                ) : (<p className="text-gray-400 text-center py-2 text-xs">なし</p>)}
              </div>
            </div>

            {/* 午前作業の記録 */}
            <div className="border-t pt-4">
              <h4 className="font-bold mb-2 text-sm">📊 過去の記録</h4>
              {morningRecords.length > 0 ? (
                <div className="space-y-2">
                  {morningRecords.map((r, idx) => (
                    <div key={r.id} className="border rounded">
                      <div 
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => setMorningExpandedRecordIndex(morningExpandedRecordIndex === idx ? null : idx)}
                      >
                        <div className="flex-1 flex items-center gap-3 text-xs">
                          <span className="font-semibold">{formatDate(r.date)}</span>
                          <span>{r.staffNames}</span>
                          <span className="font-mono font-bold text-blue-600">{formatTime(r.totalSeconds)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{morningExpandedRecordIndex === idx ? '▼' : '▶'}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      
                      {morningExpandedRecordIndex === idx && (
                        <div className="p-2 bg-gray-50 border-t">
                          <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                            <div>
                              <div className="text-gray-600">スタート</div>
                              <div className="font-mono">{formatTimeOnly(r.startTime)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">ストップ</div>
                              <div className="font-mono">{formatTimeOnly(r.stopTime)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">タイム</div>
                              <div className="font-mono font-bold text-blue-600">{formatTime(r.totalSeconds)}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="font-bold mb-1">🌾 出麹</div>
                              {r.dekoji && r.dekoji.length > 0 ? (
                                r.dekoji.map((p: any, i: number) => (
                                  <div key={i} className="bg-white p-1 rounded mb-1">
                                    {p.jungoId}号 {getProcessName(p.processType || '')}
                                  </div>
                                ))
                              ) : <div className="text-gray-400">なし</div>}
                            </div>
                            <div>
                              <div className="font-bold mb-1">💧 水麹</div>
                              {r.shikomi && r.shikomi.length > 0 ? (
                                r.shikomi.map((m: any, i: number) => (
                                  <div key={i} className="bg-white p-1 rounded mb-1">
                                    {m.jungoId}号 {m.status}
                                  </div>
                                ))
                              ) : <div className="text-gray-400">なし</div>}
                            </div>
                            <div>
                              <div className="font-bold mb-1">✅ タスク</div>
                              {r.tasks && r.tasks.length > 0 ? (
                                r.tasks.map((t: string, i: number) => (
                                  <div key={i} className="bg-white p-1 rounded mb-1">{t}</div>
                                ))
                              ) : <div className="text-gray-400">なし</div>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (<p className="text-gray-400 text-center py-4 text-xs">記録がありません</p>)}
            </div>
          </div>
        )}
      </div>

      {/* 甑準備作業 */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
          onClick={() => setKoshikiExpanded(!koshikiExpanded)}
        >
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>{koshikiExpanded ? '▼' : '▶'}</span>
            <span>甑準備作業</span>
          </h3>
        </div>
        
        {koshikiExpanded && (
          <div className="p-4 border-t">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-bold mb-2 flex items-center gap-2">
                    <span>作業員:</span>
                    <div className="relative">
                      <button 
                        onClick={() => setKoshikiDropdownOpen(!koshikiDropdownOpen)}
                        className="px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200 text-sm"
                      >
                        {koshikiSelectedStaff.length > 0 
                          ? koshikiSelectedStaff.map(id => activeStaffList.find(s => s.id === id)?.name).join('、')
                          : '未設定'} ▼
                      </button>
                      {koshikiDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-[200px]">
                          {activeStaffList.map(staff => (
                            <label key={staff.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={koshikiSelectedStaff.includes(staff.id)}
                                onChange={() => toggleKoshikiStaff(staff.id)}
                                className="mr-2"
                              />
                              <span className="text-sm">{staff.name}</span>
                            </label>
                          ))}
                          <button 
                            onClick={() => setKoshikiDropdownOpen(false)}
                            className="w-full px-3 py-2 bg-blue-500 text-white text-sm hover:bg-blue-600"
                          >
                            確定
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">開始:</span>
                      <span className="ml-1 font-mono">{koshikiStartTime ? formatTimeOnly(koshikiStartTime) : '--:--:--'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">終了:</span>
                      <span className="ml-1 font-mono">{koshikiStopTime ? formatTimeOnly(koshikiStopTime) : '--:--:--'}</span>
                    </div>
                    {koshikiStopTime && koshikiStartTime && (
                      <div>
                        <span className="text-gray-600">タイム:</span>
                        <span className="ml-1 font-mono font-bold text-blue-600">
                          {formatTime(Math.floor((new Date(koshikiStopTime).getTime() - new Date(koshikiStartTime).getTime()) / 1000))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleKoshikiStart} disabled={koshikiStartTime !== null} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-bold">
                    スタート
                  </button>
                  <button onClick={handleKoshikiStop} disabled={!koshikiStartTime || koshikiStopTime !== null} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 text-sm font-bold">
                    ストップ
                  </button>
                </div>
              </div>
            </div>

            {/* 甑準備作業の記録 */}
            <div className="border-t pt-4">
              <h4 className="font-bold mb-2 text-sm">📊 過去の記録</h4>
              {koshikiRecords.length > 0 ? (
                <div className="space-y-2">
                  {koshikiRecords.map((r) => (
                    <div key={r.id} className="border rounded p-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatDate(r.date)}</span>
                          <span>{r.staffNames}</span>
                          <span className="font-mono font-bold text-blue-600">{formatTime(r.totalSeconds)}</span>
                        </div>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-gray-400 text-center py-4 text-xs">記録がありません</p>)}
            </div>
          </div>
        )}
      </div>

      {/* 粕取り作業 */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
          onClick={() => setKasuExpanded(!kasuExpanded)}
        >
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>{kasuExpanded ? '▼' : '▶'}</span>
            <span>粕取り作業</span>
          </h3>
        </div>
        
        {kasuExpanded && (
          <div className="p-4 border-t">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-bold mb-2 flex items-center gap-2">
                    <span>作業員:</span>
                    <div className="relative">
                      <button 
                        onClick={() => setKasuDropdownOpen(!kasuDropdownOpen)}
                        className="px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200 text-sm"
                      >
                        {kasuSelectedStaff.length > 0 
                          ? kasuSelectedStaff.map(id => activeStaffList.find(s => s.id === id)?.name).join('、')
                          : '未設定'} ▼
                      </button>
                      {kasuDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-[200px]">
                          {activeStaffList.map(staff => (
                            <label key={staff.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={kasuSelectedStaff.includes(staff.id)}
                                onChange={() => toggleKasuStaff(staff.id)}
                                className="mr-2"
                              />
                              <span className="text-sm">{staff.name}</span>
                            </label>
                          ))}
                          <button 
                            onClick={() => setKasuDropdownOpen(false)}
                            className="w-full px-3 py-2 bg-blue-500 text-white text-sm hover:bg-blue-600"
                          >
                            確定
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">開始:</span>
                      <span className="ml-1 font-mono">{kasuStartTime ? formatTimeOnly(kasuStartTime) : '--:--:--'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">終了:</span>
                      <span className="ml-1 font-mono">{kasuStopTime ? formatTimeOnly(kasuStopTime) : '--:--:--'}</span>
                    </div>
                    {kasuStopTime && kasuStartTime && (
                      <div>
                        <span className="text-gray-600">タイム:</span>
                        <span className="ml-1 font-mono font-bold text-blue-600">
                          {formatTime(Math.floor((new Date(kasuStopTime).getTime() - new Date(kasuStartTime).getTime()) / 1000))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleKasuStart} disabled={kasuStartTime !== null} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-bold">
                    スタート
                  </button>
                  <button onClick={handleKasuStop} disabled={!kasuStartTime || kasuStopTime !== null} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 text-sm font-bold">
                    ストップ
                  </button>
                </div>
              </div>
            </div>

            {/* 粕取り作業の記録 */}
            <div className="border-t pt-4">
              <h4 className="font-bold mb-2 text-sm">📊 過去の記録</h4>
              {kasuRecords.length > 0 ? (
                <div className="space-y-2">
                  {kasuRecords.map((r) => (
                    <div key={r.id} className="border rounded p-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatDate(r.date)}</span>
                          <span>{r.staffNames}</span>
                          <span className="font-mono font-bold text-blue-600">{formatTime(r.totalSeconds)}</span>
                        </div>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-gray-400 text-center py-4 text-xs">記録がありません</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}