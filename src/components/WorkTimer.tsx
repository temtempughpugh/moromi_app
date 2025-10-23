// src/components/WorkTimer.tsx

import { useState, useEffect, useMemo } from 'react';
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
  
  // ✅ Date型でcurrentDateを管理
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // ✅ 記録をローカルstateで管理（削除されない）
  const [allRecords, setAllRecords] = useState<WorkTimeRecord[]>([]);
  
  // 各作業タイプごとのタイマー状態
  const [morningStartTime, setMorningStartTime] = useState<string | null>(null);
  const [koshikiStartTime, setKoshikiStartTime] = useState<string | null>(null);
  const [kasuStartTime, setKasuStartTime] = useState<string | null>(null);
  
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

  // ✅ 文字列形式の日付を取得（データ取得や保存に使用）
  const currentDateStr = useMemo(() => {
    return currentDate.toISOString().split('T')[0];
  }, [currentDate]);

  // ✅ 初回マウント時にSupabaseから全記録を直接取得
  useEffect(() => {
    const loadAllRecords = async () => {
      try {
        // Supabaseから全期間の記録を取得
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase
          .from('work_time_records')
          .select('id, date, work_type, staff_names, start_time, stop_time, total_seconds, dekoji, shikomi, tasks, created_at, updated_at')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.error('全記録取得エラー:', error);
          return;
        }

        if (data) {
          const records: WorkTimeRecord[] = data.map(row => ({
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
          setAllRecords(records);
        }
      } catch (error) {
        console.error('記録読み込みエラー:', error);
      }
    };
    loadAllRecords();
  }, []); // 初回のみ実行

  // 記録をタイプ別に分類（allRecordsから）
  const morningRecords = allRecords.filter((r: WorkTimeRecord) => r.workType === 'morning');
  const koshikiRecords = allRecords.filter((r: WorkTimeRecord) => r.workType === 'koshiki');
  const kasuRecords = allRecords.filter((r: WorkTimeRecord) => r.workType === 'kasu');

  // ✅ 早番スタッフを取得（useMemoで依存関係管理）
  const earlyStaff = useMemo((): Staff[] => {
    const todayShifts = shifts.filter(s => 
      s.date === currentDateStr && 
      s.shiftType === 'early' && 
      s.workHours !== null
    );
    return todayShifts
      .map(s => staffList.find(staff => staff.id === s.staffId))
      .filter((staff): staff is Staff => staff !== undefined);
  }, [shifts, staffList, currentDateStr]);

  const activeStaffList = staffList.filter(s => s.isActive);

  // ✅ 前日の出麹を取得（useMemoで依存関係管理）
  const yesterdayDekoji = useMemo(() => {
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
  }, [moromiProcesses, currentDate, currentBY]);

  // ✅ 本日の仲・留仕込みを取得（useMemoで依存関係管理）
  const todayShikomi = useMemo(() => {
    return moromiData.filter(m => {
      if (m.by !== currentBY) return false;
      return m.nakaShikomiDate === currentDateStr || m.tomeShikomiDate === currentDateStr;
    }).map(m => ({
      ...m,
      status: m.nakaShikomiDate === currentDateStr ? '仲' : '留'
    }));
  }, [moromiData, currentDateStr, currentBY]);

  // ✅ 本日のタスクを取得（useMemoで依存関係管理）
  const todayTasksList = useMemo(() => {
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const taskList: string[] = [];

    moromiData.forEach(m => {
      if (m.by !== currentBY) return;
      
      // タンク洗い（翌日がモト卸し）
      if (m.motoOroshiDate === tomorrowStr) {
        const tankId = m.soeTankId || m.tankNo;
        const tankType = m.soeTankId ? '添タンク' : '仕込みタンク';
        taskList.push(`タンク洗い(${tankType}): ${m.jungoId}号 No.${tankId}`);
      }
      
      // タンクに湯（当日がモト卸し）
      if (m.motoOroshiDate === currentDateStr) {
        const tankId = m.soeTankId || m.tankNo;
        const tankType = m.soeTankId ? '添タンク' : '仕込みタンク';
        taskList.push(`タンクに湯(${tankType}): ${m.jungoId}号 No.${tankId}`);
      }
      
      // タンクに湯（当日が打ち込み日 かつ 添タンクがある場合は仕込みタンクに湯）
      if (m.uchikomiDate === currentDateStr && m.soeTankId) {
        taskList.push(`タンクに湯(仕込みタンク): ${m.jungoId}号 No.${m.tankNo}`);
      }
      
      // マット洗い
      if (m.josoDate === tomorrowStr) {
        taskList.push(`マット洗い: ${m.jungoId}号 No.${m.tankNo}`);
      }
    });

    return taskList;
  }, [moromiData, currentDate, currentBY, currentDateStr]);

  const getProcessName = (processType: string): string => {
    const map: { [key: string]: string } = {
      'motoKoji': 'モト麹', 'soeKoji': '初麹', 'nakaKoji': '仲麹', 'tomeKoji': '留麹'
    };
    return map[processType] || processType;
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h${m}m`;
  };

  const formatTimeOnly = (timeStr: string): string => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDisplayDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  // 午前作業のハンドラー
  const handleMorningStart = () => {
    const now = new Date().toISOString();
    setMorningStartTime(now);
  };

  const handleMorningStop = async () => {
    if (!morningStartTime) return;
    
    const now = new Date().toISOString();
    
    const start = new Date(morningStartTime).getTime();
    const stop = new Date(now).getTime();
    const totalSeconds = Math.floor((stop - start) / 1000);
    
    const record: Omit<WorkTimeRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date: currentDateStr,
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
      
      // Supabaseから最新の1件を取得してallRecordsに追加
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('work_time_records')
        .select('*')
        .eq('date', currentDateStr)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const newRecord: WorkTimeRecord = {
          id: data[0].id,
          date: data[0].date,
          workType: data[0].work_type || 'morning',
          staffNames: data[0].staff_names || '',
          startTime: data[0].start_time || '',
          stopTime: data[0].stop_time || '',
          totalSeconds: data[0].total_seconds || 0,
          dekoji: data[0].dekoji,
          shikomi: data[0].shikomi,
          tasks: data[0].tasks,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
        };
        setAllRecords(prev => [newRecord, ...prev]);
      }
      
      setMorningStartTime(null);
    } catch (error) {
      console.error('午前作業記録保存エラー:', error);
      alert('記録の保存に失敗しました');
    }
  };

  // 甑準備作業のハンドラー
  const handleKoshikiStart = () => {
    const now = new Date().toISOString();
    setKoshikiStartTime(now);
  };

  const handleKoshikiStop = async () => {
    if (!koshikiStartTime) return;
    
    const now = new Date().toISOString();
    
    const start = new Date(koshikiStartTime).getTime();
    const stop = new Date(now).getTime();
    const totalSeconds = Math.floor((stop - start) / 1000);
    
    const record: Omit<WorkTimeRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date: currentDateStr,
      workType: 'koshiki',
      staffNames: koshikiSelectedStaff.join('、') || '未設定',
      startTime: koshikiStartTime,
      stopTime: now,
      totalSeconds: totalSeconds
    };
    
    try {
      await dataContext.saveWorkTimeRecord(record);
      
      // Supabaseから最新の1件を取得してallRecordsに追加
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('work_time_records')
        .select('*')
        .eq('date', currentDateStr)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const newRecord: WorkTimeRecord = {
          id: data[0].id,
          date: data[0].date,
          workType: data[0].work_type || 'koshiki',
          staffNames: data[0].staff_names || '',
          startTime: data[0].start_time || '',
          stopTime: data[0].stop_time || '',
          totalSeconds: data[0].total_seconds || 0,
          dekoji: data[0].dekoji,
          shikomi: data[0].shikomi,
          tasks: data[0].tasks,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
        };
        setAllRecords(prev => [newRecord, ...prev]);
      }
      
      setKoshikiStartTime(null);
    } catch (error) {
      console.error('甑準備作業記録保存エラー:', error);
      alert('記録の保存に失敗しました');
    }
  };

  // 粕取り作業のハンドラー
  const handleKasuStart = () => {
    const now = new Date().toISOString();
    setKasuStartTime(now);
  };

  const handleKasuStop = async () => {
    if (!kasuStartTime) return;
    
    const now = new Date().toISOString();
    
    const start = new Date(kasuStartTime).getTime();
    const stop = new Date(now).getTime();
    const totalSeconds = Math.floor((stop - start) / 1000);
    
    const record: Omit<WorkTimeRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      date: currentDateStr,
      workType: 'kasu',
      staffNames: kasuSelectedStaff.join('、') || '未設定',
      startTime: kasuStartTime,
      stopTime: now,
      totalSeconds: totalSeconds
    };
    
    try {
      await dataContext.saveWorkTimeRecord(record);
      
      // Supabaseから最新の1件を取得してallRecordsに追加
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('work_time_records')
        .select('*')
        .eq('date', currentDateStr)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const newRecord: WorkTimeRecord = {
          id: data[0].id,
          date: data[0].date,
          workType: data[0].work_type || 'kasu',
          staffNames: data[0].staff_names || '',
          startTime: data[0].start_time || '',
          stopTime: data[0].stop_time || '',
          totalSeconds: data[0].total_seconds || 0,
          dekoji: data[0].dekoji,
          shikomi: data[0].shikomi,
          tasks: data[0].tasks,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at,
        };
        setAllRecords(prev => [newRecord, ...prev]);
      }
      
      setKasuStartTime(null);
    } catch (error) {
      console.error('粕取り作業記録保存エラー:', error);
      alert('記録の保存に失敗しました');
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('この記録を削除しますか?')) return;
    await dataContext.deleteWorkTimeRecord(recordId, currentDateStr);
    // allRecordsからも削除
    setAllRecords(prev => prev.filter(r => r.id !== recordId));
  };

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">⏱️ 作業タイム測定</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ← 戻る
        </button>
      </div>

      {/* 日付ナビゲーション */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => changeDate(-1)}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            ← 前日
          </button>
          <div className="text-xl font-bold">{formatDisplayDate(currentDate)}</div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            今日
          </button>
          <button
            onClick={() => changeDate(1)}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            翌日 →
          </button>
        </div>
      </div>

      {/* 午前作業 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">午前作業</h2>
          <button
            onClick={() => setMorningExpanded(!morningExpanded)}
            className="text-blue-600 hover:text-blue-800"
          >
            {morningExpanded ? '▼ 閉じる' : '▶ 開く'}
          </button>
        </div>

        {morningExpanded && (
          <div>
            {/* 早番スタッフ */}
            <div className="mb-3 p-2 bg-gray-50 rounded">
              <span className="font-bold text-sm mr-3">早番スタッフ</span>
              {earlyStaff.length > 0 ? (
                earlyStaff.map((staff, idx) => (
                  <span key={staff.id}>
                    {staff.name}
                    {idx < earlyStaff.length - 1 ? '、' : ''}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">未設定</span>
              )}
            </div>

            {/* 本日の内容 */}
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="font-bold text-sm mb-2">本日の内容</div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                {/* 出麹 */}
                <div>
                  <div className="font-semibold mb-1">🌾 出麹（前日）</div>
                  {yesterdayDekoji.length > 0 ? (
                    yesterdayDekoji.map((koji, i) => (
                      <div key={i} className="mb-0.5">
                        {koji.jungoId}号 {getProcessName(koji.processType || '')}
                        {koji.storageType && ` ${koji.storageType}`}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">なし</div>
                  )}
                </div>

                {/* 仕込み */}
                <div>
                  <div className="font-semibold mb-1">🍚 本日の仕込み</div>
                  {todayShikomi.length > 0 ? (
                    todayShikomi.map((m, i) => (
                      <div key={i} className="mb-0.5">
                        {m.jungoId}号 {m.status} {m.brewingSize}kg No.{m.tankNo}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">なし</div>
                  )}
                </div>

                {/* タスク */}
                <div>
                  <div className="font-semibold mb-1">✅ 本日のタスク</div>
                  {todayTasksList.length > 0 ? (
                    todayTasksList.map((task, i) => (
                      <div key={i} className="mb-0.5">• {task}</div>
                    ))
                  ) : (
                    <div className="text-gray-500">なし</div>
                  )}
                </div>
              </div>
            </div>

            {/* タイマー */}
            <div className="flex items-center gap-4 mb-4">
              {!morningStartTime ? (
                <button
                  onClick={handleMorningStart}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                  disabled={earlyStaff.length === 0}
                >
                  START
                </button>
              ) : (
                <>
                  <div className="text-sm">
                    <span className="text-gray-600">開始:</span>
                    <span className="ml-2 font-mono text-lg">{formatTimeOnly(morningStartTime)}</span>
                  </div>
                  <button
                    onClick={handleMorningStop}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                  >
                    STOP
                  </button>
                </>
              )}
            </div>

            {/* 記録一覧 */}
            <div className="mt-4">
              <h3 className="font-bold mb-2">記録一覧</h3>
              {morningRecords.length > 0 ? (
                <div className="space-y-1">
                  {morningRecords.map((record, idx) => (
                    <div key={record.id} className="border rounded bg-gray-50">
                      {/* コンパクト表示行 */}
                      <div 
                        className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-100"
                        onClick={() => setMorningExpandedRecordIndex(morningExpandedRecordIndex === idx ? null : idx)}
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-semibold">{record.staffNames}</span>
                          <span className="text-xs text-gray-500">{formatDisplayDate(new Date(record.date))}</span>
                          <span className="text-gray-600">{formatTimeOnly(record.startTime)} - {formatTimeOnly(record.stopTime)}</span>
                          <span className="font-mono text-gray-700">{formatTime(record.totalSeconds)}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            record.id && handleDeleteRecord(record.id);
                          }}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                        >
                          削除
                        </button>
                      </div>
                      
                      {/* 展開詳細 - 横並び3列 */}
                      {morningExpandedRecordIndex === idx && record.dekoji && record.shikomi && record.tasks && (
                        <div className="px-2 pb-2 pt-1 border-t">
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            {/* 出麹 */}
                            <div>
                              <div className="font-semibold mb-0.5">🌾 出麹（前日）</div>
                              {record.dekoji.length > 0 ? (
                                record.dekoji.map((koji: any, i: number) => (
                                  <div key={i}>{koji.jungoId}号 {getProcessName(koji.processType || '')} {koji.storageType}</div>
                                ))
                              ) : (
                                <div className="text-gray-500">なし</div>
                              )}
                            </div>

                            {/* 仕込み */}
                            <div>
                              <div className="font-semibold mb-0.5">🍚 本日の仕込み</div>
                              {record.shikomi.length > 0 ? (
                                record.shikomi.map((m: any, i: number) => (
                                  <div key={i}>{m.jungoId}号 {m.status} {m.brewingSize}kg No.{m.tankNo}</div>
                                ))
                              ) : (
                                <div className="text-gray-500">なし</div>
                              )}
                            </div>

                            {/* タスク */}
                            <div>
                              <div className="font-semibold mb-0.5">✅ 本日のタスク</div>
                              {record.tasks.length > 0 ? (
                                record.tasks.map((task: string, i: number) => (
                                  <div key={i}>• {task}</div>
                                ))
                              ) : (
                                <div className="text-gray-500">なし</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">記録なし</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 甑準備 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">甑準備</h2>
          <button
            onClick={() => setKoshikiExpanded(!koshikiExpanded)}
            className="text-blue-600 hover:text-blue-800"
          >
            {koshikiExpanded ? '▼ 閉じる' : '▶ 開く'}
          </button>
        </div>

        {koshikiExpanded && (
          <div>
            {/* スタッフ選択 */}
            <div className="mb-4">
              <div className="relative">
                <button
                  onClick={() => setKoshikiDropdownOpen(!koshikiDropdownOpen)}
                  className="w-full px-4 py-2 border rounded bg-white text-left flex justify-between items-center"
                >
                  <span>
                    {koshikiSelectedStaff.length > 0 
                      ? koshikiSelectedStaff.join('、') 
                      : 'スタッフを選択'}
                  </span>
                  <span>▼</span>
                </button>
                
                {koshikiDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                    {activeStaffList.map(staff => (
                      <label key={staff.id} className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={koshikiSelectedStaff.includes(staff.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setKoshikiSelectedStaff([...koshikiSelectedStaff, staff.name]);
                            } else {
                              setKoshikiSelectedStaff(koshikiSelectedStaff.filter(n => n !== staff.name));
                            }
                          }}
                          className="mr-2"
                        />
                        {staff.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* タイマー */}
            <div className="flex items-center gap-4 mb-4">
              {!koshikiStartTime ? (
                <button
                  onClick={handleKoshikiStart}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                >
                  START
                </button>
              ) : (
                <>
                  <div className="text-sm">
                    <span className="text-gray-600">開始:</span>
                    <span className="ml-2 font-mono text-lg">{formatTimeOnly(koshikiStartTime)}</span>
                  </div>
                  <button
                    onClick={handleKoshikiStop}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                  >
                    STOP
                  </button>
                </>
              )}
            </div>

            {/* 記録一覧 */}
            <div className="mt-4">
              <h3 className="font-bold mb-2">記録一覧</h3>
              {koshikiRecords.length > 0 ? (
                <div className="space-y-1">
                  {koshikiRecords.map(record => (
                    <div key={record.id} className="border rounded bg-gray-50 p-2 flex justify-between items-center hover:bg-gray-100">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold">{record.staffNames}</span>
                        <span className="text-xs text-gray-500">{formatDisplayDate(new Date(record.date))}</span>
                        <span className="text-gray-600">{formatTimeOnly(record.startTime)} - {formatTimeOnly(record.stopTime)}</span>
                        <span className="font-mono text-gray-700">{formatTime(record.totalSeconds)}</span>
                      </div>
                      <button
                        onClick={() => record.id && handleDeleteRecord(record.id)}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">記録なし</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 粕取り */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">粕取り</h2>
          <button
            onClick={() => setKasuExpanded(!kasuExpanded)}
            className="text-blue-600 hover:text-blue-800"
          >
            {kasuExpanded ? '▼ 閉じる' : '▶ 開く'}
          </button>
        </div>

        {kasuExpanded && (
          <div>
            {/* スタッフ選択 */}
            <div className="mb-4">
              <div className="relative">
                <button
                  onClick={() => setKasuDropdownOpen(!kasuDropdownOpen)}
                  className="w-full px-4 py-2 border rounded bg-white text-left flex justify-between items-center"
                >
                  <span>
                    {kasuSelectedStaff.length > 0 
                      ? kasuSelectedStaff.join('、') 
                      : 'スタッフを選択'}
                  </span>
                  <span>▼</span>
                </button>
                
                {kasuDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                    {activeStaffList.map(staff => (
                      <label key={staff.id} className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={kasuSelectedStaff.includes(staff.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setKasuSelectedStaff([...kasuSelectedStaff, staff.name]);
                            } else {
                              setKasuSelectedStaff(kasuSelectedStaff.filter(n => n !== staff.name));
                            }
                          }}
                          className="mr-2"
                        />
                        {staff.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* タイマー */}
            <div className="flex items-center gap-4 mb-4">
              {!kasuStartTime ? (
                <button
                  onClick={handleKasuStart}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                >
                  START
                </button>
              ) : (
                <>
                  <div className="text-sm">
                    <span className="text-gray-600">開始:</span>
                    <span className="ml-2 font-mono text-lg">{formatTimeOnly(kasuStartTime)}</span>
                  </div>
                  <button
                    onClick={handleKasuStop}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                  >
                    STOP
                  </button>
                </>
              )}
            </div>

            {/* 記録一覧 */}
            <div className="mt-4">
              <h3 className="font-bold mb-2">記録一覧</h3>
              {kasuRecords.length > 0 ? (
                <div className="space-y-1">
                  {kasuRecords.map(record => (
                    <div key={record.id} className="border rounded bg-gray-50 p-2 flex justify-between items-center hover:bg-gray-100">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold">{record.staffNames}</span>
                        <span className="text-xs text-gray-500">{formatDisplayDate(new Date(record.date))}</span>
                        <span className="text-gray-600">{formatTimeOnly(record.startTime)} - {formatTimeOnly(record.stopTime)}</span>
                        <span className="font-mono text-gray-700">{formatTime(record.totalSeconds)}</span>
                      </div>
                      <button
                        onClick={() => record.id && handleDeleteRecord(record.id)}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">記録なし</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}