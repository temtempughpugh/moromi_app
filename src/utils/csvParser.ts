import Papa from 'papaparse';
import type { MoromiData, MoromiProcess, ProcessType } from './types';

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('Duplicate headers')) return;
  originalWarn(...args);
};

// Excelシリアル値を日付に変換
export function excelSerialToDate(serial: number): Date {
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
}

// 日付をYYYY-MM-DD形式に変換
export function dateToString(date: Date): string {
  return date.toISOString().substring(0, 10);
}

// BY（醸造年度）を計算
export function calculateBY(date: Date): number {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 7 ? year : year - 1;
}

// 使用区分を変換
export function convertProcessType(csvValue: string): ProcessType {
  const map: { [key: string]: ProcessType } = {
    'モト麹': 'motoKoji',
    'モト掛': 'motoKake',
    '初麹': 'soeKoji',
    '初掛': 'soeKake',
    '仲麹': 'nakaKoji',
    '仲掛': 'nakaKake',
    '留麹': 'tomeKoji',
    '留掛': 'tomeKake',
    '四段': 'yodan',
  };
  return map[csvValue] || 'motoKoji';
}

// CSV読み込み
export async function parseCSV(file: File): Promise<{ moromiData: MoromiData[], moromiProcesses: MoromiProcess[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<any>(file, {  // ← <any> を追加
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const moromiDataList: MoromiData[] = [];
        const moromiProcessList: MoromiProcess[] = [];

        results.data.forEach((row: any) => {
          // 順号が空欄ならスキップ
          if (!row['順号'] || row['順号'].toString().trim() === '') return;

          const jungoId = row['順号'].toString();
          const tomeDate = excelSerialToDate(parseInt(row['留日']));
          const by = calculateBY(tomeDate);

          // moromi_data作成
          const moromiData: MoromiData = {
            by,
            jungoId,
            brewingSize: parseInt(row['仕込規模']),
            tomeDate: dateToString(tomeDate),
            brewingCategory: row['仕込区分'],
            methodCategory: row['製法区分'] || null,
            josoDate: dateToString(excelSerialToDate(parseInt(row['上槽予定']))),
            tankNo: row['タンク番号'],
            memo: row['備考'] || null,
            motoOroshiDate: dateToString(new Date(tomeDate.getTime() - 4 * 24 * 60 * 60 * 1000)),
            soeShikomiDate: dateToString(new Date(tomeDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
            uchikomiDate: dateToString(new Date(tomeDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
            nakaShikomiDate: dateToString(new Date(tomeDate.getTime() - 1 * 24 * 60 * 60 * 1000)),
            tomeShikomiDate: dateToString(tomeDate),
            yodanShikomiDate: null,
          };

          // 四段があるか確認
          for (let i = 0; i < 9; i++) {
            const usageKey = i === 0 ? '使用区分' : `使用区分_${i}`;
            if (row[usageKey] === '四段') {
              const josoDate = excelSerialToDate(parseInt(row['上槽予定']));
              moromiData.yodanShikomiDate = dateToString(new Date(josoDate.getTime() - 1 * 24 * 60 * 60 * 1000));
              break;
            }
          }

          moromiDataList.push(moromiData);

          // moromi_process作成（9工程）
          for (let i = 0; i < 9; i++) {
            const usageKey = i === 0 ? '使用区分' : `使用区分_${i}`;
            const dateKey = i === 0 ? '日付' : `日付_${i}`;
            const riceKey = i === 0 ? '白米品種' : `白米品種_${i}`;
            const pctKey = i === 0 ? '精米歩合' : `精米歩合_${i}`;
            const amountKey = i === 0 ? '数量' : `数量_${i}`;

            if (!row[usageKey]) continue;

            const amount = row[amountKey] ? parseFloat(row[amountKey]) : null;
            // 数量が0ならスキップ
            if (amount === 0) continue;

            const processType = convertProcessType(row[usageKey]);
            const senmaiDate = excelSerialToDate(parseInt(row[dateKey]));
            const senmaiDateStr = dateToString(senmaiDate);

            const isKoji = processType.includes('Koji');
            const isKake = processType.includes('Kake') || processType === 'yodan';

            const process: MoromiProcess = {
              by,
              jungoId,
              processType,
              senmaiDate: senmaiDateStr,
              riceType: row[riceKey],
              polishingRatio: parseInt(row[pctKey]),
              amount,
              hikomiDate: isKoji ? dateToString(new Date(senmaiDate.getTime() + 1 * 24 * 60 * 60 * 1000)) : null,
              moriDate: isKoji ? dateToString(new Date(senmaiDate.getTime() + 2 * 24 * 60 * 60 * 1000)) : null,
              dekojiDate: isKoji ? dateToString(new Date(senmaiDate.getTime() + 3 * 24 * 60 * 60 * 1000)) : null,
              kakeShikomiDate: isKake ? dateToString(new Date(senmaiDate.getTime() + 1 * 24 * 60 * 60 * 1000)) : null,
              shikomiDate: '',
            };

            // 仕込み日を設定
            if (processType === 'motoKoji' || processType === 'motoKake') {
              process.shikomiDate = moromiData.motoOroshiDate;
            } else if (processType === 'soeKoji' || processType === 'soeKake') {
              process.shikomiDate = moromiData.soeShikomiDate;
            } else if (processType === 'nakaKoji' || processType === 'nakaKake') {
              process.shikomiDate = moromiData.nakaShikomiDate;
            } else if (processType === 'tomeKoji' || processType === 'tomeKake') {
              process.shikomiDate = moromiData.tomeShikomiDate;
            } else if (processType === 'yodan') {
              process.shikomiDate = moromiData.yodanShikomiDate || '';
            }

            moromiProcessList.push(process);
          }
        });

        resolve({ moromiData: moromiDataList, moromiProcesses: moromiProcessList });
      },
      error: reject,
    });
  });
}