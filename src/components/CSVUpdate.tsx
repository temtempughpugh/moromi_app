import { useState } from 'react';
import { parseCSV } from '../utils/csvParser';
import type { MoromiData, MoromiProcess } from '../utils/types';

interface PreviewData {
  toUpdate: string[];
  toKeep: string[];
  updateDate: string;
}

interface CSVUpdateProps {
  getAllData: () => Promise<{ moromiData: MoromiData[]; moromiProcesses: MoromiProcess[] }>;
  saveMoromiData: (moromiDataList: MoromiData[], processList: MoromiProcess[]) => Promise<void>;
}

export default function CSVUpdate({ getAllData, saveMoromiData }: CSVUpdateProps) {
  const [updateDate, setUpdateDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [newData, setNewData] = useState<{ moromiData: MoromiData[]; moromiProcesses: MoromiProcess[] } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { moromiData, moromiProcesses } = await parseCSV(file);
      setNewData({ moromiData, moromiProcesses });

      // プレビュー作成
      const currentData = await getAllData();
      const updateDateObj = new Date(updateDate);

      const toUpdate: string[] = [];
      const toKeep: string[] = [];

      // 既存データを確認
      currentData.moromiData.forEach(m => {
        const tomeDate = new Date(m.tomeDate);
        if (tomeDate >= updateDateObj) {
          toUpdate.push(m.jungoId);
        } else {
          toKeep.push(m.jungoId);
        }
      });

      // 新規データを確認
      moromiData.forEach(m => {
        const tomeDate = new Date(m.tomeDate);
        if (tomeDate >= updateDateObj && !toUpdate.includes(m.jungoId)) {
          toUpdate.push(m.jungoId);
        }
      });

      setPreview({
        toUpdate: toUpdate.sort((a, b) => parseInt(a) - parseInt(b)),
        toKeep: toKeep.sort((a, b) => parseInt(a) - parseInt(b)),
        updateDate,
      });
    } catch (error) {
      console.error('CSV読み込みエラー:', error);
      alert('CSV読み込みに失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!newData || !preview) return;

    try {
      // 既存データを取得
      const currentData = await getAllData();
      const updateDateObj = new Date(updateDate);


      // 新しいデータから更新日以降のみ抽出
      const updatedMoromiData = newData.moromiData.filter(m => {
        const tomeDate = new Date(m.tomeDate);
        return tomeDate >= updateDateObj;
      });

      const updatedProcesses = newData.moromiProcesses.filter(p => {
        const moromi = newData.moromiData.find(m => 
          m.jungoId === p.jungoId && m.by === p.by
        );
        if (!moromi) return false;
        const tomeDate = new Date(moromi.tomeDate);
        return tomeDate >= updateDateObj;
      });

      // マージ: 既存の保持データから、新しいデータと重複するものを除外
     // 更新対象のMoromiDataのみ（手動設定を引き継ぐ）
const updatedMoromiDataWithManual = updatedMoromiData.map(csvData => {
  const existing = currentData.moromiData.find(m =>
    m.by === csvData.by && m.jungoId === csvData.jungoId
  );
  
  if (existing) {
    return {
      ...csvData,
      soeTankId: existing.soeTankId,
      kenteiTankId: existing.kenteiTankId,
    };
  }
  return csvData;
});

// 更新対象のProcessesのみ（手動設定を引き継ぐ）
const updatedProcessesWithManual = updatedProcesses.map(csvProcess => {
  const existing = currentData.moromiProcesses.find(p =>
    p.by === csvProcess.by &&
    p.jungoId === csvProcess.jungoId &&
    p.processType === csvProcess.processType &&
    p.riceType === csvProcess.riceType
  );
  
  if (existing) {
    return {
      ...csvProcess,
      predictedDekojiRate: existing.predictedDekojiRate,
      lastSheetWeight: existing.lastSheetWeight,
      actualDekojiRate: existing.actualDekojiRate,
      storageType: existing.storageType,
    };
  }
  return csvProcess;
});

// 更新対象のみsaveMoromiDataに渡す（保持対象は渡さない）
await saveMoromiData(updatedMoromiDataWithManual, updatedProcessesWithManual);
      alert(`データを更新しました\n更新: ${preview.toUpdate.length}件\n保持: ${preview.toKeep.length}件`);
      setPreview(null);
      setNewData(null);
    } catch (error) {
      console.error('更新エラー:', error);
      alert('データ更新に失敗しました');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">CSV更新</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">更新日</label>
            <input
              type="date"
              value={updateDate}
              onChange={(e) => setUpdateDate(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
            <p className="text-sm text-gray-600 mt-1">
              この日付以降に留日があるもろみを更新対象とします
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              CSVファイルを選択
            </label>
            <p className="mt-4 text-gray-600">Book1.csv を選択してください</p>
          </div>
        </div>
      </div>

      {preview && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">更新プレビュー</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border rounded p-4">
              <h4 className="font-bold mb-2 text-green-700">保持対象（{preview.toKeep.length}件）</h4>
              <p className="text-sm text-gray-600 mb-2">
                {preview.updateDate} より前
              </p>
              <div className="text-sm">
                {preview.toKeep.length > 0 ? preview.toKeep.join(', ') : 'なし'}
              </div>
            </div>
            <div className="border rounded p-4">
              <h4 className="font-bold mb-2 text-red-700">更新対象（{preview.toUpdate.length}件）</h4>
              <p className="text-sm text-gray-600 mb-2">
                {preview.updateDate} 以降
              </p>
              <div className="text-sm">
                {preview.toUpdate.length > 0 ? preview.toUpdate.join(', ') : 'なし'}
              </div>
            </div>
          </div>
          <button
            onClick={handleUpdate}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold"
          >
            この内容で更新
          </button>
        </div>
      )}
    </div>
  );
}