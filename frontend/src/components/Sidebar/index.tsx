import { useMemo, useState } from 'react';
import { FEATURE_EXPLANATION, abbrev } from '@/lib/featureAbbrev';
import { useStore } from '@/state/useStore';
import { DistributionOverview } from './DistributionOverview';
import { FeatureSelector } from './FeatureSelector';
import { ApplicantTable } from './ApplicantTable';
import { ModelParametersSelector } from './ModelParametersSelector';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<'training' | 'distribution' | 'applicants'>('training');
  const filters = useStore((s) => s.filters);
  const selectedFeatures = useStore((s) => s.selectedFeatures);
  const isTraining = useStore((s) => s.isTraining);
  const trainModel = useStore((s) => s.trainModel);

  const filterChips = useMemo(() => Object.entries(filters) as [string, [number, number]][], [filters]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {/* Single leftmost help icon with hover panel */}
        <div className="px-2 flex items-center relative group">
          <span className="cursor-help text-gray-500 select-none">?</span>
          <div className="hidden group-hover:block fixed left-3 top-14 z-[99999] w-auto rounded-md border border-gray-200 bg-white shadow-2xl p-4 text-[11px] text-gray-700 pointer-events-none">
            {/* Target variable only */}
            <div className="flex gap-3 items-start">
              <span className="w-16 shrink-0 font-mono text-gray-900 text-[10px] font-semibold">TARGET</span>
              <span className="flex-1 leading-relaxed text-[10px]">Person experienced 90 days past due delinquency or worse (1 for yes, 0 for no)</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('training')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'training'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Training
        </button>
        <button
          onClick={() => setActiveTab('distribution')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'distribution'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Data Explorer
        </button>
        <button
          onClick={() => setActiveTab('applicants')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'applicants'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Applicants
        </button>
      </div>

      {/* Tab Content: enable scroll for applicants, training handles its own scroll */}
      <div className={`flex-1 relative ${activeTab === 'applicants' ? 'overflow-auto' : 'overflow-hidden'}`}>
        {activeTab === 'distribution' && <DistributionOverview />}
        {activeTab === 'training' && (
          <div className="h-full flex flex-col">
            <ModelParametersSelector />
            <FeatureSelector />
          </div>
        )}
        {activeTab === 'applicants' && <ApplicantTable />}
      </div>
    </div>
  );
}
