import React, { useState, useEffect } from "react";
import axios from "axios";
import ChatPanel from "./components/ChatPanel";
import MapPanel from "./components/MapPanel";
import SummaryPanel from "./components/SummaryPanel";
import "maplibre-gl/dist/maplibre-gl.css";

const API_SERVER = "https://clinical-trials-backend-pkak.onrender.com/";

function App() {
  const [geoJson, setGeoJson] = useState<any>({
    type: "FeatureCollection",
    features: [],
  });
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-97, 60]); // Canada center
  const [activeLocation, setActiveLocation] = useState(""); // location currently loaded in geoJson

  // Fetch initial all-trials data on load
  useEffect(() => {
    axios
      .get(`${API_SERVER}/api/trials`)
      .then((res) => {
        if (res.data) setGeoJson(res.data);
      })
      .catch(console.error);
  }, []);

  // Called by MapPanel search box — re-fetches at max radius for the new location
  const handleLocationFilter = (location: string) => {
    const params = new URLSearchParams();
    if (location) params.append("location", location);
    axios
      .get(`${API_SERVER}/api/trials?${params.toString()}`)
      .then((res) => {
        if (res.data) {
          setGeoJson(res.data);
          setActiveLocation(location);
          if (res.data.user_center) setMapCenter(res.data.user_center);
        }
      })
      .catch(console.error);
  };

  // Called by ChatPanel when it receives a chat response with new GeoJSON
  const handleGeoJsonUpdate = (newGeoJson: any, location?: string) => {
    setGeoJson(newGeoJson);
    if (location) setActiveLocation(location);
    if (newGeoJson.user_center) {
      setMapCenter(newGeoJson.user_center);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* LEFT: Chat Panel */}
      <div className="w-[400px] min-w-[320px] h-full border-r border-gray-200 bg-white flex flex-col shadow-lg z-10">
        <div className="px-5 py-4 bg-blue-700 text-white shrink-0">
          <h1 className="text-lg font-bold tracking-tight">
            🧬 Clinical Trial Finder
          </h1>
          <p className="text-blue-200 text-xs mt-0.5">
            Canada · Powered by Gemini 2.5 Flash
          </p>
        </div>
        <ChatPanel onGeoJsonUpdate={handleGeoJsonUpdate} />
      </div>

      {/* RIGHT: Map + overlaid Summary */}
      <div className="flex-1 h-full relative">
        <MapPanel
          geoJson={geoJson}
          mapCenter={mapCenter}
          onPinClick={setSelectedPin}
          activeLocation={activeLocation}
          onMapMove={(_bounds: any, _center: any) => {
            // Future: could trigger a re-fetch based on visible bounds
          }}
        />

        {/* Summary panel overlaid in bottom-right */}
        {selectedPin && (
          <div className="absolute bottom-6 right-6 z-20 w-80">
            <SummaryPanel
              pinData={selectedPin.properties}
              onClose={() => setSelectedPin(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
