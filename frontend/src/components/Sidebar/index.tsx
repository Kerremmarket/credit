import { useState } from 'react';
import { DistributionOverview } from './DistributionOverview';
import { FeatureSelector } from './FeatureSelector';
import { ApplicantTable } from './ApplicantTable';
import { ModelParametersSelector } from './ModelParametersSelector';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'training' | 'distribution' | 'applicants'>('training');

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation - Responsive */}
      <div className="flex border-b border-gray-200">
        {/* Help tooltip for target definition */}
        <div className="px-1 md:px-2 flex items-center relative group">
          <span className="cursor-help text-gray-500 select-none text-sm">?</span>
          <div className="hidden group-hover:block fixed left-2 md:left-3 top-12 md:top-14 z-[99999] w-[90vw] md:w-auto max-w-md rounded-md border border-gray-200 bg-white shadow-2xl p-3 md:p-4 text-[10px] md:text-[11px] text-gray-700 pointer-events-none">
            <div className="flex gap-2 md:gap-3 items-start">
              <span className="w-14 md:w-16 shrink-0 font-mono text-gray-900 text-[9px] md:text-[10px] font-semibold">TARGET</span>
              <span className="flex-1 leading-relaxed text-[9px] md:text-[10px]">Person experienced 90 days past due delinquency or worse (1 for yes, 0 for no)</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('training')}
          className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors ${
            activeTab === 'training'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Training
        </button>
        <button
          onClick={() => setActiveTab('distribution')}
          className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors ${
            activeTab === 'distribution'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="hidden sm:inline">Data Explorer</span>
          <span className="sm:hidden">Data</span>
        </button>
        <button
          onClick={() => setActiveTab('applicants')}
          className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors ${
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
