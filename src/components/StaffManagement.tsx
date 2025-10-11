import { useState } from 'react';
import type { Staff } from '../utils/types';

interface StaffManagementProps {
  staffList: Staff[];
  saveStaff: (staff: Omit<Staff, 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;
}

export default function StaffManagement({ staffList, saveStaff, deleteStaff }: StaffManagementProps) {
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">スタッフ管理</h2>

        {/* 新規追加 */}
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

        {/* スタッフ一覧 */}
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
    </div>
  );
}