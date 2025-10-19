import { useState, useRef, useMemo } from 'react';
import type { MoromiData, JosoHyoka, Staff } from '../utils/types';

interface JosoHyokaProps {
  moromiData: MoromiData[];
  josoHyokaList: JosoHyoka[];
  staffList: Staff[];
  saveJosoHyoka: (hyoka: Omit<JosoHyoka, 'createdAt' | 'updatedAt'>) => Promise<void>;
  currentBY: number;
}

export default function JosoHyokaComponent({ 
  moromiData, 
  josoHyokaList, 
  staffList, 
  saveJosoHyoka,
  currentBY 
}: JosoHyokaProps) {
  const [localUpdates, setLocalUpdates] = useState<Map<string, Partial<JosoHyoka>>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // アクティブな従業員のみフィルタ
  const activeStaff = useMemo(() => 
    staffList.filter(s => s.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [staffList]
  );

  // 順号でソート済みのもろみデータ
  const sortedMoromi = useMemo(() => 
    [...moromiData].sort((a, b) => parseInt(a.jungoId) - parseInt(b.jungoId)),
    [moromiData]
  );

  // 上槽評価データを取得
  const getHyoka = (jungoId: string): JosoHyoka => {
    const key = `${currentBY}-${jungoId}`;
    const localUpdate = localUpdates.get(key);
    const existing = josoHyokaList.find(h => h.by === currentBY && h.jungoId === jungoId);
    
    return {
      by: currentBY,
      jungoId,
      rating: localUpdate?.rating ?? existing?.rating ?? null,
      staffComments: { ...(existing?.staffComments || {}), ...(localUpdate?.staffComments || {}) },
      createdAt: existing?.createdAt || '',
      updatedAt: existing?.updatedAt || '',
    };
  };

  // 評価を更新
  const updateRating = (jungoId: string, rating: 'S' | 'A' | 'B' | 'C' | 'D' | null) => {
    const key = `${currentBY}-${jungoId}`;
    
    setLocalUpdates(prev => {
      const newMap = new Map(prev);
      const existing = prev.get(key) || {};
      newMap.set(key, { ...existing, rating });
      return newMap;
    });

    const existingTimer = debounceTimers.current.get(`rating-${key}`);
    if (existingTimer) clearTimeout(existingTimer);

    const newTimer = setTimeout(async () => {
      const hyoka = getHyoka(jungoId);
      await saveJosoHyoka({
        by: currentBY,
        jungoId,
        rating,
        staffComments: hyoka.staffComments,
      });
      debounceTimers.current.delete(`rating-${key}`);
    }, 1500);

    debounceTimers.current.set(`rating-${key}`, newTimer);
  };

  // コメントを更新
  const updateComment = (jungoId: string, staffId: string, comment: string) => {
    const key = `${currentBY}-${jungoId}`;
    
    setLocalUpdates(prev => {
      const newMap = new Map(prev);
      const existing = prev.get(key) || {};
      const existingComments = existing.staffComments || {};
      newMap.set(key, { 
        ...existing, 
        staffComments: { ...existingComments, [staffId]: comment }
      });
      return newMap;
    });

    const existingTimer = debounceTimers.current.get(`comment-${key}-${staffId}`);
    if (existingTimer) clearTimeout(existingTimer);

    const newTimer = setTimeout(async () => {
      const hyoka = getHyoka(jungoId);
      await saveJosoHyoka({
        by: currentBY,
        jungoId,
        rating: hyoka.rating,
        staffComments: { ...hyoka.staffComments, [staffId]: comment },
      });
      debounceTimers.current.delete(`comment-${key}-${staffId}`);
    }, 1500);

    debounceTimers.current.set(`comment-${key}-${staffId}`, newTimer);
  };

  // onBlurで即座に保存
  const handleRatingBlur = async (jungoId: string) => {
    const key = `${currentBY}-${jungoId}`;
    const existingTimer = debounceTimers.current.get(`rating-${key}`);
    if (existingTimer) {
      clearTimeout(existingTimer);
      debounceTimers.current.delete(`rating-${key}`);
    }
    
    const hyoka = getHyoka(jungoId);
    await saveJosoHyoka({
      by: currentBY,
      jungoId,
      rating: hyoka.rating,
      staffComments: hyoka.staffComments,
    });
  };

  const handleCommentBlur = async (jungoId: string, staffId: string) => {
    const key = `${currentBY}-${jungoId}`;
    const existingTimer = debounceTimers.current.get(`comment-${key}-${staffId}`);
    if (existingTimer) {
      clearTimeout(existingTimer);
      debounceTimers.current.delete(`comment-${key}-${staffId}`);
    }
    
    const hyoka = getHyoka(jungoId);
    await saveJosoHyoka({
      by: currentBY,
      jungoId,
      rating: hyoka.rating,
      staffComments: hyoka.staffComments,
    });
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold">上槽評価</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold border-r">順号</th>
                <th className="px-4 py-3 text-left text-sm font-bold border-r">仕込規模</th>
                <th className="px-4 py-3 text-left text-sm font-bold border-r">仕込区分</th>
                <th className="px-4 py-3 text-left text-sm font-bold border-r">備考</th>
                <th className="px-4 py-3 text-left text-sm font-bold border-r">上槽日</th>
                <th className="px-4 py-3 text-center text-sm font-bold border-r w-24">評価</th>
                {activeStaff.map(staff => (
                  <th key={staff.id} className="px-4 py-3 text-left text-sm font-bold border-r min-w-[200px]">
                    {staff.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMoromi.map((moromi) => {
                const hyoka = getHyoka(moromi.jungoId);
                
                return (
                  <tr key={moromi.jungoId} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold border-r">{moromi.jungoId}号</td>
                    <td className="px-4 py-3 border-r">{moromi.brewingSize}kg</td>
                    <td className="px-4 py-3 border-r">{moromi.brewingCategory}</td>
                    <td className="px-4 py-3 border-r text-sm">{moromi.memo || '-'}</td>
                    <td className="px-4 py-3 border-r">{moromi.josoDate.substring(5)}</td>
                    <td className="px-2 py-2 border-r">
  <select
  value={hyoka.rating || ''}
  onChange={(e) => {
    const value = e.target.value;
    updateRating(
      moromi.jungoId, 
      value === '' ? null : value as 'S' | 'A' | 'B' | 'C' | 'D'
    );
  }}
  onBlur={() => handleRatingBlur(moromi.jungoId)}
  className="w-16 px-2 py-1 border rounded text-center font-bold text-sm"
>
  <option value="">-</option>
  <option value="S">S</option>
  <option value="A">A</option>
  <option value="B">B</option>
  <option value="C">C</option>
  <option value="D">D</option>
</select>
</td>
{activeStaff.map(staff => (
  <td key={staff.id} className="px-2 py-2 border-r">
    <textarea
      value={hyoka.staffComments[staff.id] || ''}
      onChange={(e) => updateComment(moromi.jungoId, staff.id, e.target.value)}
      onBlur={() => handleCommentBlur(moromi.jungoId, staff.id)}
      placeholder="コメント入力（100文字）"
      maxLength={100}
      rows={4}
      className="w-full px-2 py-1 text-xs border rounded resize-none leading-tight"
    />
  </td>
))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}