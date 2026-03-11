import React from "react";
import { X, ExternalLink, MapPin, Activity, User } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Recruiting: "#10B981",
  "Enrolling by Invitation": "#34D399",
  "Not Yet Recruiting": "#F59E0B",
  "Active, Not Recruiting": "#3B82F6",
  Completed: "#6B7280",
  Terminated: "#EF4444",
  Suspended: "#F97316",
  Withdrawn: "#8B5CF6",
};

export default function SummaryPanel({ pinData, onClose }) {
  if (!pinData) return null;

  const headerColor = STATUS_COLORS[pinData.status] ?? "#6B7280";

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col">
      <div
        className="flex justify-between items-center p-3 text-white"
        style={{ backgroundColor: headerColor }}
      >
        <h3 className="font-semibold">{pinData.trial_id}</h3>
        <button
          onClick={onClose}
          className="hover:bg-black/20 p-1 rounded transition"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Activity size={18} className="text-gray-500 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Cancer Type
            </div>
            <div className="font-medium text-gray-900">
              {pinData.cancer_type}
            </div>
            <div className="text-sm text-gray-600">
              Status: {pinData.status}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin size={18} className="text-gray-500 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Location
            </div>
            <div className="font-medium text-gray-900">{pinData.facility}</div>
            <div className="text-sm text-gray-600">{pinData.city}</div>
            {pinData.distance_km && (
              <div className="text-sm text-blue-600 font-medium">
                {pinData.distance_km} km away
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <User size={18} className="text-gray-500 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Principal Investigator
            </div>
            <div className="font-medium text-gray-900">
              {pinData.principal_investigator}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-100">
        <a
          href={pinData.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-700 font-medium rounded hover:bg-blue-100 transition"
        >
          View Full Details <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}
