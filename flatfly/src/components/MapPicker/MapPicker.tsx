import { useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type MapPickerProps = {
  center: [number, number];
  point: [number, number] | null;
  onPointChange: (lat: number, lng: number) => void;
};

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom(), { animate: true });
  return null;
}

function ClickHandler({ onPointChange }: { onPointChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPointChange(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function MapPicker({ center, point, onPointChange }: MapPickerProps) {
  const markerPosition = useMemo<[number, number]>(() => {
    if (point && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
      return point;
    }
    return center;
  }, [point, center]);

  return (
    <div className="relative z-0 w-full h-[320px] max-[770px]:h-[280px] rounded-2xl overflow-hidden border border-[#E0E0E0] dark:border-gray-600">
      <MapContainer
        center={center}
        zoom={13}
        className="relative z-0 w-full h-full"
        style={{ zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          referrerPolicy="origin"
        />
        <RecenterMap center={center} />
        <ClickHandler onPointChange={onPointChange} />
        <Marker
          position={markerPosition}
          draggable={true}
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target;
              const pos = marker.getLatLng();
              onPointChange(pos.lat, pos.lng);
            },
          }}
        />
      </MapContainer>
    </div>
  );
}
