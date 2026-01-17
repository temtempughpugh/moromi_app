import { useState } from 'react';
import type { Staff, PlusOneAction, PlusOneCategory } from '../utils/types';

interface PlusOneRecordProps {
  staffList: Staff[];
  loadPlusOneActionsByStaff: (staffId: string) => Promise<PlusOneAction[]>;
  savePlusOneAction: (action: Omit<PlusOneAction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deletePlusOneAction: (id: number) => Promise<void>;
}

// カテゴリの表示名マッピング
const CATEGORY_LABELS: Record<PlusOneCategory, string> = {
  cleaning: '清掃',
  maintenance: 'メンテナンス',
  improvement: '改善提案',
  other: 'その他',
};

// カテゴリの色マッピング
const CATEGORY_COLORS: Record<PlusOneCategory, string> = {
  cleaning: 'bg-green-100 text-green-800',
  maintenance: 'bg-blue-100 text-blue-800',
  improvement: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function PlusOneRecord({
  staffList,
  loadPlusOneActionsByStaff,
  savePlusOneAction,
  deletePlusOneAction,
}: PlusOneRecordProps) {
  const [currentAction, setCurrentAction] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<PlusOneCategory>('cleaning');
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [staffActions, setStaffActions] = useState<Record<string, PlusOneAction[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  // アクティブなスタッフのみ
  const activeStaff = staffList.filter(s => s.isActive).sort((a, b) => a.displayOrder - b.displayOrder);

  // スタッフのアクション履歴を読み込む
  const loadStaffActions = async (staffId: string) => {
    if (staffActions[staffId]) return;
    
    try {
      const actions = await loadPlusOneActionsByStaff(staffId);
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
    if (!selectedStaffId) {
      alert('報告者を選択してください');
      return;
    }

    if (!currentAction.trim()) {
      alert('記録内容を入力してください');
      return;
    }

    if (currentAction.length > 200) {
      alert('記録内容は200文字以内で入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await savePlusOneAction({
        staffId: selectedStaffId,
        date: selectedDate,
        category: selectedCategory,
        action: currentAction.trim(),
      });
      setCurrentAction('');
      
      // 保存したスタッフのアクションを再読み込み
      const actions = await loadPlusOneActionsByStaff(selectedStaffId);
      setStaffActions(prev => ({ ...prev, [selectedStaffId]: actions }));
      
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
    if (!confirm('この記録を削除してもよろしいですか？')) return;

    try {
      await deletePlusOneAction(actionId);
      
      // 削除したスタッフのアクションを再読み込み
      const actions = await loadPlusOneActionsByStaff(staffId);
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

  // 表形式のテキストをクリップボードにコピー
  const handleCopyTable = (staffId: string) => {
    const actions = staffActions[staffId];
    if (!actions || actions.length === 0) return;

    const staffName = staffList.find(s => s.id === staffId)?.name || '不明';
    const header = `${staffName}のプラスワン記録\n日付\t種類\t内容\n`;
    const rows = actions.map(a => 
      `${a.date}\t${CATEGORY_LABELS[a.category as PlusOneCategory] || 'その他'}\t${a.action}`
    ).join('\n');
    
    navigator.clipboard.writeText(header + rows)
      .then(() => alert('コピーしました'))
      .catch(() => alert('コピーに失敗しました'));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">プラスワン記録</h2>

      {/* 記録入力部分 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {/* 日付選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">日付選択</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 報告者選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">報告者</label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- スタッフを選択 --</option>
            {activeStaff.map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
        </div>

        {/* カテゴリ選択（トグルボタン） */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">記録の種類</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABELS) as PlusOneCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* 記録内容 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            記録日：{formatDate(selectedDate)}
          </label>
          <label className="block text-sm font-medium mb-1">
            記録内容（200文字以内）
          </label>
          <textarea
            value={currentAction}
            onChange={(e) => setCurrentAction(e.target.value)}
            maxLength={200}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="プラスワンの内容を入力してください"
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {currentAction.length} / 200
          </div>
        </div>

        {/* 登録ボタン */}
        <button
          onClick={handleSaveAction}
          disabled={isSaving || !currentAction.trim() || !selectedStaffId}
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {isSaving ? '保存中...' : '登録'}
        </button>
      </div>

      {/* スタッフ別履歴 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">スタッフ別履歴</h3>
        
        {activeStaff.length === 0 ? (
          <p className="text-gray-500">スタッフが登録されていません</p>
        ) : (
          <div className="space-y-2">
            {activeStaff.map((staff) => (
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
                        記録がありません
                      </div>
                    ) : (
                      <>
                        {/* コピーボタン */}
                        <div className="mt-3 mb-2 text-right">
                          <button
                            onClick={() => handleCopyTable(staff.id)}
                            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                          >
                            📋 コピー
                          </button>
                        </div>

                        {/* 表形式 */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border px-3 py-2 text-left whitespace-nowrap">日付</th>
                                <th className="border px-3 py-2 text-left whitespace-nowrap">種類</th>
                                <th className="border px-3 py-2 text-left">内容</th>
                                <th className="border px-3 py-2 text-center whitespace-nowrap">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {staffActions[staff.id].map((action) => (
                                <tr key={action.id} className="hover:bg-gray-50">
                                  <td className="border px-3 py-2 whitespace-nowrap">
                                    {action.date}
                                  </td>
                                  <td className="border px-3 py-2 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[action.category as PlusOneCategory] || CATEGORY_COLORS.other}`}>
                                      {CATEGORY_LABELS[action.category as PlusOneCategory] || 'その他'}
                                    </span>
                                  </td>
                                  <td className="border px-3 py-2 whitespace-pre-wrap">
                                    {action.action}
                                  </td>
                                  <td className="border px-3 py-2 text-center">
                                    <button
                                      onClick={() => handleDeleteAction(action.id, staff.id)}
                                      className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                      削除
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
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