import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import CSVUpdate from './components/CSVUpdate';
import { getAvailableBYs } from './utils/database';

type Page = 'dashboard' | 'csv-update';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [availableBYs, setAvailableBYs] = useState<number[]>([]);
  const [currentBY, setCurrentBY] = useState<number>(2025);

  useEffect(() => {
    loadBYs();
  }, []);

  const loadBYs = () => {
    const bys = getAvailableBYs();
    setAvailableBYs(bys);
    if (bys.length > 0) {
      setCurrentBY(bys[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <h1 className="text-3xl font-bold tracking-tight text-white">もろみ管理システム</h1>
            
            {availableBYs.length > 0 && (
              <div className="flex items-center gap-3">
                <select
                  value={currentBY}
                  onChange={(e) => setCurrentBY(Number(e.target.value))}
                  className="px-4 py-2 bg-blue-800 border-2 border-blue-600 rounded-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {availableBYs.map(year => (
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
        {currentPage === 'dashboard' && <Dashboard currentBY={currentBY} />}
        {currentPage === 'csv-update' && <CSVUpdate onDataLoaded={loadBYs} />}
      </main>
    </div>
  );
}

export default App;