// src/components/DekojiPage.tsx

import { useState, useEffect } from 'react';
import { KojiService } from '../services/KojiService';
import { updateDekojiData } from '../utils/database';
import type { MoromiProcess, DekojiLot, ShelfDistribution } from '../utils/types';

interface DekojiPageProps {
  dataContext: any;
  dekojiDate: string;
  onBack: () => void;
}

export default function DekojiPage({ dataContext, dekojiDate, onBack }: DekojiPageProps) {
  const [dekojiRate, setDekojiRate] = useState(120.0);
  const [lots, setLots] = useState<DekojiLot[]>([]);
  const [distribution, setDistribution] = useState<ShelfDistribution>({ matrix: [], columnCounts: [] });
  const [lastSheetWeight, setLastSheetWeight] = useState<string>('');
  const [actualRate, setActualRate] = useState<number | null>(null);
  const [totalRiceWeight, setTotalRiceWeight] = useState(0);
  const [totalSheetCount, setTotalSheetCount] = useState(0);

  const [isInitialized, setIsInitialized] = useState(false);
const [isSaving, setIsSaving] = useState(false);

useEffect(() => {
  if (!dekojiDate || !dataContext.moromiProcesses || isInitialized) return;

  const dekojiProcesses = dataContext.moromiProcesses.filter((p: MoromiProcess) =>
    p.dekojiDate === dekojiDate && p.processType?.includes('Koji')
  );

  if (dekojiProcesses.length === 0) {
    alert('この日の出麹作業はありません');
    onBack();
    return;
  }

  // 既存データから出麹歩合を読み込む
  const savedRate = dekojiProcesses[0]?.predictedDekojiRate;
  if (savedRate && savedRate > 0) {
    setDekojiRate(savedRate);
  }

  // 既存データから最後の1枚の重量を読み込む
  const savedWeight = dekojiProcesses[0]?.lastSheetWeight;
  if (savedWeight && savedWeight > 0) {
    setLastSheetWeight(savedWeight.toString());
  }

  // 既存データから真の出麹歩合を読み込む
  const savedActualRate = dekojiProcesses[0]?.actualDekojiRate;
  if (savedActualRate && savedActualRate > 0) {
    setActualRate(savedActualRate);
  }

  // 対応する掛米工程を取得
  const jungoIds = [...new Set(dekojiProcesses.map((p: MoromiProcess) => p.jungoId))];
  const kakeProcesses = dataContext.moromiProcesses.filter((p: MoromiProcess) =>
    jungoIds.includes(p.jungoId) && 
    (p.processType === 'motoKake' || 
     p.processType === 'soeKake' || 
     p.processType === 'nakaKake' || 
     p.processType === 'tomeKake')
  );

  calculateAll([...dekojiProcesses, ...kakeProcesses], savedRate || dekojiRate);
  setIsInitialized(true);
}, [dekojiDate, dataContext.moromiProcesses, isInitialized]);
const calculateAll = (processes: MoromiProcess[], rate: number) => {
  const calculatedLots = KojiService.calculateDistribution(processes, rate);
  const calculatedDistribution = KojiService.calculateShelfDistribution(calculatedLots);

  setLots(calculatedLots);
  setDistribution(calculatedDistribution);

  const totalRice = calculatedLots.reduce((sum, lot) => sum + lot.riceWeight, 0);
  const totalSheets = calculatedLots.reduce((sum, lot) => sum + lot.sheetCount, 0);
  setTotalRiceWeight(totalRice);
  setTotalSheetCount(totalSheets);
};

const handleDekojiRateChange = (value: number) => {
  setDekojiRate(value);
  if (!dekojiDate || !dataContext.moromiProcesses) return;

  const dekojiProcesses = dataContext.moromiProcesses.filter((p: MoromiProcess) =>
    p.dekojiDate === dekojiDate && p.processType?.includes('Koji')
  );

  // 対応する掛米工程を取得
  const jungoIds = [...new Set(dekojiProcesses.map((p: MoromiProcess) => p.jungoId))];
  const kakeProcesses = dataContext.moromiProcesses.filter((p: MoromiProcess) =>
    jungoIds.includes(p.jungoId) && 
    (p.processType === 'motoKake' || 
     p.processType === 'soeKake' || 
     p.processType === 'nakaKake' || 
     p.processType === 'tomeKake')
  );

  calculateAll([...dekojiProcesses, ...kakeProcesses], value);
};

const handleLastSheetWeightChange = (value: string) => {
  setLastSheetWeight(value);
  const weight = parseFloat(value);
  if (!isNaN(weight) && weight > 0) {
    const calculated = KojiService.calculateActualDekojiRate(totalRiceWeight, dekojiRate, weight);
    setActualRate(calculated);
  } else {
    setActualRate(null);
  }
};

const handleSave = async () => {
  if (!dekojiDate || isSaving) return;

  try {
    setIsSaving(true);
    const weight = parseFloat(lastSheetWeight);
    const rate = actualRate;

    const updatedProcesses = lots.flatMap(lot =>
      lot.processes.map(p => ({
        ...p,
        predictedDekojiRate: dekojiRate,
        lastSheetWeight: weight || undefined,
        actualDekojiRate: rate || undefined,
        storageType: lot.storageType
      }))
    );

    await updateDekojiData(updatedProcesses);
    await dataContext.loadMoromiByBY(dataContext.currentBY);

    alert('保存しました');
    onBack();
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました');
  } finally {
    setIsSaving(false);
  }
};

  const getUsageColor = (usage: string): string => {
  if (usage === '酒母') return 'bg-red-200 border-red-400';
  if (usage === '添') return 'bg-blue-200 border-blue-400';
  if (usage === '仲') return 'bg-green-200 border-green-400';
  if (usage === '留') return 'bg-yellow-200 border-yellow-400';
  return 'bg-gray-100 border-gray-300';
};

  const getProcessColor = (processType: string): string => {
  if (processType === 'motoKoji') return 'bg-red-300 text-red-900';
  if (processType === 'soeKoji') return 'bg-blue-300 text-blue-900';
  if (processType === 'nakaKoji') return 'bg-green-300 text-green-900';
  if (processType === 'tomeKoji') return 'bg-yellow-300 text-yellow-900';
  
  if (processType === 'motoKake') return 'bg-red-100 text-red-700';
  if (processType === 'soeKake') return 'bg-blue-100 text-blue-700';
  if (processType === 'nakaKake') return 'bg-green-100 text-green-700';
  if (processType === 'tomeKake') return 'bg-yellow-100 text-yellow-700';
  
  if (processType === 'yodan') return 'bg-purple-200 text-purple-800';
  
  return 'bg-gray-100 text-gray-700';
};
  const getProcessName = (processType: string): string => {
    if (processType === 'motoKoji') return 'モト麹';
    if (processType === 'soeKoji') return '初麹';
    if (processType === 'nakaKoji') return '仲麹';
    if (processType === 'tomeKoji') return '留麹';
    return processType;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-2xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">🌾 出麹作業 - {dekojiDate}</h1>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-white text-blue-900 rounded-lg font-bold hover:bg-blue-50 transition"
            >
              ← 戻る
            </button>
          </div>
        </div>
      </nav>

      <div className="w-full px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700">出麹歩合：</span>
            <input
              type="number"
              value={dekojiRate}
              onChange={(e) => handleDekojiRateChange(parseFloat(e.target.value))}
              step="0.1"
              className="border-2 border-gray-300 rounded px-3 py-1 w-20 font-bold focus:border-blue-500 focus:outline-none"
            />
            <span className="font-bold text-gray-700">%</span>
          </div>
        </div>

        {distribution.error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-bold">⚠️ {distribution.error}</p>
          </div>
        )}

        <div className="grid grid-cols-[3fr_1fr] gap-6">
          {/* 左列: 棚配分（今日の出麹 + マトリックス） */}
{!distribution.error && (
  <div className="bg-white rounded-xl shadow-lg">
    <div className="bg-slate-800 px-4 py-3">
      <h2 className="text-xl font-bold text-white">📊 棚配分</h2>
    </div>
    
    {/* 今日の出麹 */}
    <div className="p-4 border-b-2 border-gray-200">
      <h3 className="text-base font-bold mb-3 text-green-800">🌾 今日の出麹</h3>
      <div className="space-y-2">
        {lots.map((lot, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-start gap-2">
              <span className="text-xl font-bold text-blue-600 min-w-[24px]">
                {['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'][index]}
              </span>
              <div className="flex-1">
                <div className="mb-1">
                  <span className="font-bold text-green-700 text-base">{lot.jungoId}号</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getProcessColor(lot.processes[0].processType)}`}>
                    {getProcessName(lot.processes[0].processType)}
                  </span>
                  <span className="ml-2 font-bold text-base">{lot.riceWeight}kg</span>
                  <span className="ml-1 text-sm text-gray-500">({lot.processes[0].riceType}{lot.processes[0].polishingRatio})</span>
                  {lot.storageType && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                      {lot.storageType === '冷蔵' ? '❄️ 冷蔵' : '🧊 冷凍'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-700">
                    <span className="font-semibold">{lot.sheetCount}枚</span>
                    <span className="mx-1">×</span>
                    <span className="font-semibold">{lot.weightPerSheet.toFixed(1)}kg</span>
                    <span className="mx-1">=</span>
                    <span className="font-bold text-green-600">{lot.predictedWeight.toFixed(1)}kg</span>
                  </div>
                  <div className="text-gray-500">
                    列: <span className="font-semibold text-blue-600">{lot.columns.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 棚配分マトリックステーブル */}
    {/* 棚配分マトリックステーブル */}
<div className="p-4">
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-700">
          <th className="border border-gray-400 px-3 py-2 text-white font-bold text-sm">段</th>
          <th className="border border-gray-400 px-3 py-2 text-white font-bold text-sm">A列</th>
          <th className="border border-gray-400 px-3 py-2 text-white font-bold text-sm">B列</th>
          <th className="border border-gray-400 px-3 py-2 text-white font-bold text-sm">C列</th>
          <th className="border border-gray-400 px-3 py-2 text-white font-bold text-sm">D列</th>
        </tr>
      </thead>
      <tbody>
        {distribution.matrix.map((row, rowIndex) => (
          <tr key={rowIndex}>
            <td className="border border-gray-300 px-3 py-2 text-center font-bold text-sm bg-gray-100">
              {rowIndex + 1}
            </td>
            {row.map((cell, colIndex) => (
              <td
                key={colIndex}
                className={`border border-gray-300 px-2 py-3 ${
                  cell.jungoId ? getUsageColor(cell.usage!) : 'bg-gray-50'
                }`}
              >
                {cell.jungoId ? (
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-blue-700">
                      {cell.jungoId}号：{cell.usage}
                    </div>
                    <div className="text-xs font-semibold text-green-600">
                      {cell.weightPerSheet?.toFixed(1)}kg
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-300 text-xs">-</span>
                )}
              </td>
            ))}
          </tr>
        ))}
        <tr className="bg-gray-100">
          <td className="border border-gray-300 px-3 py-2 text-center font-bold text-sm">
            保管
          </td>
          {['A', 'B', 'C', 'D'].map((col, colIndex) => {
            const columnCells = distribution.matrix.map(row => row[colIndex]).filter(cell => cell.jungoId);
            const storageType = columnCells.length > 0 ? columnCells[0].storageType : null;
            return (
              <td key={col} className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold">
                {storageType ? (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                    {storageType === '冷蔵' ? '❄️ 冷蔵' : '🧊 冷凍'}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  </div>
</div>
  </div>
)}

          {/* 右列: 真の出麹歩合計算 */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="bg-slate-800 px-4 py-3">
              <h2 className="text-xl font-bold text-white">🧮 真の出麹歩合</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-600 mb-1">総白米重量</div>
                <div className="text-2xl font-bold text-blue-700">{totalRiceWeight.toFixed(1)} kg</div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-600 mb-1">総枚数</div>
                <div className="text-2xl font-bold text-blue-700">{totalSheetCount} 枚</div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="text-sm text-gray-600 mb-1">予想出麹重量</div>
                <div className="text-2xl font-bold text-green-700">
                  {(totalRiceWeight * (dekojiRate / 100)).toFixed(1)} kg
                </div>
              </div>

              <div className="border-t-2 border-gray-300 pt-4">
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  最後の1枚の重量 (kg)
                </label>
                <input
                  type="number"
                  value={lastSheetWeight}
                  onChange={(e) => handleLastSheetWeightChange(e.target.value)}
                  step="0.1"
                  placeholder="例: 12.5"
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              {actualRate !== null && (
                <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                  <div className="text-sm text-gray-600 mb-1">真の出麹歩合</div>
                  <div className="text-3xl font-bold text-yellow-700">{actualRate.toFixed(1)} %</div>
                </div>
              )}

              <button
                onClick={handleSave}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition text-lg"
              >
                💾 保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}