import React, { useRef, useEffect, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";

const MAPTILER_KEY = "xlTdluzApL6vPhFgW6Yn";

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

const DISTANCE_OPTIONS = [25, 50, 100, 200, 500];

interface MapFilters {
  cancerType: string;
  status: string;
  province: string;
  distanceKm: number | null;
}

interface MapPanelProps {
  geoJson: any;
  mapCenter: [number, number];
  onPinClick: (feature: any) => void;
  onMapMove: (bounds: any, center: any) => void;
  activeLocation: string;
}

export default function MapPanel({
  geoJson,
  mapCenter,
  onPinClick,
  onMapMove,
  activeLocation,
}: MapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<MapFilters>({
    cancerType: "",
    status: "",
    province: "",
    distanceKm: null,
  });

  // ── Derive available options from whatever geoJson is currently loaded ──
  const availableOptions = useMemo(() => {
    const features = geoJson?.features ?? [];
    const statuses = new Set<string>();
    const provinces = new Set<string>();
    const cancerTypes = new Set<string>();

    for (const f of features) {
      const p = f.properties;
      if (p.status) statuses.add(p.status);
      if (p.province?.trim()) provinces.add(p.province.trim());
      if (p.cancer_type) {
        // cancer_type can be pipe-separated; split and add each part
        for (const part of p.cancer_type.split("|")) {
          const t = part.trim();
          if (t) cancerTypes.add(t);
        }
      }
    }

    return {
      statuses: [...statuses].sort(),
      provinces: [...provinces].sort(),
      cancerTypes: [...cancerTypes].sort(),
    };
  }, [geoJson]);

  // Reset dropdown filters whenever the underlying dataset changes (new search result)
  // so stale selections from the previous search don't silently hide everything
  useEffect(() => {
    setFilters({ cancerType: "", status: "", province: "", distanceKm: null });
  }, [geoJson]);

  // ── Client-side filter on the received geoJson ──
  const filteredGeoJson = useMemo(() => {
    if (!geoJson?.features) return geoJson;
    const { cancerType, status, province, distanceKm } = filters;
    const features = geoJson.features.filter((f: any) => {
      const p = f.properties;
      if (status && p.status !== status) return false;
      if (province && (!p.province || p.province.trim() !== province))
        return false;
      if (
        cancerType &&
        (!p.cancer_type ||
          !p.cancer_type.toLowerCase().includes(cancerType.toLowerCase()))
      )
        return false;
      if (
        distanceKm !== null &&
        p.distance_km !== null &&
        p.distance_km !== undefined
      ) {
        if (p.distance_km > distanceKm) return false;
      }
      return true;
    });
    return { ...geoJson, features };
  }, [geoJson, filters]);

  const visibleCount = filteredGeoJson?.features?.length ?? 0;
  const totalCount = geoJson?.features?.length ?? 0;

  // Init map once
  useEffect(() => {
    if (map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [-97, 60],
      zoom: 3,
    });
    map.current.on("load", () => {
      map.current.addSource("trials", {
        type: "geojson",
        data: filteredGeoJson,
        cluster: true,
        clusterMaxZoom: 12, // stop clustering above zoom 12
        clusterRadius: 40, // px radius to merge points into a cluster
      });

      // Cluster bubble
      map.current.addLayer({
        id: "clusters",
        type: "circle",
        source: "trials",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#60A5FA",
            10, // blue  <10
            "#2563EB",
            50, // darker blue  10-50
            "#1E3A8A", // darkest  50+
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 50, 32],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Cluster count label
      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "trials",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });

      // Individual (unclustered) points
      map.current.addLayer({
        id: "trials-layer",
        type: "circle",
        source: "trials",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "status"],
            "Recruiting",
            "#10B981",
            "Enrolling by Invitation",
            "#34D399",
            "Not Yet Recruiting",
            "#F59E0B",
            "Active, Not Recruiting",
            "#3B82F6",
            "Completed",
            "#6B7280",
            "Terminated",
            "#EF4444",
            "Suspended",
            "#F97316",
            "Withdrawn",
            "#8B5CF6",
            "#9CA3AF",
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 5, 10, 9],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Click cluster → zoom in to expand it
      map.current.on("click", "clusters", (e: any) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0].properties.cluster_id;
        map.current
          .getSource("trials")
          .getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom,
            });
          });
      });

      map.current.on("click", "trials-layer", (e: any) => {
        if (e.features.length > 0) onPinClick(e.features[0]);
      });
      map.current.on("mouseenter", "clusters", () => {
        map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "clusters", () => {
        map.current.getCanvas().style.cursor = "";
      });
      map.current.on("mouseenter", "trials-layer", () => {
        map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "trials-layer", () => {
        map.current.getCanvas().style.cursor = "";
      });
      map.current.on("moveend", () => {
        const bounds = map.current.getBounds();
        const center = map.current.getCenter();
        onMapMove(bounds, [center.lng, center.lat]);
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push filtered GeoJSON to map source on every filter/data change
  useEffect(() => {
    if (!map.current) return;
    const src = map.current.getSource("trials");
    if (src) src.setData(filteredGeoJson);
  }, [filteredGeoJson]);

  // Fly to new center when driven by chat
  useEffect(() => {
    if (!map.current || !mapCenter) return;
    map.current.flyTo({ center: mapCenter, zoom: 10, essential: true });
  }, [mapCenter]);

  const handleClearFilters = () => {
    setFilters({ cancerType: "", status: "", province: "", distanceKm: null });
  };

  const activeFilterCount = [
    filters.cancerType,
    filters.status,
    filters.province,
    filters.distanceKm !== null ? "1" : "",
  ].filter(Boolean).length;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        ref={mapContainer}
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
      />

      {/* ── Filter Panel ── */}
      <div className="absolute top-4 left-4 z-10 w-72 shadow-xl rounded-xl overflow-hidden">
        {/* Header / toggle */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-100 hover:bg-gray-50 transition"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
            <SlidersHorizontal size={16} className="text-blue-600" />
            Filter Trials
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {visibleCount}
              {visibleCount !== totalCount ? `/${totalCount}` : ""}&nbsp;trial
              {visibleCount !== 1 ? "s" : ""} · zoom to expand
            </span>
            {filtersOpen ? (
              <ChevronUp size={15} className="text-gray-400" />
            ) : (
              <ChevronDown size={15} className="text-gray-400" />
            )}
          </div>
        </button>

        {filtersOpen && (
          <div className="bg-white/95 backdrop-blur-sm p-3 space-y-3">
            {/* Context: what location is currently loaded */}
            {activeLocation && (
              <p className="text-xs text-blue-600 truncate">
                📍 Results near <strong>{activeLocation}</strong>
              </p>
            )}

            {/* Distance — only shown when results carry distance data (location was searched) */}
            {activeLocation && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Max Distance
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DISTANCE_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          distanceKm: f.distanceKm === d ? null : d,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                        filters.distanceKm === d
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 text-gray-600 hover:border-blue-400"
                      }`}
                    >
                      {d} km
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status — options derived from loaded data */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
                disabled={availableOptions.statuses.length === 0}
              >
                <option value="">
                  All statuses
                  {availableOptions.statuses.length > 0
                    ? ` (${availableOptions.statuses.length})`
                    : ""}
                </option>
                {availableOptions.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Province — options derived from loaded data */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Province
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={filters.province}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, province: e.target.value }))
                }
                disabled={availableOptions.provinces.length === 0}
              >
                <option value="">
                  All provinces
                  {availableOptions.provinces.length > 0
                    ? ` (${availableOptions.provinces.length})`
                    : ""}
                </option>
                {availableOptions.provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Cancer Type — options derived from loaded data */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cancer Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={filters.cancerType}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, cancerType: e.target.value }))
                }
                disabled={availableOptions.cancerTypes.length === 0}
              >
                <option value="">
                  All types
                  {availableOptions.cancerTypes.length > 0
                    ? ` (${availableOptions.cancerTypes.length})`
                    : ""}
                </option>
                {availableOptions.cancerTypes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition font-medium"
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-md z-10 space-y-1.5 text-xs">
        <div className="font-semibold text-gray-700 text-sm mb-2">
          Trial Status
        </div>
        {Object.entries(STATUS_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span>{label}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 pt-1.5 mt-1.5 flex items-center gap-2 text-gray-500">
          <div
            className="w-5 h-5 rounded-full bg-[#2563EB] shrink-0 flex items-center justify-center text-white font-bold"
            style={{ fontSize: 9 }}
          >
            N
          </div>
          <span>Cluster — click to expand</span>
        </div>
      </div>
    </div>
  );
}
