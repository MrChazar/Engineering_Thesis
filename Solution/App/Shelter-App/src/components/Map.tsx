import { useMemo } from "react";
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
  debugger
  const layers = useMemo(() => {
    if (!data) return [];

    const potentialShelters = data.points.filter(p => p.type === "potential_shelter");
    const builtShelters = data.points.filter(p => p.type === "built_shelter");
    const apartments = data.points.filter(p => p.type === "apartment");
    
    const lines = apartments
      .filter(a => a.assigned_to !== null)
      .map(a => {
        const shelter = data.points.find(p => p.id === a.assigned_to);
        if (!shelter) return null;
        return {
          source: [a.x, a.y],
          target: [shelter.x, shelter.y]
        };
      })
      .filter(l => l !== null);

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
        getFillColor: [255, 0, 0], // czerwony
        getRadius: 20,
      }),

      new ScatterplotLayer<AllocationPoint>({
        id: "built-shelters",
        data: builtShelters,
        getPosition: d => [d.x, d.y],
        getFillColor: [0, 200, 0], // zielony
        getRadius: 20,
      }),

      new ScatterplotLayer<AllocationPoint>({
        id: "apartments",
        data: apartments,
        getPosition: d => [d.x, d.y],
        getFillColor: [255, 255, 255], // biały
        getRadius: 10,
      }),

      new LineLayer({
        id: "apartment-to-shelter",
        data: lines,
        getSourcePosition: d => d!.source,
        getTargetPosition: d => d!.target,
        getColor: [0, 0, 0], // czarny
        getWidth: 1.5,
      })
    ];
  }, [data]);

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={layers}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default Map;
