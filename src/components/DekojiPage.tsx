// src/components/DekojiPage.tsx

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KojiService } from '../services/KojiService';
import { updateDekojiData } from '../utils/database';
import type { MoromiProcess, DekojiLot, ShelfDistribution } from '../utils/types';

interface DekojiPageProps {
  dataContext: any;
}

export default function DekojiPage({ dataContext }: DekojiPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dateParam = searchParams.get('date');

  const [dekojiRate, setDekojiRate] = useState(120.0);
  const [lots, setLots] = useState<DekojiLot[]>([]);
  const [distribution, setDistribution] = useState<ShelfDistribution>({ matrix: [], columnCounts: [] });
  const [lastSheetWeight, setLastSheetWeight] = useState<string>('');
  const [actualRate, setActualRate] = useState<number | null>(null);
  const [totalRiceWeight, setTotalRiceWeight] = useState(0);
  const [totalSheetCount, setTotalSheetCount] = useState(0);

  // 初期化
  useEffect(() => {
    if (!dateParam || !dataContext.moromiProcesses) return;

    // その日の出麹対象を取得
    const dekojiProcesses = dataContext.moromiProcesses.filter((p: MoromiProcess) =>
      p.dekojiDate === dateParam && p.processType?.includes('Koji')
    );

    if (dekojiProcesses.length === 0) {
      alert('この日の出麹作業はありません');
      navigate('/');
      return;
    }

    // 配分計算
    calculateAll(dekojiProcesses, dekojiRate);
  }, [dateParam, dataContext.moromiProcesses]);

  // 配分計算
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

  // 出麹歩合変更時
  const handleDekojiRateChange = (value: number) => {
    setDekojiRate(value);
    if (!dateParam || !dataContext.moromiProcesses) return;

    const dekojiProcesses = dataContext.moromiProcesses.filter((p: MoromiProcess) =>
      p.dekojiDate === dateParam && p.processType?.includes('Koji')
    );

    calculateAll(dekojiProcesses, value);
  };

  // 最後の1枚の重量変更時
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

  // 保存
  const handleSave = async () => {
    if (!dateParam) return;

    try {
      const weight = parseFloat(lastSheetWeight);
      const rate = actualRate;

      // 全工程に出麹データを保存
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

      // useDataのstateを更新
      await dataContext.loadMoromiByBY(dataContext.currentBY);

      alert('保存しました');
      navigate('/');
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const getUsageColor = (usage: string): string => {
    if (usage === '酒母') return 'bg-red-50';
    if (usage === '添') return 'bg-blue-50';
    if (usage === '仲') return 'bg-green-50';
    if (usage === '留') return 'bg-yellow-50';
    return 'bg-gray-50';
  };

  const getUsageBadgeColor = (usage: string): string => {
    if (usage === '酒母') return 'bg-red-100 text-red-700';
    if (usage === '添') return 'bg-blue-100 text-blue-700';
    if (usage === '仲') return 'bg-green-100 text-green-700';
    if (usage === '留') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ヘッダー */}
      <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-xl">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="hover:bg-white/10 px-3 py-2 rounded transition"
              >
                ← 戻る
              </button>
              <h1 className="text-2xl font-bold">🌾 出麹作業</h1>
            </div>
            <div className="text-xl font-bold">{dateParam}</div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-6">
        
        {/* 出麹歩合入力 */}
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

        {/* エラー表示 */}
        {distribution.error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-bold">⚠️ {distribution.error}</p>
          </div>
        )}

        {/* 棚配分マトリックス */}
        {!distribution.error && (
          <div className="bg-white rounded-xl shadow-lg mb-6">
            <div className="bg-slate-800 px-4 py-3">
              <h2 className="text-xl font-bold text-white">📊 棚配分マトリックス</h2>
            </div>
            <div className="p-4">
              <div className="text-center mb-3">
                <span className="font-bold text-gray-700">配分：</span>
                <span className="text-xl font-bold text-blue-700">
                  ({distribution.columnCounts.join(', ')})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="border border-slate-600 px-2 py-2 w-12">段</th>
                      <th className="border border-slate-600 px-2 py-2">A列</th>
                      <th className="border border-slate-600 px-2 py-2">B列</th>
                      <th className="border border-slate-600 px-2 py-2">C列</th>
                      <th className="border border-slate-600 px-2 py-2">D列</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distribution.matrix.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="border border-gray-300 px-2 py-2 text-center font-bold bg-slate-100">
                          {rowIndex + 1}
                        </td>
                        {row.map((cell, colIndex) => (
                          <td
                            key={colIndex}
                            className={`border border-gray-300 px-2 py-2 ${
                              cell.jungoId ? getUsageColor(cell.usage!) : 'bg-gray-50'
                            }`}
                          >
                            {cell.jungoId && (
                              <>
                                <div className="text-xs font-bold">
                                  {cell.jungoId}号：{cell.usage}
                                  {cell.storageType && (
                                    <span className="ml-1">
                                      {cell.storageType === '冷蔵' ? '❄️' : '🧊'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {cell.weightPerSheet?.toFixed(1)}kg
                                </div>
                              </>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 出麹順番とロット */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="bg-slate-800 px-4 py-3">
            <h2 className="text-xl font-bold text-white">📋 出麹順番とロット</h2>
          </div>
          <div className="p-4 space-y-2">
            {lots.map((lot, index) => (
              <div
                key={index}
                className="bg-gray-50 p-3 rounded border border-gray-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-blue-600">
                    {['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'][index]}
                  </span>
                  <div>
                    <div className="text-sm font-bold">
                      {lot.jungoId}号{lot.usage === '酒母' ? 'モト' : lot.usage}麹：
                      {lot.sheetCount}枚：{lot.weightPerSheet.toFixed(1)}kg/枚　
                      合計{lot.predictedWeight.toFixed(1)}kg
                    </div>
                    <div className="text-xs mt-0.5">
                      <span className={`px-2 py-0.5 rounded font-semibold ${getUsageBadgeColor(lot.usage)}`}>
                        {lot.usage}
                      </span>
                      {lot.storageType && (
                        <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold">
                          {lot.storageType === '冷蔵' ? '❄️ 冷蔵' : '🧊 冷凍'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-blue-600">
                  {lot.columns.join('・')}列
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 真の出麹歩合計算 */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="bg-slate-800 px-4 py-3">
            <h2 className="text-xl font-bold text-white">📊 真の出麹歩合計算</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 rounded p-3 text-center">
                <div className="text-xs text-gray-600">総白米</div>
                <div className="text-lg font-bold">{totalRiceWeight}kg</div>
              </div>
              <div className="bg-slate-50 rounded p-3 text-center">
                <div className="text-xs text-gray-600">総枚数</div>
                <div className="text-lg font-bold">{totalSheetCount}枚</div>
              </div>
              <div className="bg-slate-50 rounded p-3 text-center">
                <div className="text-xs text-gray-600">予想出麹歩合</div>
                <div className="text-lg font-bold text-blue-700">{dekojiRate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold">最後の1枚：</span>
                <input
                  type="number"
                  value={lastSheetWeight}
                  onChange={(e) => handleLastSheetWeightChange(e.target.value)}
                  placeholder="12.3"
                  step="0.1"
                  className="border-2 border-gray-300 rounded px-3 py-1 w-20 font-bold focus:border-blue-500 focus:outline-none"
                />
                <span className="text-sm font-bold">kg</span>
              </div>

              {actualRate !== null && (
                <div className="bg-green-50 rounded p-3 border-2 border-green-200 text-center">
                  <div className="text-xs text-gray-600">真の出麹歩合</div>
                  <div className="text-2xl font-bold text-green-700">{actualRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600 mt-1">
                    総出麹：{((totalRiceWeight - 10) * (dekojiRate / 100) + parseFloat(lastSheetWeight)).toFixed(1)}kg
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
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