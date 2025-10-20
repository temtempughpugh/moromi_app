import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import CSVUpdate from './components/CSVUpdate';
import ShiftCalendar from './components/ShiftCalendar';
import DekojiPage from './components/DekojiPage';
import TaskManagement from './components/TaskManagement';  // ← 追加
import JosoHyokaComponent from './components/JosoHyoka';
import JosoCommentAlert from './components/JosoCommentAlert';
import { useData } from './hooks/useData';




type Page = 'dashboard' | 'shift' | 'csv-update' | 'dekoji' | 'task-management' | 'joso-hyoka';
export default function App() {
  const dataContext = useData();
useEffect(() => {
  const handleNavigate = (e: CustomEvent) => {
    setDekojiDate(e.detail.date);
    setCurrentPage('dekoji');
  };
  
  window.addEventListener('navigateToDekojiPage', handleNavigate as EventListener);
  return () => window.removeEventListener('navigateToDekojiPage', handleNavigate as EventListener);
}, []);

const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showJosoAlert, setShowJosoAlert] = useState(true); // ← 追加
const [dekojiDate, setDekojiDate] = useState<string>('');
  
  useEffect(() => {
  const preventSwipeBack = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const target = e.target as HTMLElement;
      
      // スクロール可能な親要素を探す（クラス名でも判定）
      let scrollableParent: HTMLElement | null = target;
      while (scrollableParent && scrollableParent !== document.documentElement) {
        const overflowX = window.getComputedStyle(scrollableParent).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') {
          break;
        }
        scrollableParent = scrollableParent.parentElement;
      }
      
      // スクロール可能な要素が見つからない場合はdocument.documentElementを使用
      if (!scrollableParent || scrollableParent === document.documentElement) {
        scrollableParent = document.documentElement;
      }
      
      const isAtLeft = scrollableParent.scrollLeft <= 1;
      
      // 左端で左スワイプの場合のみ防止
      if (e.deltaX < 0 && isAtLeft) {
        e.preventDefault();
      }
    }
  };

  window.addEventListener('wheel', preventSwipeBack, { passive: false });
  return () => window.removeEventListener('wheel', preventSwipeBack);
}, []);

  if (dataContext.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg font-medium">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-xl">
  <div className="container mx-auto px-4 md:px-6 py-4">
    <div className="flex justify-between items-center">
      {/* 左側 - タイトルと年度選択 */}
      <div className="flex items-center gap-2 md:gap-6">
        <h1 className="text-lg md:text-2xl font-bold">もろみ管理</h1>
        <div className="flex items-center gap-1 md:gap-2">
          <label className="text-xs md:text-sm font-semibold hidden md:inline">醸造年度:</label>
          <select
            value={dataContext.currentBY}
            onChange={(e) => dataContext.setCurrentBY(Number(e.target.value))}
            className="px-2 md:px-3 py-1 bg-white text-blue-900 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold text-sm"
          >
            {dataContext.availableBYs.map((by) => (
              <option key={by} value={by}>
                {by}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PC版 - ナビゲーションボタン */}
      <div className="hidden md:flex gap-2">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className={`px-4 py-2 rounded transition ${
            currentPage === 'dashboard'
              ? 'bg-white text-blue-900 font-bold'
              : 'hover:bg-blue-800'
          }`}
        >
          ダッシュボード
        </button>
        <button
          onClick={() => setCurrentPage('shift')}
          className={`px-4 py-2 rounded transition ${
            currentPage === 'shift'
              ? 'bg-white text-blue-900 font-bold'
              : 'hover:bg-blue-800'
          }`}
        >
          シフト表
        </button>
        <button
          onClick={() => setCurrentPage('task-management')}
          className={`px-4 py-2 rounded transition ${
            currentPage === 'task-management'
              ? 'bg-white text-blue-900 font-bold'
              : 'hover:bg-blue-800'
          }`}
        >
          📋 タスク管理
        </button>
        <button
  onClick={() => setCurrentPage('joso-hyoka')}
  className={`px-4 py-2 rounded transition ${
    currentPage === 'joso-hyoka'
      ? 'bg-white text-blue-900 font-bold'
      : 'hover:bg-blue-800'
  }`}
>
  上槽一覧
</button>
        <button
          onClick={() => setCurrentPage('csv-update')}
          className={`px-4 py-2 rounded transition ${
            currentPage === 'csv-update'
              ? 'bg-white text-blue-900 font-bold'
              : 'hover:bg-blue-800'
          }`}
        >
          CSV更新
        </button>
      </div>

      {/* スマホ版 - ハンバーガーメニューボタン */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden p-2 hover:bg-blue-800 rounded"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
    </div>

    {/* スマホ版 - メニュー展開 */}
    {isMobileMenuOpen && (
      <div className="md:hidden mt-4 space-y-2">
        <button
          onClick={() => {
            setCurrentPage('dashboard');
            setIsMobileMenuOpen(false);
          }}
          className={`w-full text-left px-4 py-3 rounded transition ${
            currentPage === 'dashboard'
              ? 'bg-white text-blue-900 font-bold'
              : 'bg-blue-800 hover:bg-blue-700'
          }`}
        >
          📊 ダッシュボード
        </button>
        <button
          onClick={() => {
            setCurrentPage('shift');
            setIsMobileMenuOpen(false);
          }}
          className={`w-full text-left px-4 py-3 rounded transition ${
            currentPage === 'shift'
              ? 'bg-white text-blue-900 font-bold'
              : 'bg-blue-800 hover:bg-blue-700'
          }`}
        >
          📅 シフト表
        </button>
        <button
          onClick={() => {
            setCurrentPage('task-management');
            setIsMobileMenuOpen(false);
          }}
          className={`w-full text-left px-4 py-3 rounded transition ${
            currentPage === 'task-management'
              ? 'bg-white text-blue-900 font-bold'
              : 'bg-blue-800 hover:bg-blue-700'
          }`}
        >
          📋 タスク管理
        </button>
        <button
  onClick={() => {setCurrentPage('joso-hyoka'); setIsMobileMenuOpen(false);}}
  className={`w-full text-left px-4 py-3 rounded transition ${
    currentPage === 'joso-hyoka'
      ? 'bg-white text-blue-900 font-bold'
      : 'bg-blue-800 hover:bg-blue-700'
  }`}
>
  🍶 上槽一覧
</button>
        <button
          onClick={() => {
            setCurrentPage('csv-update');
            setIsMobileMenuOpen(false);
          }}
          className={`w-full text-left px-4 py-3 rounded transition ${
            currentPage === 'csv-update'
              ? 'bg-white text-blue-900 font-bold'
              : 'bg-blue-800 hover:bg-blue-700'
          }`}
        >
          📄 CSV更新
        </button>
      </div>
    )}
  </div>
</nav>

{/* 上槽コメント未提出アラート */}
      {showJosoAlert && (
        <div className="container mx-auto px-4 pt-6">
          <JosoCommentAlert
            moromiData={dataContext.moromiData}
            josoHyokaList={dataContext.josoHyokaList}
            staffList={dataContext.staffList}
            currentBY={dataContext.currentBY}
            onClose={() => setShowJosoAlert(false)}
          />
        </div>
      )}

      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8">
        {currentPage === 'dashboard' && (
  <Dashboard 
    moromiData={dataContext.moromiData}
    moromiProcesses={dataContext.moromiProcesses}
    getProcessesByMoromi={dataContext.getProcessesByMoromi}
    saveMoromiData={dataContext.saveMoromiData}
    loadMoromiByBY={dataContext.loadMoromiByBY}
    currentBY={dataContext.currentBY}
    dataContext={dataContext}  // ← 追加
  />
)}
          
        {currentPage === 'shift' && (
  <ShiftCalendar
    currentShiftMonth={dataContext.currentShiftMonth}
    setCurrentShiftMonth={dataContext.setCurrentShiftMonth}
    staffList={dataContext.staffList}
    shifts={dataContext.shifts}
    monthlySettings={dataContext.monthlySettings}
    memoRow={dataContext.memoRow}
    riceDelivery={dataContext.riceDelivery}
    moromiData={dataContext.moromiData}
    moromiProcesses={dataContext.moromiProcesses}
    saveShifts={dataContext.saveShifts}
    saveMonthlySettings={dataContext.saveMonthlySettings}
    saveMemoRow={dataContext.saveMemoRow}
    saveRiceDelivery={dataContext.saveRiceDelivery}
    saveStaff={dataContext.saveStaff}
  deleteStaff={dataContext.deleteStaff}
weeklyDuties={dataContext.weeklyDuties}
  saveWeeklyDuties={dataContext.saveWeeklyDuties}
/>
)}

        {currentPage === 'csv-update' && (
          <CSVUpdate 
            saveMoromiData={dataContext.saveMoromiData}
            getAllData={dataContext.getAllData}
          />
        )}
        {currentPage === 'dekoji' && (
  <DekojiPage 
    dataContext={dataContext}
    dekojiDate={dekojiDate}
    onBack={() => setCurrentPage('dashboard')}
  />
)}

{currentPage === 'task-management' && (
  <TaskManagement 
    dataContext={dataContext}
    onClose={() => setCurrentPage('dashboard')}
  />
)}

{currentPage === 'joso-hyoka' && (
  <JosoHyokaComponent
    moromiData={dataContext.moromiData}
    josoHyokaList={dataContext.josoHyokaList}
    staffList={dataContext.staffList}
    saveJosoHyoka={dataContext.saveJosoHyoka}
    currentBY={dataContext.currentBY}
  />
)}
      </main>
    </div>
  );
}