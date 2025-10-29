import { useMemo } from 'react';
import type { MoromiData, JosoHyoka, Staff } from '../utils/types';

interface JosoCommentAlertProps {
  moromiData: MoromiData[];
  josoHyokaList: JosoHyoka[];
  staffList: Staff[];
  currentBY: number;
  onClose: () => void;
}

export default function JosoCommentAlert({
  moromiData,
  josoHyokaList,
  staffList,
  currentBY,
  onClose,
}: JosoCommentAlertProps) {
  
  const getHyoka = (jungoId: string): JosoHyoka => {
    const existing = josoHyokaList.find(h => h.by === currentBY && h.jungoId === jungoId);
    return existing || {
      by: currentBY,
      jungoId,
      rating: null,
      staffComments: {},
      ratingComment: '',  
      createdAt: '',
      updatedAt: '',
    };
  };

  // コメント未提出のスタッフごとにもろみをグルーピング
  const incompleteMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeStaff = staffList.filter(s => s.isActive && s.name !== '相原');
    
    moromiData.forEach(moromi => {
      const josoDate = new Date(moromi.josoDate);
      josoDate.setHours(0, 0, 0, 0);
      
      // 上槽日が今日より後なら対象外
      if (josoDate > today) return;
      
      const hyoka = getHyoka(moromi.jungoId);
      
      // コメントが空のスタッフを確認
      activeStaff.forEach(staff => {
        if (!hyoka.staffComments[staff.id]?.trim()) {
          const existing = map.get(staff.name) || [];
          existing.push(moromi.jungoId);
          map.set(staff.name, existing);
        }
      });
    });
    
    return map;
  }, [moromiData, josoHyokaList, staffList, currentBY]);

  // 未提出がない場合は表示しない
  if (incompleteMap.size === 0) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
      >
        ×
      </button>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-bold text-red-800">上槽コメントを提出してください</h3>
          <div className="mt-2 text-sm text-red-700 space-y-1">
            {Array.from(incompleteMap.entries()).map(([staffName, jungoIds]) => (
              <div key={staffName}>
                <span className="font-semibold">"{staffName}"</span>{' '}
                {jungoIds.map((id, idx) => (
                  <span key={id}>
                    {id}号{idx < jungoIds.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  
}