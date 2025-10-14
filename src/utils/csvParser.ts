import Papa from 'papaparse';
import type { MoromiData, MoromiProcess, ProcessType } from './types';

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('Duplicate headers')) return;
  originalWarn(...args);
};

// Excelシリアル値を日付に変換
export function excelSerialToDate(serial: number): Date {
  const excelEpoch = new Date(1899, 11, 30); // ローカル時間で作成
  const result = new Date(excelEpoch);
  result.setDate(result.getDate() + serial);
  result.setHours(0, 0, 0, 0);
  return result;
}

// 日付をYYYY-MM-DD形式に変換
export function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
// CSV読み込み
export async function parseCSV(file: File): Promise<{ moromiData: MoromiData[], moromiProcesses: MoromiProcess[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: false,  // 空行も取得するように変更
      complete: (results) => {
        const moromiDataList: MoromiData[] = [];
        const moromiProcessList: MoromiProcess[] = [];
        
        // Step 1: 順号ごとにグループ化
        const rowsByJungo = new Map<string, any[]>();
        let currentJungoId: string | null = null;
        
        results.data.forEach((row: any) => {
          // 順号が入っていたら更新
          if (row['順号'] && row['順号'].toString().trim() !== '') {
            currentJungoId = row['順号'].toString();
          }
          
          // 順号が一度も設定されていない場合はスキップ
          if (!currentJungoId) return;
          
          // 使用区分が1つでもあれば有効な行
          let hasValidData = false;
          for (let i = 0; i < 9; i++) {
            const usageKey = i === 0 ? '使用区分' : `使用区分_${i}`;
            if (row[usageKey] && row[usageKey].toString().trim() !== '') {
              hasValidData = true;
              break;
            }
          }
          
          if (!hasValidData) return;
          
          // グループに追加
          if (!rowsByJungo.has(currentJungoId)) {
            rowsByJungo.set(currentJungoId, []);
          }
          rowsByJungo.get(currentJungoId)!.push(row);
        });
        
        // Step 2: 各順号グループを処理
        rowsByJungo.forEach((rows, jungoId) => {
          // 最初の行から基本情報を取得（moromi_data作成）
          const firstRow = rows[0];
          
          const tomeDate = excelSerialToDate(parseInt(firstRow['留日']));
          const by = calculateBY(tomeDate);

          const moromiData: MoromiData = {
            by,
            jungoId,
            brewingSize: parseInt(firstRow['仕込規模']),
            tomeDate: dateToString(tomeDate),
            brewingCategory: firstRow['仕込区分'],
            methodCategory: firstRow['製法区分'] || null,
            josoDate: dateToString(excelSerialToDate(parseInt(firstRow['上槽予定']))),
            tankNo: firstRow['タンク番号'],
            soeTankId: null,
            kenteiTankId: null,
            memo: firstRow['備考'] || null,
            motoOroshiDate: dateToString(new Date(tomeDate.getTime() - 4 * 24 * 60 * 60 * 1000)),
            soeShikomiDate: dateToString(new Date(tomeDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
            uchikomiDate: dateToString(new Date(tomeDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
            nakaShikomiDate: dateToString(new Date(tomeDate.getTime() - 1 * 24 * 60 * 60 * 1000)),
            tomeShikomiDate: dateToString(tomeDate),
            yodanShikomiDate: null,
          };

          // 四段があるか確認（全行をチェック）
          for (const row of rows) {
            for (let i = 0; i < 9; i++) {
              const usageKey = i === 0 ? '使用区分' : `使用区分_${i}`;
              if (row[usageKey] === '四段') {
                const josoDate = excelSerialToDate(parseInt(firstRow['上槽予定']));
                moromiData.yodanShikomiDate = dateToString(new Date(josoDate.getTime() - 1 * 24 * 60 * 60 * 1000));
                break;
              }
            }
            if (moromiData.yodanShikomiDate) break;
          }

          moromiDataList.push(moromiData);

          // Step 3: 全ての行から工程データを抽出（moromi_process作成）
          rows.forEach((row) => {
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

              // 重複チェック: 同じ (by, jungoId, processType, riceType) が既に存在するか
              const existingIndex = moromiProcessList.findIndex(p => 
                p.by === process.by &&
                p.jungoId === process.jungoId &&
                p.processType === process.processType &&
                p.riceType === process.riceType
              );
              
              if (existingIndex !== -1) {
                // 既に存在する場合は数量を合算
                const existing = moromiProcessList[existingIndex];
                moromiProcessList[existingIndex] = {
                  ...existing,
                  amount: (existing.amount || 0) + (process.amount || 0)
                };
                console.log(`数量合算: ${process.jungoId} ${processType} ${process.riceType}: ${existing.amount} + ${process.amount} = ${moromiProcessList[existingIndex].amount}`);
              } else {
                moromiProcessList.push(process);
              }
            }
          });
        });

        console.log('===== CSV解析結果 =====');
        console.log('moromiData件数:', moromiDataList.length);
        console.log('moromiProcess件数:', moromiProcessList.length);
        console.log('最初のmoromiData:', moromiDataList[0]);
        console.log('最初の3件のmoromiProcess:', moromiProcessList.slice(0, 3));
        console.log('順号3の工程データ:', moromiProcessList.filter(p => p.jungoId === '3'));
        
        resolve({ moromiData: moromiDataList, moromiProcesses: moromiProcessList });
      },
      error: reject,
    });
  });
}