import { supabase } from '../lib/supabase';
import type { MoromiData, MoromiProcess } from './types';

// データ保存
export async function saveMoromiData(moromiDataList: MoromiData[], processList: MoromiProcess[]): Promise<void> {
  // moromi_data を保存
  const { error: moromiError } = await supabase
    .from('moromi_data')
    .upsert(moromiDataList.map(m => ({
      by: m.by,
      jungo_id: m.jungoId,
      brewing_size: m.brewingSize,
      tome_date: m.tomeDate,
      brewing_category: m.brewingCategory,
      method_category: m.methodCategory,
      joso_date: m.josoDate,
      tank_no: m.tankNo,
      memo: m.memo,
      moto_oroshi_date: m.motoOroshiDate,
      soe_shikomi_date: m.soeShikomiDate,
      uchikomi_date: m.uchikomiDate,
      naka_shikomi_date: m.nakaShikomiDate,
      tome_shikomi_date: m.tomeShikomiDate,
      yodan_shikomi_date: m.yodanShikomiDate,
      updated_at: new Date().toISOString()
    })), { onConflict: 'by,jungo_id' });

  if (moromiError) throw moromiError;

  // moromi_process を保存
  const { error: processError } = await supabase
    .from('moromi_process')
    .upsert(processList.map(p => ({
      by: p.by,
      jungo_id: p.jungoId,
      process_type: p.processType,
      senmai_date: p.senmaiDate,
      rice_type: p.riceType,
      polishing_ratio: p.polishingRatio,
      amount: p.amount,
      hikomi_date: p.hikomiDate,
      mori_date: p.moriDate,
      dekoji_date: p.dekojiDate,
      kake_shikomi_date: p.kakeShikomiDate,
      shikomi_date: p.shikomiDate,
      updated_at: new Date().toISOString()
    })), { onConflict: 'by,jungo_id,process_type' });

  if (processError) throw processError;
}

// BY一覧取得
export async function getAvailableBYs(): Promise<number[]> {
  const { data, error } = await supabase
    .from('moromi_data')
    .select('by');

  if (error) throw error;

  const bys = [...new Set(data.map(d => d.by))].sort((a, b) => b - a);
  return bys;
}

// 特定BYのもろみデータ取得
// 特定BYのもろみデータ取得
export async function getMoromiByBY(by: number): Promise<MoromiData[]> {
  const { data, error } = await supabase
    .from('moromi_data')
    .select('*')
    .eq('by', by);

  if (error) throw error;

  // 順号を数値に変換してソート
  return (data || [])
    .map(d => ({
      by: d.by,
      jungoId: d.jungo_id,
      brewingSize: d.brewing_size,
      tomeDate: d.tome_date,
      brewingCategory: d.brewing_category,
      methodCategory: d.method_category,
      josoDate: d.joso_date,
      tankNo: d.tank_no,
      memo: d.memo,
      motoOroshiDate: d.moto_oroshi_date,
      soeShikomiDate: d.soe_shikomi_date,
      uchikomiDate: d.uchikomi_date,
      nakaShikomiDate: d.naka_shikomi_date,
      tomeShikomiDate: d.tome_shikomi_date,
      yodanShikomiDate: d.yodan_shikomi_date,
    }))
    .sort((a, b) => parseInt(a.jungoId) - parseInt(b.jungoId));
}

// 特定もろみの工程データ取得
export async function getProcessesByMoromi(by: number, jungoId: string): Promise<MoromiProcess[]> {
  const { data, error } = await supabase
    .from('moromi_process')
    .select('*')
    .eq('by', by)
    .eq('jungo_id', jungoId);

  if (error) throw error;

  return (data || []).map(p => ({
    by: p.by,
    jungoId: p.jungo_id,
    processType: p.process_type,
    senmaiDate: p.senmai_date,
    riceType: p.rice_type,
    polishingRatio: p.polishing_ratio,
    amount: p.amount,
    hikomiDate: p.hikomi_date,
    moriDate: p.mori_date,
    dekojiDate: p.dekoji_date,
    kakeShikomiDate: p.kake_shikomi_date,
    shikomiDate: p.shikomi_date,
  }));
}

// 全データ取得
export async function getAllData(): Promise<{ moromiData: MoromiData[], moromiProcesses: MoromiProcess[] }> {
  const { data: moromiData, error: moromiError } = await supabase
    .from('moromi_data')
    .select('*');

  if (moromiError) throw moromiError;

  const { data: processData, error: processError } = await supabase
    .from('moromi_process')
    .select('*');

  if (processError) throw processError;

  return {
    moromiData: (moromiData || []).map(d => ({
      by: d.by,
      jungoId: d.jungo_id,
      brewingSize: d.brewing_size,
      tomeDate: d.tome_date,
      brewingCategory: d.brewing_category,
      methodCategory: d.method_category,
      josoDate: d.joso_date,
      tankNo: d.tank_no,
      memo: d.memo,
      motoOroshiDate: d.moto_oroshi_date,
      soeShikomiDate: d.soe_shikomi_date,
      uchikomiDate: d.uchikomi_date,
      nakaShikomiDate: d.naka_shikomi_date,
      tomeShikomiDate: d.tome_shikomi_date,
      yodanShikomiDate: d.yodan_shikomi_date,
    })),
    moromiProcesses: (processData || []).map(p => ({
      by: p.by,
      jungoId: p.jungo_id,
      processType: p.process_type,
      senmaiDate: p.senmai_date,
      riceType: p.rice_type,
      polishingRatio: p.polishing_ratio,
      amount: p.amount,
      hikomiDate: p.hikomi_date,
      moriDate: p.mori_date,
      dekojiDate: p.dekoji_date,
      kakeShikomiDate: p.kake_shikomi_date,
      shikomiDate: p.shikomi_date,
    })),
  };
}

// データベースが空かチェック
export async function isDatabaseEmpty(): Promise<boolean> {
  const { count, error } = await supabase
    .from('moromi_data')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;

  return count === 0;
}