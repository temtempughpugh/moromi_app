import { useState } from 'react';
import type { Staff, WeeklyDutyAction } from '../utils/types';

interface WeeklyDutyActionsProps {
  staffList: Staff[];
  loadWeeklyDutyActionsByStaff: (staffId: string) => Promise<WeeklyDutyAction[]>;
  saveWeeklyDutyAction: (action: Omit<WeeklyDutyAction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteWeeklyDutyAction: (id: number) => Promise<void>;
  getCurrentDuty: (date: Date) => Staff | null;
}

export default function WeeklyDutyActions({
  staffList,
  loadWeeklyDutyActionsByStaff,
  saveWeeklyDutyAction,
  deleteWeeklyDutyAction,
  getCurrentDuty,
}: WeeklyDutyActionsProps) {
  const [currentAction, setCurrentAction] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [staffActions, setStaffActions] = useState<Record<string, WeeklyDutyAction[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 選択した日付の週番を取得
  const currentDutyStaff = getCurrentDuty(new Date(selectedDate));

  // スタッフのアクション履歴を読み込む
  const loadStaffActions = async (staffId: string) => {
    if (staffActions[staffId]) return; // 既に読み込み済み
    
    try {
      const actions = await loadWeeklyDutyActionsByStaff(staffId);
      setStaffActions(prev => ({ ...prev, [staffId]: actions }));
    } catch (error) {
      console.error('アクション読み込みエラー:', error);
    }
  };

  // スタッフ名を展開/折りたたみ
  const toggleStaffExpansion = async (staffId: string) => {
    if (expandedStaff === staffId) {
      setExpandedStaff(null);
    } else {
      setExpandedStaff(staffId);
      await loadStaffActions(staffId);
    }
  };

  // アクションを保存
  const handleSaveAction = async () => {
    if (!currentDutyStaff) {
      alert('週番が設定されていません');
      return;
    }

    if (!currentAction.trim()) {
      alert('アクションを入力してください');
      return;
    }

    if (currentAction.length > 200) {
      alert('アクションは200文字以内で入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await saveWeeklyDutyAction({
        staffId: currentDutyStaff.id,
        date: selectedDate,
        action: currentAction.trim(),
      });
      setCurrentAction('');
      
      // 保存したスタッフのアクションを再読み込み
      const actions = await loadWeeklyDutyActionsByStaff(currentDutyStaff.id);
      setStaffActions(prev => ({ ...prev, [currentDutyStaff.id]: actions }));
      
      alert('保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // アクションを削除
  const handleDeleteAction = async (actionId: number, staffId: string) => {
    if (!confirm('このアクションを削除してもよろしいですか？')) return;

    try {
      await deleteWeeklyDutyAction(actionId);
      
      // 削除したスタッフのアクションを再読み込み
      const actions = await loadWeeklyDutyActionsByStaff(staffId);
      setStaffActions(prev => ({ ...prev, [staffId]: actions }));
      
      alert('削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 日付フォーマット
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">週番アクション記録</h2>

      {/* 今週の週番とアクション入力 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">日付選択</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">選択日の週番</h3>
          {currentDutyStaff ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xl font-bold text-blue-800">{currentDutyStaff.name}</p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600">週番が設定されていません</p>
            </div>
          )}
        </div>

        {currentDutyStaff && (
          <div>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">
                記録日：{formatDate(selectedDate)}
              </label>
              <label className="block text-sm font-medium mb-1">
                アクション（200文字以内）
              </label>
              <textarea
                value={currentAction}
                onChange={(e) => setCurrentAction(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="本日のアクションを入力してください"
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {currentAction.length} / 200
              </div>
            </div>
            <button
              onClick={handleSaveAction}
              disabled={isSaving || !currentAction.trim()}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        )}
      </div>

      {/* 従業員一覧とアクション履歴 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">従業員のアクション履歴</h3>
        
        {staffList.filter(s => s.isActive).length === 0 ? (
          <p className="text-gray-500">従業員が登録されていません</p>
        ) : (
          <div className="space-y-2">
            {staffList
              .filter(s => s.isActive)
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((staff) => (
                <div key={staff.id} className="border rounded-lg">
                  {/* スタッフ名（クリックで展開） */}
                  <button
                    onClick={() => toggleStaffExpansion(staff.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-lg">{staff.name}</span>
                    <span className="text-gray-500">
                      {expandedStaff === staff.id ? '▼' : '▶'}
                    </span>
                  </button>

                  {/* アクション履歴（展開時） */}
                  {expandedStaff === staff.id && (
                    <div className="px-4 pb-4 border-t">
                      {!staffActions[staff.id] ? (
                        <div className="py-4 text-center text-gray-500">
                          読み込み中...
                        </div>
                      ) : staffActions[staff.id].length === 0 ? (
                        <div className="py-4 text-center text-gray-500">
                          アクション履歴がありません
                        </div>
                      ) : (
                        <div className="space-y-3 mt-3">
                          {staffActions[staff.id].map((action) => (
                            <div
                              key={action.id}
                              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  {formatDate(action.date)}
                                </span>
                                <button
                                  onClick={() => handleDeleteAction(action.id, staff.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  削除
                                </button>
                              </div>
                              <p className="text-gray-800 whitespace-pre-wrap">
                                {action.action}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}