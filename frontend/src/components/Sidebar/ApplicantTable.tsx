import { useStore } from '@/state/useStore';
import { abbrev } from '@/lib/featureAbbrev';
import { ExemplarRow } from '@/types/api';
import { useMemo, useState } from 'react';

export function ApplicantTable() {
  const exemplars = useStore((state) => state.exemplars);
  const neighbors = useStore((state) => state.neighbors);
  const selectedApplicant = useStore((state) => state.selectedApplicant);
  const pinnedApplicants = useStore((state) => state.pinnedApplicants);
  const selectApplicant = useStore((state) => state.selectApplicant);
  const predictions = useStore((state) => state.predictions);
  const selectedModel = useStore((state) => state.selectedModel);

  // Combine exemplars and neighbors
  const allApplicants = useMemo(() => {
    const combined: (ExemplarRow & { isExemplar: boolean })[] = [
      ...exemplars.map((e) => ({ ...e, isExemplar: true })),
      ...neighbors.map((n) => ({ ...n, isExemplar: false })),
    ];
    return combined;
  }, [exemplars, neighbors]);

  // Use all feature columns
  const displayFeatures = useMemo(() => {
    if (allApplicants.length === 0) return [] as string[];
    const firstApplicant = allApplicants[0];
    return Object.keys(firstApplicant.feature_values);
  }, [allApplicants]);

  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  const getPrediction = (applicant: ExemplarRow) => {
    const key = `${selectedModel}_${applicant.row_index}`;
    return predictions[key];
  };

  const isSelected = (applicant: ExemplarRow) => {
    return selectedApplicant?.row_index === applicant.row_index;
  };

  // Sorting
  const [sortKey, setSortKey] = useState<string>('__pred');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sortedApplicants = useMemo(() => {
    const arr = [...allApplicants];
    arr.sort((a, b) => {
      let va: any; let vb: any;
      if (sortKey === '__pred') {
        va = getPrediction(a) ?? -Infinity;
        vb = getPrediction(b) ?? -Infinity;
      } else {
        va = a.feature_values[sortKey as keyof typeof a.feature_values];
        vb = b.feature_values[sortKey as keyof typeof b.feature_values];
      }
      const na = Number(va); const nb = Number(vb);
      const bothNum = Number.isFinite(na) && Number.isFinite(nb);
      let cmp = 0;
      if (bothNum) cmp = na - nb; else cmp = String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [allApplicants, sortKey, sortAsc, predictions, selectedModel]);

  const onSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="p-4">
      {/* Pinned note (heading removed) */}
      {pinnedApplicants.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-primary-600 mt-1">
            📌 {pinnedApplicants.length} pinned for comparison
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th onClick={() => onSort('__pred')} className="text-left py-2 px-1 font-medium text-gray-700 cursor-pointer select-none">
                Pred {sortKey === '__pred' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              {displayFeatures.map((feat) => (
                <th
                  key={feat}
                  onClick={() => onSort(feat)}
                  className="text-left py-2 px-1 font-medium text-gray-700 text-xs cursor-pointer select-none"
                  title={feat}
                >
                  {abbrev(feat)} {sortKey === feat ? (sortAsc ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedApplicants.map((applicant) => (
              <tr
                key={applicant.row_index}
                className={`
                  border-b border-gray-100 cursor-pointer transition-colors
                  ${isSelected(applicant) ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-100'}
                `}
                onClick={() => selectApplicant(applicant)}
              >
                <td className="py-2 px-1">
                  {getPrediction(applicant) !== undefined ? (
                    <span
                      className={`text-xs font-medium ${
                        getPrediction(applicant)! > 0.5
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {(getPrediction(applicant)! * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                {displayFeatures.map((feat) => (
                  <td key={feat} className="py-2 px-1 text-xs text-gray-600">
                    {formatValue(applicant.feature_values[feat])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {allApplicants.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No applicants loaded</p>
          <p className="text-xs">Train a model to load exemplar applicants</p>
        </div>
      )}
    </div>
  );
}
