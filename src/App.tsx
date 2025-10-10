import { useState } from 'react';
import Dashboard from './components/Dashboard';
import CSVUpdate from './components/CSVUpdate';
import { useData } from './hooks/useData';

type Page = 'dashboard' | 'csv-update';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const dataContext = useData();

  if (dataContext.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-700 mx-auto mb-4"></div>
          <p className="text-xl font-bold text-blue-900">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <h1 className="text-3xl font-bold tracking-tight text-white">もろみ管理システム</h1>
            
            {dataContext.availableBYs.length > 0 && (
              <div className="flex items-center gap-3">
                <select
                  value={dataContext.currentBY}
                  onChange={(e) => dataContext.setCurrentBY(Number(e.target.value))}
                  className="px-4 py-2 bg-blue-800 border-2 border-blue-600 rounded-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {dataContext.availableBYs.map(year => (
                    <option key={year} value={year}>BY{year}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-5 py-2.5 rounded-lg font-bold transition-all duration-200 ${
                  currentPage === 'dashboard'
                    ? 'bg-white text-blue-700 shadow-lg'
                    : 'bg-blue-800 hover:bg-blue-700 text-blue-100'
                }`}
              >
                📊 ダッシュボード
              </button>
              <button
                onClick={() => setCurrentPage('csv-update')}
                className={`px-5 py-2.5 rounded-lg font-bold transition-all duration-200 ${
                  currentPage === 'csv-update'
                    ? 'bg-white text-blue-700 shadow-lg'
                    : 'bg-blue-800 hover:bg-blue-700 text-blue-100'
                }`}
              >
                🔄 CSV更新
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6">
        {currentPage === 'dashboard' && <Dashboard currentBY={dataContext.currentBY} getMoromiByBY={dataContext.getMoromiByBY} getProcessesByMoromi={dataContext.getProcessesByMoromi} />}
        {currentPage === 'csv-update' && <CSVUpdate onDataLoaded={dataContext.refreshBYs} getAllData={dataContext.getAllData} saveMoromiData={dataContext.saveMoromiData} />}
      </main>
    </div>
  );
}

export default App;