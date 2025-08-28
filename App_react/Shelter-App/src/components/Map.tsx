import { useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, LineLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";

const INITIAL_VIEW_STATE = {
  longitude: 17.0385,
  latitude: 51.1079,
  zoom: 14,
  pitch: 0,
  bearing: 0,
};

// Dane punktów
const blackPoints = [
  { position: [17.0385, 51.1079] }, // Rynek
];

const bluePoints = [
  { position: [17.05, 51.11] },
  { position: [17.04, 51.105] },
];

const redPoints = [
  { position: [17.06, 51.108] },
];

// Linie: każdy niebieski -> każdy czerwony
const lines = bluePoints.flatMap((blue) =>
  redPoints.map((red) => ({
    source: blue.position,
    target: red.position,
  }))
);

function Map() {
  const layers = useMemo(
    () => [
      // Podkład mapy OpenStreetMap
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

      new ScatterplotLayer({
        id: "black-points",
        data: blackPoints,
        getPosition: (d: any) => d.position,
        getFillColor: [0, 0, 0],
        getRadius: 10,
      }),

      new ScatterplotLayer({
        id: "blue-points",
        data: bluePoints,
        getPosition: (d: any) => d.position,
        getFillColor: [0, 0, 255],
        getRadius: 10,
      }),

      new ScatterplotLayer({
        id: "red-points",
        data: redPoints,
        getPosition: (d: any) => d.position,
        getFillColor: [255, 0, 0],
        getRadius: 10,
      }),

      new LineLayer({
        id: "blue-to-red-lines",
        data: lines,
        getSourcePosition: (d: any) => d.source,
        getTargetPosition: (d: any) => d.target,
        getColor: [0, 0, 200, 200],
        getWidth: 1,
      }),
    ],
    []
  );

  return (
    <>
    <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        style={{ width: "100%", height: "100%" }}
    />
    </>
  );
}

export default Map;
