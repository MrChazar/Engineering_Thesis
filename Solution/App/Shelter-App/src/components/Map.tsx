import { useMemo, useState, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, LineLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import { type ShelterAllocationResponse, type AllocationPoint } from "../types/ShelterTypes";
import { apiService } from "../api";

// set on Wrocław
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
  const [localData, setLocalData] = useState<ShelterAllocationResponse | undefined>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // for data storage
  const [selected, setSelected] = useState<AllocationPoint | null>(null);
  const [coordinate, setCoordinate] = useState<number[] | null>(null);
  const [addPanel, setAddPanel] = useState<boolean>(false);

  const [formType, setFormType] = useState<"shelter" | "apartment">("shelter");
  const [capacity, setCapacity] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [x, setX] = useState<number | null>(null);
  const [y, setY] = useState<number | null>(null);

  const [editPanel, setEditPanel] = useState<boolean>(false);
  const [editX, setEditX] = useState<number | null>(null);
  const [editY, setEditY] = useState<number | null>(null);
  const [editCapacity, setEditCapacity] = useState<number>(0);
  const [editCost, setEditCost] = useState<number>(0);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  // for adding points by clicking q
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        setAddPanel(true);
        setSelected(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const layers = useMemo(() => {
    if (!localData) return [];

    const potentialShelters = localData.points.filter(p => p.type === "potential_shelter");
    const builtShelters = localData.points.filter(p => p.type === "built_shelter");
    const assigned_apartments = localData.points.filter(p => p.type === "apartment" && p.assigned_to !== null);
    const unassigned_apartments = localData.points.filter(p => p.type === "apartment" && p.assigned_to === null);

    const lines = assigned_apartments
      .map(a => {
        const shelter = localData.points.find(p => p.id === a.assigned_to);
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
  }, [localData]);

  const generateLocalId = () => Math.max(0, ...(localData?.points.map((p) => p.id) || [0])) + 1;

  // for adding new shelters, residential buildings
  const handleAdd = async () => {
    if (x === null || y === null) return;

    try {
      if (formType === "shelter") {
        await apiService.addShelter({ x, y, capacity, cost });
        const newPoint: AllocationPoint = {
          id: generateLocalId(),
          type: "potential_shelter",
          x,
          y,
          cost,
          capacity,
          assigned_to: null,
        };
        setLocalData((prev) =>
          prev ? { ...prev, points: [...prev.points, newPoint] } : prev
        );
        setSuccessMessage("Dodano nowy schron!");
      } else {
        await apiService.addResidentialBuilding({ x, y });
        const newPoint: AllocationPoint = {
          id: generateLocalId(),
          type: "apartment",
          x,
          y,
          cost: null,
          capacity: 0,
          assigned_to: null,
        };
        setLocalData((prev) =>
          prev ? { ...prev, points: [...prev.points, newPoint] } : prev
        );
        setSuccessMessage("Dodano nowy budynek mieszkalny!");
      }
      setAddPanel(false);
    } catch (e) {
      alert("Błąd podczas dodawania punktu");
    }
  };

  // for editing shelter and residential building informations
  const handleEdit = async () => {
    if (!selected) return;
    try {
      if (selected.type === "apartment") {
        await apiService.editResidentialBuilding({
          id: selected.id,
          x: editX ?? selected.x,
          y: editY ?? selected.y,
        });
        setLocalData((prev) =>
          prev
            ? {
                ...prev,
                points: prev.points.map((p) =>
                  p.id === selected.id
                    ? { ...p, x: editX ?? p.x, y: editY ?? p.y }
                    : p
                ),
              }
            : prev
        );
        setSuccessMessage("Zaktualizowano budynek mieszkalny!");
      } else {
        await apiService.editShelter({
          id: selected.id,
          x: editX ?? selected.x,
          y: editY ?? selected.y,
          capacity: editCapacity ?? selected.capacity,
          cost: editCost ?? selected.cost ?? 0,
        });
        setLocalData((prev) =>
          prev
            ? {
                ...prev,
                points: prev.points.map((p) =>
                  p.id === selected.id
                    ? {
                        ...p,
                        x: editX ?? p.x,
                        y: editY ?? p.y,
                        capacity: editCapacity ?? p.capacity,
                        cost: editCost ?? p.cost,
                      }
                    : p
                ),
              }
            : prev
        );
        setSuccessMessage("Zaktualizowano schron!");
      }
      setEditPanel(false);
      setSelected(null);
    } catch (e) {
      alert("Błąd podczas edycji punktu");
    }
  };


  // for deleting
  const handleDelete = async () => {
    if (!selected) return;
    const confirmed = confirm("Czy na pewno chcesz usunąć ten punkt?");
    if (!confirmed) return;

    try {
      if (selected.type === "apartment") {
        await apiService.deleteResidentialBuilding(selected.id);
        setSuccessMessage("Usunięto budynek mieszkalny!");
      } else {
        await apiService.deleteShelter(selected.id);
        setSuccessMessage("Usunięto schron!");
      }
      setLocalData((prev) =>
        prev
          ? { ...prev, points: prev.points.filter((p) => p.id !== selected.id) }
          : prev
      );
      setSelected(null);
    } catch (e) {
      alert("Błąd podczas usuwania punktu");
    }
  };

  return (
    <div className="relative w-full h-full">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        style={{ width: "100%", height: "100%" }}
        onHover={(info) => {
          if (info.coordinate && !addPanel) {
            setCoordinate([info.coordinate[0], info.coordinate[1]]);
            setX(info.coordinate[0]);
            setY(info.coordinate[1]);
          }
        }}

        onClick={(info) => {
          if (!info.object) {
            setSelected(null);
          }
        }}
      />

      {coordinate && (
        <div className="absolute bottom-4 right-4 bg-white shadow-lg p-4 rounded text-sm max-w-xs">
          <button 
            onClick={() => setAddPanel(true)} 
            className="bg-primary text-white px-3 py-1 rounded"
          >
            Dodaj
          </button>
          <div className="text-black mt-2">
            <p>X: {coordinate[0].toFixed(6)}</p>
            <p>Y: {coordinate[1].toFixed(6)}</p>
          </div>
        </div>
      )}

      {addPanel && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white text-black p-6 rounded shadow-xl w-96">
            <h2 className="text-lg font-bold mb-4">Dodaj punkt</h2>
            
            <label className="block mb-2">
              Typ:
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as "shelter" | "apartment")}
                className="border p-1 ml-2"
              >
                <option value="shelter">Shelter</option>
                <option value="apartment">Apartment</option>
              </select>
            </label>

            <label className="block mb-2">
              X:
              <input
                type="number"
                value={x ?? ""}
                onChange={(e) => setX(Number(e.target.value))}
                className="border ml-2 p-1 w-32"
                step="0.000001"
              />
           </label>

            <label className="block mb-2">
              Y:
              <input
                type="number"
                value={y ?? ""}
                onChange={(e) => setY(Number(e.target.value))}
                className="border ml-2 p-1 w-32"
                step="0.000001"
              />
            </label>

            {formType === "shelter" && (
              <>
                <label className="block mb-2">
                  Capacity:
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="border ml-2 p-1 w-24"
                  />
                </label>

                <label className="block mb-2">
                  Cost:
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="border ml-2 p-1 w-24"
                  />
                </label>
              </>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setAddPanel(false)}
                className="mr-2 px-3 py-1 border rounded"
              >
                Anuluj
              </button>
              <button
                onClick={handleAdd}
                className="px-3 py-1 bg-primary text-white rounded"
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="absolute top-4 right-4 bg-primary text-white px-4 py-2 rounded shadow">
          {successMessage}
          <button 
            className="ml-2 font-bold"
            onClick={() => setSuccessMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {selected && (
        <div className="absolute bottom-4 left-4 bg-white shadow-lg p-4 rounded text-sm max-w-xs">
          {selected.type === "apartment" ? (
            <div className="text-black">
              <p><b>Apartment</b></p>
              <p>id: {selected.id}</p>
              <p>x: {selected.x.toFixed(6)}, y: {selected.y.toFixed(6)}</p>
              <p>assigned_to: {selected.assigned_to ?? "none"}</p>
            </div>
          ) : (
            <div className="text-black">
              <p><b>Shelter</b></p>
              <p>id: {selected.id}</p>
              <p>x: {selected.x.toFixed(6)}, y: {selected.y.toFixed(6)}</p>
              <p>cost: {selected.cost ?? "unknown"}</p>
              <p>capacity: {selected.capacity ?? "unknown"}</p>
              <p>apartments assigned: {
                data?.points.filter(p => p.type === "apartment" && p.assigned_to === selected.id).length
              }</p>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              className="bg-primary text-white px-3 py-1 rounded"
              onClick={() => {
                setEditX(selected.x);
                setEditY(selected.y);
                setEditCapacity(selected.capacity);
                setEditCost(selected.cost ?? 0);
                setEditPanel(true);
              }}
            >
              Edytuj
            </button>
            <button
              className="bg-red-600 text-white px-3 py-1 rounded"
              onClick={handleDelete}
            >
              Usuń
            </button>
          </div>
        </div>
      )}

      {editPanel && selected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white text-black p-6 rounded shadow-xl w-96">
            <h2 className="text-lg font-bold mb-4">Edytuj punkt</h2>

            <label className="block mb-2">
              X:
              <input
                type="number"
                value={editX ?? selected.x}
                onChange={(e) => setEditX(Number(e.target.value))}
                className="border ml-2 p-1 w-32"
                step="0.000001"
              />
            </label>

            <label className="block mb-2">
              Y:
              <input
                type="number"
                value={editY ?? selected.y}
                onChange={(e) => setEditY(Number(e.target.value))}
                className="border ml-2 p-1 w-32"
                step="0.000001"
              />
            </label>

            {selected.type !== "apartment" && (
              <>
                <label className="block mb-2">
                  Capacity:
                  <input
                    type="number"
                    value={editCapacity ?? selected.capacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="border ml-2 p-1 w-24"
                  />
                </label>

                <label className="block mb-2">
                  Cost:
                  <input
                    type="number"
                    value={editCost ?? selected.cost ?? 0}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="border ml-2 p-1 w-24"
                  />
                </label>
              </>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setEditPanel(false)}
                className="mr-2 px-3 py-1 border rounded"
              >
                Anuluj
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-primary text-white rounded"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
    )}
    </div>
  );
}

export default Map;
