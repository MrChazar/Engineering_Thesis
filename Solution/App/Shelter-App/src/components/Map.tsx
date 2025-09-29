import { useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, LineLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import { type ShelterAllocationResponse, type AllocationPoint } from "../types/ShelterTypes";

const INITIAL_VIEW_STATE = {
  longitude: 17.0385,
  latitude: 51.1079,
  zoom: 14,
  pitch: 0,
  bearing: 0,
};

interface MapProps {
  data: ShelterAllocationResponse | undefined;
}

function Map({ data }: MapProps) {
  const [selected, setSelected] = useState<AllocationPoint | null>(null);

  const layers = useMemo(() => {
    if (!data) return [];

    const potentialShelters = data.points.filter(p => p.type === "potential_shelter");
    const builtShelters = data.points.filter(p => p.type === "built_shelter");
    const assigned_apartments = data.points.filter(p => p.type === "apartment" && p.assigned_to !== null);
    const unassigned_apartments = data.points.filter(p => p.type === "apartment" && p.assigned_to === null);

    const lines = assigned_apartments
      .map(a => {
        const shelter = data.points.find(p => p.id === a.assigned_to);
        return shelter ? { source: [a.x, a.y], target: [shelter.x, shelter.y] } : null;
      })
      .filter(l => l !== null);

    const commonLayerProps = {
      pickable: true,
      onClick: (info: any) => {
        if (info.object) {
          setSelected(info.object as AllocationPoint);
        }
      }
    };

    return [
      new TileLayer({
        id: "osm-tiles",
        data: "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        renderSubLayers: (props) => {
          const {
            bbox: { west, south, east, north },
          } = props.tile;

          return new BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [west, south, east, north],
          });
        },
      }),

      new ScatterplotLayer<AllocationPoint>({
        id: "potential-shelters",
        data: potentialShelters,
        getPosition: d => [d.x, d.y],
        getFillColor: [255, 0, 0],
        getRadius: 20,
        ...commonLayerProps
      }),

      new ScatterplotLayer<AllocationPoint>({
        id: "built-shelters",
        data: builtShelters,
        getPosition: d => [d.x, d.y],
        getFillColor: [0, 200, 0],
        getRadius: 20,
        ...commonLayerProps
      }),

      new ScatterplotLayer<AllocationPoint>({
        id: "unassigned-apartments",
        data: unassigned_apartments,
        getPosition: d => [d.x, d.y],
        getFillColor: [0, 0, 0],
        getRadius: 10,
        ...commonLayerProps
      }),

      new ScatterplotLayer<AllocationPoint>({
        id: "assigned-apartments",
        data: assigned_apartments,
        getPosition: d => [d.x, d.y],
        getFillColor: [230, 186, 11],
        getRadius: 10,
        ...commonLayerProps
      }),

      new LineLayer({
        id: "apartment-to-shelter",
        data: lines,
        getSourcePosition: d => d!.source,
        getTargetPosition: d => d!.target,
        getColor: [0, 0, 0],
        getWidth: 1.5,
      })
    ];
  }, [data]);

  return (
    <div className="relative w-full h-full">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        style={{ width: "100%", height: "100%" }}
      />
      
      {selected && (
        <div className="absolute bottom-4 left-4 bg-white shadow-lg p-4 rounded text-sm max-w-xs">
          {selected.type === "apartment" ? (
            <div className="text-black">
              <p><b>Apartment</b></p>
              <p>id: {selected.id}</p>
              <p>x: {selected.x}, y: {selected.y}</p>
              <p>assigned_to: {selected.assigned_to ?? "none"}</p>
            </div>
          ) : (
            <div className="text-black">
              <p><b>Shelter</b></p>
              <p>id: {selected.id}</p>
              <p>x: {selected.x}, y: {selected.y}</p>
              <p>cost: {selected.cost ?? "unknown"}</p>
              <p>apartments assigned: {
                data?.points.filter(p => p.type === "apartment" && p.assigned_to === selected.id).length
              }</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Map;
