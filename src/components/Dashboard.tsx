import { useState, useEffect } from 'react';
import type { MoromiData, MoromiProcess } from '../utils/types';
import { Fragment } from 'react';

interface DashboardProps {
  currentBY: number;
  getMoromiByBY: (by: number) => Promise<MoromiData[]>;
  getProcessesByMoromi: (by: number, jungoId: string) => Promise<MoromiProcess[]>;
}

export default function Dashboard({ currentBY, getMoromiByBY, getProcessesByMoromi }: DashboardProps) {
  const [moromiList, setMoromiList] = useState<MoromiData[]>([]);
  const [expandedJungo, setExpandedJungo] = useState<string | null>(null);
  const [processes, setProcesses] = useState<{ [key: string]: MoromiProcess[] }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMoromiData();
  }, [currentBY]);

  const loadMoromiData = async () => {
    try {
      setIsLoading(true);
      const data = await getMoromiByBY(currentBY);
      setMoromiList(data);
    } catch (error) {
      console.error('もろみデータ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = async (jungoId: string) => {
    if (expandedJungo === jungoId) {
      setExpandedJungo(null);
    } else {
      try {
        const processList = await getProcessesByMoromi(currentBY, jungoId);
        setProcesses(prev => ({ ...prev, [jungoId]: processList }));
        setExpandedJungo(jungoId);
      } catch (error) {
        console.error('工程データ取得エラー:', error);
      }
    }
  };

  const calculateMoromiDays = (tomeDate: string, josoDate: string): number => {
    const tome = new Date(tomeDate);
    const joso = new Date(josoDate);
    const diffTime = Math.abs(joso.getTime() - tome.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProcessName = (type: string) => {
    const names: { [key: string]: string } = {
      motoKoji: 'モト麹',
      motoKake: 'モト掛',
      soeKoji: '初麹',
      soeKake: '初掛',
      nakaKoji: '仲麹',
      nakaKake: '仲掛',
      tomeKoji: '留麹',
      tomeKake: '留掛',
      yodan: '四段',
    };
    return names[type] || type;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="bg-slate-800 px-4 py-3">
          <h2 className="text-xl font-bold text-white">📋 もろみ一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-bold">順号</th>
                <th className="px-4 py-2 text-left text-sm font-bold">タンク</th>
                <th className="px-4 py-2 text-left text-sm font-bold">仕込区分</th>
                <th className="px-4 py-2 text-left text-sm font-bold">規模</th>
                <th className="px-4 py-2 text-left text-sm font-bold">備考</th>
                <th className="px-4 py-2 text-left text-sm font-bold">留日</th>
                <th className="px-4 py-2 text-left text-sm font-bold">上槽予定</th>
                <th className="px-4 py-2 text-left text-sm font-bold">もろみ日数</th>
              </tr>
            </thead>
            <tbody>
  {moromiList.map((moromi) => {
    const moromiDays = calculateMoromiDays(moromi.tomeDate, moromi.josoDate);
    return (
      <Fragment key={moromi.jungoId}>
        <tr
          onClick={() => handleRowClick(moromi.jungoId)}
          className="border-b hover:bg-slate-50 cursor-pointer"
        >
          <td className="px-4 py-2">
            <span className="mr-2">{expandedJungo === moromi.jungoId ? '▼' : '▶'}</span>
            {moromi.jungoId}
          </td>
          <td className="px-4 py-2">{moromi.tankNo}</td>
          <td className="px-4 py-2">{moromi.brewingCategory}</td>
          <td className="px-4 py-2">{moromi.brewingSize}kg</td>
          <td className="px-4 py-2">{moromi.memo || '-'}</td>
          <td className="px-4 py-2">{moromi.tomeDate.substring(5)}</td>
          <td className="px-4 py-2">{moromi.josoDate.substring(5)}</td>
          <td className="px-4 py-2">{moromiDays}日</td>
        </tr>
        {expandedJungo === moromi.jungoId && (
          <tr>
            <td colSpan={8} className="bg-slate-50 p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded">
                              <h3 className="font-bold mb-2">基本情報</h3>
                              <div className="space-y-1 text-sm">
                                <div>BY: {moromi.by}</div>
                                <div>順号: {moromi.jungoId}</div>
                                <div>タンク: {moromi.tankNo}</div>
                                <div>仕込区分: {moromi.brewingCategory}</div>
                                <div>仕込規模: {moromi.brewingSize}kg</div>
                                <div>備考: {moromi.memo || '-'}</div>
                                <div>留日: {moromi.tomeDate.substring(5)}</div>
                                <div>上槽予定: {moromi.josoDate.substring(5)}</div>
                                <div>もろみ日数: {moromiDays}日</div>
                                <div className="mt-2 pt-2 border-t">
                                  <div>酒母卸: {moromi.motoOroshiDate.substring(5)}</div>
                                  <div>添仕込: {moromi.soeShikomiDate.substring(5)}</div>
                                  <div>仲仕込: {moromi.nakaShikomiDate.substring(5)}</div>
                                  <div>留仕込: {moromi.tomeShikomiDate.substring(5)}</div>
                                  {moromi.yodanShikomiDate && <div>四段: {moromi.yodanShikomiDate.substring(5)}</div>}
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded">
                              <h3 className="font-bold mb-2">工程一覧</h3>
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="px-2 py-1 text-left">工程</th>
                                    <th className="px-2 py-1 text-left">米品種</th>
                                    <th className="px-2 py-1 text-left">精米</th>
                                    <th className="px-2 py-1 text-left">数量</th>
                                    <th className="px-2 py-1 text-left">洗米</th>
                                    <th className="px-2 py-1 text-left">仕込</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {processes[moromi.jungoId]?.map((process) => (
  <tr key={`${process.processType}-${process.senmaiDate}`} className="border-b">
    <td className="px-2 py-1">{getProcessName(process.processType)}</td>
    <td className="px-2 py-1">{process.riceType}</td>
    <td className="px-2 py-1">{process.polishingRatio}%</td>
    <td className="px-2 py-1">{process.amount || '-'}</td>
    <td className="px-2 py-1">{process.senmaiDate.substring(5)}</td>
    <td className="px-2 py-1">{process.shikomiDate.substring(5)}</td>
  </tr>
))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                     </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}