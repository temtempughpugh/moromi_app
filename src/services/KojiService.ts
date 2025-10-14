// src/services/KojiService.ts

import type { MoromiProcess, DekojiLot, ShelfDistribution, ShelfCell } from '../utils/types';

export class KojiService {
  
  // ============================================
  // 用途判定
  // ============================================
  private static getUsage(processType: string): string {
    if (processType === 'motoKoji') return '酒母';
    if (processType === 'soeKoji') return '添';
    if (processType === 'nakaKoji') return '仲';
    if (processType === 'tomeKoji') return '留';
    return 'その他';
  }

  // ============================================
  // 保管方法の判定
  // ============================================
  static determineStorageType(
  kojiDekojiDate: string,
  kakeShikomiDate: string | null
): string | null {
  if (!kakeShikomiDate) return null;
  
  const dekoji = new Date(kojiDekojiDate);
  const shikomi = new Date(kakeShikomiDate);
  const daysDiff = Math.floor((shikomi.getTime() - dekoji.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 1) return null;              // 通常（出麹翌日に仕込み）
  if (daysDiff === 2 || daysDiff === 3) return '冷蔵';  // 出麹2〜3日後に仕込み
  if (daysDiff >= 4) return '冷凍';             // 出麹4日後以降に仕込み
  return null;
}

  // ============================================
  // 出麹配分計算
  // ============================================
  static calculateDistribution(
  processes: MoromiProcess[],  // ← この引数は全工程を含むべき
  dekojiRate: number = 120
): DekojiLot[] {
  // 麹工程のみフィルタ
  const kojiProcesses = processes.filter(p => 
    p.processType?.includes('Koji') && p.amount && p.amount > 0
  );

    // 用途・順号でグループ化
    const grouped = new Map<string, MoromiProcess[]>();
    kojiProcesses.forEach(p => {
      const key = `${p.jungoId}-${this.getUsage(p.processType)}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(p);
    });

    // ロット作成
    const lots: DekojiLot[] = [];
    grouped.forEach((procs) => {
      const jungoId = procs[0].jungoId;
      const usage = this.getUsage(procs[0].processType);
      const riceWeight = procs.reduce((sum, p) => sum + (p.amount || 0), 0);
      const predictedWeight = riceWeight * (dekojiRate / 100);
      const sheetCount = Math.ceil(riceWeight / 10);
      const weightPerSheet = predictedWeight / sheetCount;

      // 保管方法の判定（対応する掛米工程を探す）
      let storageType: string | null = null;
      const kojiProcess = procs[0];
      if (kojiProcess.dekojiDate) {
        // 対応する掛米工程のprocessTypeを取得
        let kakeProcessType = '';
        if (kojiProcess.processType === 'motoKoji') kakeProcessType = 'motoKake';
        else if (kojiProcess.processType === 'soeKoji') kakeProcessType = 'soeKake';
        else if (kojiProcess.processType === 'nakaKoji') kakeProcessType = 'nakaKake';
        else if (kojiProcess.processType === 'tomeKoji') kakeProcessType = 'tomeKake';

        // 全processesから対応する掛米工程を探す
        const kakeProcess = processes.find(p => 
      p.by === kojiProcess.by && 
      p.jungoId === kojiProcess.jungoId && 
      p.processType === kakeProcessType
    );

        if (kakeProcess && kakeProcess.kakeShikomiDate) {
          storageType = this.determineStorageType(kojiProcess.dekojiDate, kakeProcess.kakeShikomiDate);
        }
      }

      lots.push({
        jungoId,
        usage,
        riceWeight,
        predictedWeight,
        sheetCount,
        weightPerSheet,
        processes: procs,
        columns: [],
        storageType
      });
    });

    // 出麹順序でソート
    const usageOrder = ['酒母', '添', '仲', '留', 'その他'];
    lots.sort((a, b) => {
      const orderA = usageOrder.indexOf(a.usage);
      const orderB = usageOrder.indexOf(b.usage);
      if (orderA !== orderB) return orderA - orderB;
      return parseInt(a.jungoId) - parseInt(b.jungoId);
    });

    return lots;
  }

  // ============================================
  // 棚配分計算
  // ============================================
  static calculateShelfDistribution(lots: DekojiLot[]): ShelfDistribution {
    const MAX_COLUMNS = 4;
    const MAX_ROWS_PER_COLUMN = 5;

    // 各ロットの必要列数を計算
    lots.forEach(lot => {
      const requiredColumns = Math.ceil(lot.sheetCount / MAX_ROWS_PER_COLUMN);
      lot.columns = Array(requiredColumns).fill('');
    });

    // 総列数チェック
    let totalColumns = lots.reduce((sum, lot) => sum + lot.columns.length, 0);

    if (totalColumns > MAX_COLUMNS) {
      return {
        matrix: [],
        columnCounts: [],
        error: '配分できません。段数をオーバーしています。'
      };
    }

    // 4列使い切る調整
    // 4列使い切る調整
while (totalColumns < MAX_COLUMNS) {
  // 各ロットの列あたり枚数を仮計算
  const lotSheetsPerColumn = lots.map(lot => {
    const sheetsPerColumn = Math.floor(lot.sheetCount / lot.columns.length);
    const remainder = lot.sheetCount % lot.columns.length;
    // 各列の最大枚数（余りは最初の列に加算）
    return remainder > 0 ? sheetsPerColumn + 1 : sheetsPerColumn;
  });

  // 列あたり最多枚数のロットを特定（出麹順序が遅い方優先）
  let maxLot: DekojiLot | null = null;
  let maxSheetsPerColumn = 0;
  for (let i = lots.length - 1; i >= 0; i--) {
    if (lotSheetsPerColumn[i] >= maxSheetsPerColumn) {
      maxSheetsPerColumn = lotSheetsPerColumn[i];
      maxLot = lots[i];
    }
  }

  if (maxLot) {
    maxLot.columns.push('');
    totalColumns++;
  } else {
    break;
  }
}
    // 列を割り当て（D→C→B→A）
    const columnNames = ['D', 'C', 'B', 'A'];
    let currentColumnIndex = 0;

    lots.forEach(lot => {
      for (let i = 0; i < lot.columns.length; i++) {
        lot.columns[i] = columnNames[currentColumnIndex];
        currentColumnIndex++;
      }
    });

    lots.forEach(lot => {
  const hasAColumn = lot.columns.includes('A');
  
  if (hasAColumn && lot.columns.length > 1) {
    // 各列の枚数を計算
    const sheetsPerColumn = Math.floor(lot.sheetCount / lot.columns.length);
    const remainder = lot.sheetCount % lot.columns.length;
    
    // 各列の実際の枚数を計算
    const columnSheets = lot.columns.map((col, index) => {
      const sheets = index < remainder ? sheetsPerColumn + 1 : sheetsPerColumn;
      return { col, sheets, index };
    });
    
    // A列のインデックスを取得
    const aIndex = lot.columns.indexOf('A');
    
    // 5段以上の列を探す（A列以外）
    const fivePlusColumn = columnSheets.find(
      (item, idx) => item.sheets >= 5 && idx !== aIndex
    );
    
    // 5段以上の列が見つかった場合、A列と入れ替え
    if (fivePlusColumn) {
      const targetIndex = fivePlusColumn.index;
      // 列名を入れ替え
      [lot.columns[aIndex], lot.columns[targetIndex]] = 
        [lot.columns[targetIndex], lot.columns[aIndex]];
    }
  }
});

    // マトリックス構築
    const matrix: ShelfCell[][] = [];
    const columnData: { [key: string]: ShelfCell[] } = {
      'A': [],
      'B': [],
      'C': [],
      'D': []
    };

    lots.forEach(lot => {
      const sheetsPerColumn = Math.floor(lot.sheetCount / lot.columns.length);
      const remainder = lot.sheetCount % lot.columns.length;

      lot.columns.forEach((col, colIndex) => {
        const sheetsInThisColumn = colIndex < remainder ? sheetsPerColumn + 1 : sheetsPerColumn;
        
        for (let i = 0; i < sheetsInThisColumn; i++) {
          columnData[col].push({
            jungoId: lot.jungoId,
            usage: lot.usage,
            weightPerSheet: lot.weightPerSheet,
            storageType: lot.storageType
          });
        }
      });
    });

    // 最大行数を取得
    const maxRows = Math.max(
      columnData['A'].length,
      columnData['B'].length,
      columnData['C'].length,
      columnData['D'].length
    );

    // マトリックス作成
    for (let row = 0; row < maxRows; row++) {
      matrix.push([
        columnData['A'][row] || { jungoId: null, usage: null, weightPerSheet: null, storageType: null },
        columnData['B'][row] || { jungoId: null, usage: null, weightPerSheet: null, storageType: null },
        columnData['C'][row] || { jungoId: null, usage: null, weightPerSheet: null, storageType: null },
        columnData['D'][row] || { jungoId: null, usage: null, weightPerSheet: null, storageType: null }
      ]);
    }

    // 列ごとの枚数を計算
    const columnCounts = [
      columnData['A'].length,
      columnData['B'].length,
      columnData['C'].length,
      columnData['D'].length
    ];

    return {
      matrix,
      columnCounts
    };
  }

  // ============================================
  // 真の出麹歩合計算
  // ============================================
  static calculateActualDekojiRate(
    totalRiceWeight: number,
    predictedRate: number,
    lastSheetWeight: number
  ): number {
    // 最後の1枚を除いた白米重量
    const dryWeight = totalRiceWeight - 10;

    // 最後の1枚を除いた麹重量（予想値）
    const kojiWeight = dryWeight * (predictedRate / 100);

    // 総出麹重量
    const totalKojiWeight = kojiWeight + lastSheetWeight;

    // 真の出麹歩合
    const actualRate = (totalKojiWeight / totalRiceWeight) * 100;

    return Math.round(actualRate * 10) / 10;
  }
}