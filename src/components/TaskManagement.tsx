import { useState } from 'react';
import type { TaskManagement, OverdueTask } from '../utils/types';

interface TaskManagementProps {
  dataContext: any;
  onClose: () => void;
}

export default function TaskManagement({ dataContext, onClose }: TaskManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<TaskManagement | null>(null);
  const [newTask, setNewTask] = useState({
    taskName: '',
    lastCompletedDate: '',
    cycleDays: 7
  });

  const handleAdd = async () => {
    if (!newTask.taskName || !newTask.lastCompletedDate) {
      alert('タスク名と最終完了日を入力してください');
      return;
    }

    try {
      await dataContext.addTask(newTask);
      setNewTask({ taskName: '', lastCompletedDate: '', cycleDays: 7 });
      setIsAdding(false);
    } catch (error) {
      console.error('タスク追加エラー:', error);
      alert('タスクの追加に失敗しました');
    }
  };

  const handleUpdate = async (task: TaskManagement) => {
    if (!task.taskName || !task.lastCompletedDate) {
      alert('タスク名と最終完了日を入力してください');
      return;
    }

    try {
      await dataContext.updateTask(task.id!, {
        taskName: task.taskName,
        lastCompletedDate: task.lastCompletedDate,
        cycleDays: task.cycleDays
      });
      setEditingId(null);
      setEditingTask(null);
    } catch (error) {
      console.error('タスク更新エラー:', error);
      alert('タスクの更新に失敗しました');
    }
  };

  const startEdit = (task: TaskManagement) => {
    setEditingId(task.id!);
    setEditingTask({ ...task });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTask(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このタスクを削除しますか？')) return;

    try {
      await dataContext.deleteTask(id);
    } catch (error) {
      console.error('タスク削除エラー:', error);
      alert('タスクの削除に失敗しました');
    }
  };

  const handleComplete = async (task: TaskManagement) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await dataContext.updateTask(task.id!, {
        lastCompletedDate: today
      });
    } catch (error) {
      console.error('タスク完了エラー:', error);
      alert('タスクの完了処理に失敗しました');
    }
  };

  const getStatusColor = (task: TaskManagement) => {
    const lastDate = new Date(task.lastCompletedDate);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (elapsedDays > task.cycleDays) {
      return 'bg-red-50 border-red-200';
    } else if (elapsedDays > task.cycleDays * 0.8) {
      return 'bg-yellow-50 border-yellow-200';
    }
    return 'bg-green-50 border-green-200';
  };

  const getElapsedDays = (lastCompletedDate: string) => {
    const lastDate = new Date(lastCompletedDate);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">📋 タスク管理</h2>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            ✕ 閉じる
          </button>
        </div>

        <div className="p-6">
          {/* 期限切れアラート */}
          {dataContext.overdueTasks && dataContext.overdueTasks.length > 0 && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center">
                <span className="mr-2">⚠️</span>
                期限切れタスク（{dataContext.overdueTasks.length}件）
              </h3>
              <div className="space-y-2">
                {dataContext.overdueTasks.map((task: OverdueTask) => (
                  <div key={task.id} className="bg-white p-3 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-red-700">{task.taskName}</span>
                        <span className="ml-3 text-sm text-gray-600">
                          サイクル: {task.cycleDays}日 / 経過: <span className="font-bold text-red-600">{task.elapsedDays}日</span>
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const fullTask = dataContext.tasks.find((t: TaskManagement) => t.id === task.id);
                          if (fullTask) handleComplete(fullTask);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                      >
                        ✓ 完了
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 新規追加ボタン */}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="mb-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
            >
              ➕ 新規タスク追加
            </button>
          )}

          {/* 新規追加フォーム */}
          {isAdding && (
            <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h3 className="text-lg font-bold text-blue-700 mb-3">新規タスク追加</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">タスク名</label>
                  <input
                    type="text"
                    value={newTask.taskName}
                    onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: タンク洗浄"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">最終完了日</label>
                  <input
                    type="date"
                    value={newTask.lastCompletedDate}
                    onChange={(e) => setNewTask({ ...newTask, lastCompletedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">サイクル（日数）</label>
                  <input
                    type="number"
                    value={newTask.cycleDays}
                    onChange={(e) => setNewTask({ ...newTask, cycleDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewTask({ taskName: '', lastCompletedDate: '', cycleDays: 7 });
                  }}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* タスク一覧 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-800 mb-3">タスク一覧</h3>
            {dataContext.tasks && dataContext.tasks.length > 0 ? (
              dataContext.tasks.map((task: TaskManagement) => {
                const elapsedDays = getElapsedDays(task.lastCompletedDate);
                const remainingDays = task.cycleDays - elapsedDays;
                const isOverdue = remainingDays < 0;

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border-2 ${getStatusColor(task)} transition-all`}
                  >
                    {editingId === task.id ? (
                      // 編集モード
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">タスク名</label>
                            <input
                              type="text"
                              value={editingTask?.taskName || ''}
                              onChange={(e) => setEditingTask({ ...editingTask!, taskName: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">最終完了日</label>
                            <input
                              type="date"
                              value={editingTask?.lastCompletedDate || ''}
                              onChange={(e) => setEditingTask({ ...editingTask!, lastCompletedDate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">サイクル（日数）</label>
                            <input
                              type="number"
                              value={editingTask?.cycleDays || 7}
                              onChange={(e) => setEditingTask({ ...editingTask!, cycleDays: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="1"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(editingTask!)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 表示モード
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold text-gray-800">{task.taskName}</h4>
                            {isOverdue ? (
                              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                                期限切れ
                              </span>
                            ) : remainingDays <= task.cycleDays * 0.2 ? (
                              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
                                まもなく
                              </span>
                            ) : (
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                正常
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>最終完了日: <span className="font-semibold">{task.lastCompletedDate}</span></div>
                            <div>サイクル: <span className="font-semibold">{task.cycleDays}日</span></div>
                            <div>経過日数: <span className="font-semibold">{elapsedDays}日</span></div>
                            <div>
                              {isOverdue ? (
                                <span className="text-red-600 font-bold">期限超過: {Math.abs(remainingDays)}日</span>
                              ) : (
                                <span className={remainingDays <= task.cycleDays * 0.2 ? 'text-yellow-600 font-bold' : 'text-green-600 font-bold'}>
                                  残り: {remainingDays}日
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleComplete(task)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                          >
                            ✓ 完了
                          </button>
                          <button
                            onClick={() => startEdit(task)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(task.id!)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">タスクが登録されていません</p>
                <p className="text-sm mt-2">「新規タスク追加」ボタンからタスクを登録してください</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}