// src/components/WorkTimer.tsx

import { useState } from 'react';
import type { Staff, Shift, MoromiData, MoromiProcess } from '../utils/types';
import { KojiService } from '../services/KojiService';

interface WorkTimerProps {
  staffList: Staff[];
  shifts: Shift[];
  moromiData: MoromiData[];
  moromiProcesses: MoromiProcess[];
  tasks: any[];
  currentBY: number;
  onBack: () => void;
}

interface WorkTimeRecord {
  date: string;
  staffNames: string;
  startTime: string;
  stopTime: string;
  totalSeconds: number;
  dekoji: any[];
  shikomi: any[];
  tasks: string[];
}

export default function WorkTimer({
  staffList,
  shifts,
  moromiData,
  moromiProcesses,
  currentBY,
  onBack
}: WorkTimerProps) {
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<WorkTimeRecord[]>([]);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [stopTime, setStopTime] = useState<string | null>(null);
  const [expandedRecordIndex, setExpandedRecordIndex] = useState<number | null>(null);

  // 早番スタッフを取得
  const getEarlyShiftStaff = (): Staff[] => {
    const todayShifts = shifts.filter(s => s.date === currentDate && s.shiftType === 'early');
    return todayShifts
      .map(s => staffList.find(staff => staff.id === s.staffId))
      .filter((staff): staff is Staff => staff !== undefined);
  };

  const earlyStaff = getEarlyShiftStaff();

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
  const getTodayTasks = () => {
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const taskList: string[] = [];

    moromiData.forEach(m => {
      if (m.by !== currentBY) return;
      if (m.motoOroshiDate === tomorrowStr) {
        const tankId = m.soeTankId || m.tankNo;
        taskList.push(`タンク洗い: ${m.jungoId}号 No.${tankId}`);
      }
      if (m.motoOroshiDate === currentDate) {
        const tankId = m.soeTankId || m.tankNo;
        taskList.push(`タンクに湯: ${m.jungoId}号 No.${tankId}`);
      }
      if (m.josoDate === tomorrowStr) {
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

  const handleStart = () => {
    const now = new Date().toISOString();
    setStartTime(now);
    setStopTime(null);
  };

  const handleStop = () => {
    if (!startTime) return;
    
    const now = new Date().toISOString();
    setStopTime(now);
    
    const start = new Date(startTime).getTime();
    const stop = new Date(now).getTime();
    const totalSeconds = Math.floor((stop - start) / 1000);
    
    const record: WorkTimeRecord = {
      date: currentDate,
      staffNames: earlyStaff.map(s => s.name).join('、') || '未設定',
      startTime: startTime,
      stopTime: now,
      totalSeconds: totalSeconds,
      dekoji: yesterdayDekoji,
      shikomi: todayShikomi,
      tasks: todayTasksList
    };
    
    setRecords(prev => [record, ...prev]);
    setStartTime(null);
    setStopTime(null);
  };

  const handleDelete = (index: number) => {
    if (confirm('削除しますか？')) {
      setRecords(prev => prev.filter((_, i) => i !== index));
      if (expandedRecordIndex === index) {
        setExpandedRecordIndex(null);
      }
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedRecordIndex(expandedRecordIndex === index ? null : index);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">⏱️ 作業タイム測定</h2>
          <button onClick={onBack} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">← 戻る</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-bold mb-2">
              本日の午前作業　{earlyStaff.length > 0 ? earlyStaff.map(s => s.name).join('、') : '作業員未設定'}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-600">開始:</span>
                <span className="ml-1 font-mono">{startTime ? formatTimeOnly(startTime) : '--:--:--'}</span>
              </div>
              <div>
                <span className="text-gray-600">終了:</span>
                <span className="ml-1 font-mono">{stopTime ? formatTimeOnly(stopTime) : '--:--:--'}</span>
              </div>
              {stopTime && startTime && (
                <div>
                  <span className="text-gray-600">タイム:</span>
                  <span className="ml-1 font-mono font-bold text-blue-600">
                    {formatTime(Math.floor((new Date(stopTime).getTime() - new Date(startTime).getTime()) / 1000))}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleStart} disabled={startTime !== null} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-bold">
              スタート
            </button>
            <button onClick={handleStop} disabled={!startTime || stopTime !== null} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 text-sm font-bold">
              ストップ
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-3 pb-2 border-b">🌾 出麹（前日）</h4>
          {yesterdayDekoji.length > 0 ? (
            <div className="space-y-2 text-sm">
              {yesterdayDekoji.map((p, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded">
                  <div className="font-bold text-blue-600">
                    {p.jungoId}号 {getProcessName(p.processType || '')}
                    {p.storageType && <span className="ml-1 text-xs text-purple-600">{p.storageType === '冷蔵' ? '💧' : '🧊'}{p.storageType}</span>}
                  </div>
                  <div className="text-gray-600">{p.amount}kg ({p.riceType}{p.polishingRatio})</div>
                </div>
              ))}
            </div>
          ) : (<p className="text-gray-400 text-center py-4 text-sm">なし</p>)}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-3 pb-2 border-b">💧 水麹準備</h4>
          {todayShikomi.length > 0 ? (
            <div className="space-y-2 text-sm">
              {todayShikomi.map((m, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="font-bold text-blue-600">{m.jungoId}号</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">{m.status}</span>
                  </div>
                  <div className="text-gray-600">{m.brewingSize}kg / {m.tankNo}</div>
                </div>
              ))}
            </div>
          ) : (<p className="text-gray-400 text-center py-4 text-sm">なし</p>)}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-bold mb-3 pb-2 border-b">✅ 本日のタスク</h4>
          {todayTasksList.length > 0 ? (
            <div className="space-y-2 text-sm">
              {todayTasksList.map((task, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded text-xs">{task}</div>
              ))}
            </div>
          ) : (<p className="text-gray-400 text-center py-4 text-sm">なし</p>)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-bold mb-3 pb-2 border-b">📊 過去の記録</h3>
        {records.length > 0 ? (
          <div className="space-y-2">
            {records.map((r, idx) => (
              <div key={idx} className="border rounded">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(idx)}
                >
                  <div className="flex-1 flex items-center gap-4">
                    <span className="text-sm font-semibold">{formatDate(r.date)}</span>
                    <span className="text-sm">{r.staffNames}</span>
                    <span className="text-sm font-mono font-bold text-blue-600">{formatTime(r.totalSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{expandedRecordIndex === idx ? '▼' : '▶'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(idx);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                    >
                      削除
                    </button>
                  </div>
                </div>
                
                {expandedRecordIndex === idx && (
                  <div className="p-3 bg-gray-50 border-t">
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">スタート</div>
                        <div className="text-sm font-mono">{formatTimeOnly(r.startTime)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">ストップ</div>
                        <div className="text-sm font-mono">{formatTimeOnly(r.stopTime)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">タイム</div>
                        <div className="text-sm font-mono font-bold text-blue-600">{formatTime(r.totalSeconds)}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="font-bold mb-2">🌾 出麹</div>
                        {r.dekoji.length > 0 ? (
                          r.dekoji.map((p: any, i: number) => (
                            <div key={i} className="bg-white p-1 rounded mb-1">
                              {p.jungoId}号 {getProcessName(p.processType || '')}
                              {p.storageType && <span className="ml-1">{p.storageType === '冷蔵' ? '💧' : '🧊'}</span>}
                            </div>
                          ))
                        ) : <div className="text-gray-400">なし</div>}
                      </div>
                      <div>
                        <div className="font-bold mb-2">💧 水麹準備</div>
                        {r.shikomi.length > 0 ? (
                          r.shikomi.map((m: any, i: number) => (
                            <div key={i} className="bg-white p-1 rounded mb-1">
                              {m.jungoId}号 {m.status}
                            </div>
                          ))
                        ) : <div className="text-gray-400">なし</div>}
                      </div>
                      <div>
                        <div className="font-bold mb-2">✅ タスク</div>
                        {r.tasks.length > 0 ? (
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
        ) : (<p className="text-gray-400 text-center py-6 text-sm">記録がありません</p>)}
      </div>
    </div>
  );
}