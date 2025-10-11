import { useState } from 'react'; 
import Dashboard from './components/Dashboard';
import CSVUpdate from './components/CSVUpdate';
import ShiftCalendar from './components/ShiftCalendar';
import StaffManagement from './components/StaffManagement';
import { useData } from './hooks/useData';

type Page = 'dashboard' | 'csv-update' | 'shift';

export default function App() {
  const dataContext = useData();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

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
      <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-xl no-print">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold">もろみ管理システム</h1>
            <div className="flex gap-4">
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
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        {currentPage === 'dashboard' && (
          <>
            <div className="mb-6 flex items-center gap-4">
              <label className="text-lg font-semibold text-slate-700">醸造年度:</label>
              <select
                value={dataContext.currentBY}
                onChange={(e) => dataContext.setCurrentBY(Number(e.target.value))}
                className="px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {dataContext.availableBYs.map((by) => (
                  <option key={by} value={by}>
                    {by}
                  </option>
                ))}
              </select>
            </div>
           <Dashboard
  moromiData={dataContext.moromiData}
  moromiProcesses={dataContext.moromiProcesses}
  getProcessesByMoromi={dataContext.getProcessesByMoromi}
/>
          </>
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
  />
)}

        {currentPage === 'csv-update' && (
          <CSVUpdate 
            saveMoromiData={dataContext.saveMoromiData}
            getAllData={dataContext.getAllData}
          />
        )}
      </main>
    </div>
  );
}