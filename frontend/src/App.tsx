import { useEffect, useState } from 'react';
import { useStore } from '@/state/useStore';
import { Sidebar } from '@/components/Sidebar';
import { RightPanel } from '@/components/RightPanel';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadDataset = useStore((state) => state.loadDataset);
  const loadExemplars = useStore((state) => state.loadExemplars);
  const demoMode = useStore((state) => state.demoMode);

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load dataset
        await loadDataset();
        
        // Load initial exemplars
        await loadExemplars();
        
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Credit Model Observatory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Initialization Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Make sure the backend is running and the dataset is available at backend/data/cs-training.csv
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Credit Model Observatory
            </h1>
          </div>
          <div />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-16">
        {/* Left Sidebar */}
        <div className="w-96 border-r border-gray-200 bg-white overflow-hidden">
          <Sidebar />
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-hidden">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
