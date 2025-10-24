import { useEffect, useState } from 'react';
import { useStore } from '@/state/useStore';
import { Sidebar } from '@/components/Sidebar';
import { RightPanel } from '@/components/RightPanel';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
          <p className="mt-4 text-gray-600">Loading Give Me Some Credit...</p>
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
      {/* Header - Mobile Responsive */}
      <div className="absolute top-0 left-0 right-0 h-14 md:h-16 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center justify-between h-full px-3 md:px-6">
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">
              Give Me Some Credit
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-14 md:pt-16">
        {/* Left Sidebar - Mobile: Full-screen overlay, Desktop: Fixed sidebar */}
        <div className={`
          ${isMobileMenuOpen ? 'fixed inset-0 z-50 bg-white pt-14' : 'hidden'}
          md:block md:relative md:w-96 md:pt-0
          border-r border-gray-200 bg-white overflow-hidden
        `}>
          {/* Mobile Close Button */}
          {isMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden absolute top-4 right-4 z-10 p-2 text-gray-600 hover:text-gray-900"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
        </div>

        {/* Right Panel - Always visible on mobile when sidebar is closed */}
        <div className={`
          flex-1 overflow-hidden
          ${isMobileMenuOpen ? 'hidden md:block' : 'block'}
        `}>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
