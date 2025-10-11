import { useState } from 'react';
import type { Staff } from '../utils/types';

interface StaffManagementProps {
  staffList: Staff[];
  saveStaff: (staff: Omit<Staff, 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;
}

export default function StaffManagement({
  staffList,
  saveStaff,
  deleteStaff,
}: StaffManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async () => {
    if (!newStaffName.trim()) {
      alert('スタッフ名を入力してください');
      return;
    }

    const maxOrder = staffList.length > 0 
      ? Math.max(...staffList.map(s => s.displayOrder))
      : 0;

    const newStaff: Omit<Staff, 'createdAt' | 'updatedAt'> = {
      id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      displayOrder: maxOrder + 1,
      isActive: true,
    };

    try {
      await saveStaff(newStaff);
      setNewStaffName('');
      setIsAdding(false);
    } catch (error) {
      console.error('スタッフ追加エラー:', error);
      alert('追加に失敗しました');
    }
  };

  const handleEdit = async (staff: Staff) => {
    if (!editingName.trim()) {
      alert('スタッフ名を入力してください');
      return;
    }

    try {
      await saveStaff({
        ...staff,
        name: editingName.trim(),
      });
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('スタッフ編集エラー:', error);
      alert('編集に失敗しました');
    }
  };

  const handleDelete = async (staffId: string, staffName: string) => {
    if (!confirm(`${staffName}を削除しますか？\nこのスタッフのシフトデータもすべて削除されます。`)) {
      return;
    }

    try {
      await deleteStaff(staffId);
    } catch (error) {
      console.error('スタッフ削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleMoveUp = async (staff: Staff) => {
    const currentIndex = staffList.findIndex(s => s.id === staff.id);
    if (currentIndex === 0) return;

    const prevStaff = staffList[currentIndex - 1];
    
    await saveStaff({ ...staff, displayOrder: prevStaff.displayOrder });
    await saveStaff({ ...prevStaff, displayOrder: staff.displayOrder });
  };

  const handleMoveDown = async (staff: Staff) => {
    const currentIndex = staffList.findIndex(s => s.id === staff.id);
    if (currentIndex === staffList.length - 1) return;

    const nextStaff = staffList[currentIndex + 1];
    
    await saveStaff({ ...staff, displayOrder: nextStaff.displayOrder });
    await saveStaff({ ...nextStaff, displayOrder: staff.displayOrder });
  };

  return (
    <div className="mt-8 p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">スタッフ管理</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + スタッフ追加
        </button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 bg-white rounded border">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="スタッフ名"
              className="flex-1 px-3 py-2 border rounded"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              追加
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewStaffName('');
              }}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <table className="w-full bg-white rounded border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-3 text-left w-20">順序</th>
            <th className="border p-3 text-left">氏名</th>
            <th className="border p-3 text-center w-40">操作</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staff, index) => (
            <tr key={staff.id} className="hover:bg-gray-50">
              <td className="border p-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleMoveUp(staff)}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(staff)}
                    disabled={index === staffList.length - 1}
                    className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </td>
              <td className="border p-3">
                {editingId === staff.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                    onKeyDown={(e) => e.key === 'Enter' && handleEdit(staff)}
                  />
                ) : (
                  staff.name
                )}
              </td>
              <td className="border p-3 text-center">
                {editingId === staff.id ? (
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(staff)}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditingName('');
                      }}
                      className="px-3 py-1 text-sm bg-gray-300 rounded hover:bg-gray-400"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        setEditingId(staff.id);
                        setEditingName(staff.name);
                      }}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(staff.id, staff.name)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      削除
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}