import { useMemo, useState, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, LineLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import {
  type ShelterAllocationResponse,
  type AllocationPoint,
} from "../types/ShelterTypes";
import { apiService } from "../Api";

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

  // variables
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
  const [assigningApartmentId, setAssigningApartmentId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAllAssignments, setShowAllAssignments] = useState(false);


  const toggleFullscreen = () => {
    const mapContainer = document.getElementById("map-container");
    if (!document.fullscreenElement) {
      mapContainer?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        setAddPanel(true);
        setSelected(null);
      }
    };

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    setIsFullscreen(Boolean(document.fullscreenElement));

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

 

  const handleActivateShelter = () => {
    if (!selected || selected.type !== "potential_shelter") return;

    const shelterId = selected.id;
    let updatedPoint: AllocationPoint | undefined;

    setLocalData((prev) => {
      if (!prev) return prev;
      const newPoints = prev.points.map((p) => {
        if (p.id === shelterId) {
          updatedPoint = { ...p, type: "built_shelter" };
          return updatedPoint;
        }
        return p;
      });
      return { ...prev, points: newPoints };
    });

    // Zaktualizuj 'selected', aby panel odzwierciedlał zmianę
    if (updatedPoint) {
      setSelected(updatedPoint);
    }
    setSuccessMessage("Aktywowano schron!");
  };

  const handleAssignApartment = (apartmentId: number, shelterId: number) => {
    setLocalData((prev) => {
      if (!prev) return prev;
      const newPoints = prev.points.map((p) => {
        if (p.id === apartmentId) {
          return { ...p, assigned_to: shelterId };
        }
        return p;
      });
      return { ...prev, points: newPoints };
    });

    setSuccessMessage("Przypisano obiekt do schronu!");
    setAssigningApartmentId(null);
  };

  const handleUnassignApartment = () => {
    if (
      !selected ||
      selected.type !== "apartment" ||
      selected.assigned_to === null
    )
      return;

    const apartmentId = selected.id;
    let updatedPoint: AllocationPoint | undefined;

    setLocalData((prev) => {
      if (!prev) return prev;
      const newPoints = prev.points.map((p) => {
        if (p.id === apartmentId) {
          updatedPoint = { ...p, assigned_to: null };
          return updatedPoint;
        }
        return p;
      });
      return { ...prev, points: newPoints };
    });

    if (updatedPoint) {
      setSelected(updatedPoint);
    }
    setSuccessMessage("Usunięto przypisanie obiektu!");
  };

  const layers = useMemo(() => {
    if (!localData) return [];

    const potentialShelters = localData.points.filter(p => p.type === "potential_shelter");
    const builtShelters = localData.points.filter(p => p.type === "built_shelter");
    const assigned_apartments = localData.points.filter(p => p.type === "apartment" && p.assigned_to !== null);
    const unassigned_apartments = localData.points.filter(p => p.type === "apartment" && p.assigned_to === null);

    const commonLayerProps = {
      pickable: true,
      onClick: (info: any) => {
        if (!info.object) return;
        const clickedPoint = info.object as AllocationPoint;

        if (assigningApartmentId !== null) {
          if (clickedPoint.type === "built_shelter" || clickedPoint.type === "potential_shelter") {
            handleAssignApartment(assigningApartmentId, clickedPoint.id);
          } else {
            alert("Wybierz schron (zielony lub czerwony), aby przypisać obiekt.");
            setAssigningApartmentId(null);
          }
        } else {
          setSelected(clickedPoint);
        }
      },
    };

    let lineData: { source: number[]; target: number[] }[] = [];

    if (showAllAssignments) {
      // wszystkie połączenia
      lineData = assigned_apartments
        .map(a => {
          const shelter = localData.points.find(p => p.id === a.assigned_to);
          return shelter ? { source: [a.x, a.y], target: [shelter.x, shelter.y] } : null;
        })
        .filter((l): l is { source: number[]; target: number[] } => l !== null);
    } else if (selected) {
      // tylko aktualnie wybrane
      if (selected.type === "built_shelter" || selected.type === "potential_shelter") {
        lineData = localData.points
          .filter(p => p.type === "apartment" && p.assigned_to === selected.id)
          .map(a => ({ source: [a.x, a.y], target: [selected.x, selected.y] }));
      } else if (selected.type === "apartment" && selected.assigned_to) {
        const shelter = localData.points.find(p => p.id === selected.assigned_to);
        if (shelter) lineData = [{ source: [selected.x, selected.y], target: [shelter.x, shelter.y] }];
      }
    }

    return [
      new TileLayer({
        id: "osm-tiles",
        data: "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        renderSubLayers: (props) => {
          const { bbox: { west, south, east, north } } = props.tile;
          return new BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [west, south, east, north],
          });
        },
      }),

      new ScatterplotLayer({ id: "potential-shelters", data: potentialShelters, getPosition: (d) => [d.x, d.y], getFillColor: [255, 0, 0], getRadius: 15, ...commonLayerProps }),
      new ScatterplotLayer({ id: "built-shelters", data: builtShelters, getPosition: (d) => [d.x, d.y], getFillColor: [0, 200, 0], getRadius: 15, ...commonLayerProps }),
      new ScatterplotLayer({ id: "unassigned-apartments", data: unassigned_apartments, getPosition: (d) => [d.x, d.y], getFillColor: [0, 0, 0], getRadius: 5, ...commonLayerProps }),
      new ScatterplotLayer({ id: "assigned-apartments", data: assigned_apartments, getPosition: (d) => [d.x, d.y], getFillColor: [230, 186, 11], getRadius: 5, ...commonLayerProps }),

      new LineLayer({
        id: showAllAssignments ? "all-lines" : "visible-lines",
        data: lineData,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getColor: [0, 0, 0],
        getWidth: 1,
      }),
    ];
  }, [localData, selected, assigningApartmentId, showAllAssignments]);


  const generateLocalId = () =>
    Math.max(0, ...(localData?.points.map((p) => p.id) || [0])) + 1;

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
          prev ? { ...prev, points: [...prev.points, newPoint] } : prev,
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
          prev ? { ...prev, points: [...prev.points, newPoint] } : prev,
        );
        setSuccessMessage("Dodano nowy budynek mieszkalny!");
      }
      setAddPanel(false);
    } catch (e) {
      alert("Błąd podczas dodawania punktu");
    }
  };

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
                    : p,
                ),
              }
            : prev,
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
                    : p,
                ),
              }
            : prev,
        );
        setSuccessMessage("Zaktualizowano schron!");
      }
      setEditPanel(false);
      setSelected(null);
    } catch (e) {
      alert("Błąd podczas edycji punktu");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;

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
          : prev,
      );
      setSelected(null);
    } catch (e) {
      alert("Błąd podczas usuwania punktu");
    }
  };

  return (
    <div id="map-container" className="relative w-full h-full">
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
            if (assigningApartmentId) {
              setAssigningApartmentId(null);
              setSuccessMessage("Anulowano przypisywanie.");
            }
          }
        }}
      />
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={toggleFullscreen}
          className="bg-white text-black px-3 py-2 rounded shadow hover:bg-gray-200 transition"
        >
          {isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran"}
        </button>
      </div>

      {coordinate && (
        <div className="absolute bottom-4 right-4 bg-white shadow-lg p-4 rounded text-sm max-w-xs">
          <button
            onClick={() => setAddPanel(true)}
            className="bg-primary text-white px-3 py-1 rounded"
          >
            Dodaj
          </button>
          <div className="text-black mt-2">
            <p>X: {coordinate[0].toFixed(4)}</p>
            <p>Y: {coordinate[1].toFixed(4)}</p>
          </div>
            <button
            onClick={() => setShowAllAssignments(prev => !prev)}
            className="bg-primary text-white px-3 py-1 rounded w-full mt-2"
          >
            {showAllAssignments ? "Wybrane" : "Wszystkie"}
          </button>
        </div>
      )}

      {addPanel && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white m-4 text-black p-2 rounded-2xl shadow-2xl w-[420px] max-h-[50vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-center">Dodaj punkt</h2>

            <div className="grid grid-cols-3 gap-1 items-center">
              <label className="font-semibold text-right col-span-1">Typ:</label>
              <select
                value={formType}
                onChange={(e) =>
                  setFormType(e.target.value as "shelter" | "apartment")
                }
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
              >
                <option value="shelter">Obiekt ochronny</option>
                <option value="apartment">Obiekt mieszkalny</option>
              </select>

              <label className="font-semibold text-right col-span-1">X:</label>
              <input
                type="number"
                value={x?.toFixed(4) ?? ""}
                onChange={(e) => setX(Number(e.target.value))}
                step="0.0001"
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
              />

              <label className="font-semibold text-right col-span-1">Y:</label>
              <input
                type="number"
                value={y?.toFixed(4) ?? ""}
                onChange={(e) => setY(Number(e.target.value))}
                step="0.0001"
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
              />

              {formType === "shelter" && (
                <>
                  <label className="font-semibold text-right col-span-1">
                    Pojemność(os):
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
                  />

                  <label className="font-semibold text-right col-span-1">
                    Koszt(mln zł):
                  </label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
                  />
                </>
              )}
            </div>

            <div className="flex justify-end mt-2 gap-2">
              <button
                onClick={() => setAddPanel(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100 transition"
              >
                Anuluj
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition"
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
              <p>
                <b>Obiekt mieszkalny</b>
              </p>
              <p>id: {selected.id}</p>
              <p>
                x: {selected.x.toFixed(4)}, y: {selected.y.toFixed(4)}
              </p>
              <p>przypisany do: {selected.assigned_to ?? "Nikogo"}</p>
            </div>
          ) : (
            <div className="text-black">
              <p>
                <b>Schron</b>
              </p>
              <p>
                Typ:{" "}
                {selected.type === "potential_shelter" ? "Potencjalny" : "Aktywny"}
              </p>
              <p>id: {selected.id}</p>
              <p>
                x: {selected.x.toFixed(4)}, y: {selected.y.toFixed(4)}
              </p>
              <p>koszt: {selected.cost ?? "unknown"}</p>
              <p>Pojemność: {selected.capacity ?? "unknown"}</p>
              <p>
                przypisane obiekty:{" "}
                {localData?.points.filter(
                  (p) => p.type === "apartment" && p.assigned_to === selected.id,
                ).length}
              </p>
            </div>
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              className="bg-primary text-white px-3 py-1 rounded"
              onClick={() => {
                setEditX(Number(selected.x.toFixed(4)));
                setEditY(Number(selected.y.toFixed(4)));
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
              Usuń obiekt
            </button>

            {selected.type === "potential_shelter" && (
              <button
                className="bg-primary text-white px-3 py-1 rounded"
                onClick={handleActivateShelter}
              >
                Aktywuj
              </button>
            )}

            {selected.type === "apartment" && selected.assigned_to === null && (
              <button
                className="bg-primary text-white px-3 py-1 rounded"
                onClick={() => {
                  setAssigningApartmentId(selected.id);
                  setSelected(null); 
                  setSuccessMessage(
                    "Wybierz schron, do którego chcesz przypisać obiekt.",
                  );
                }}
              >
                Przypisz do schronu
              </button>
            )}

            {selected.type === "apartment" && selected.assigned_to !== null && (
              <button
                className="bg-red-600 text-white px-3 py-1 rounded"
                onClick={handleUnassignApartment}
              >
                Usuń przypisanie
              </button>
            )}
          </div>
        </div>
      )}

      {editPanel && selected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white m-4 text-black p-2 rounded-2xl shadow-2xl w-[420px] max-h-[45vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-center">Edytuj punkt</h2>

            <div className="grid grid-cols-3 gap-1 items-center">
              <label className="font-semibold text-right col-span-1">X:</label>
              <input
                type="number"
                value={editX ?? selected.x}
                onChange={(e) => setEditX(Number(e.target.value))}
                step="0.0001"
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
              />

              <label className="font-semibold text-right col-span-1">Y:</label>
              <input
                type="number"
                value={editY ?? selected.y}
                onChange={(e) => setEditY(Number(e.target.value))}
                step="0.0001"
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
              />

              {selected.type !== "apartment" && (
                <>
                  <label className="font-semibold text-right col-span-1">
                    Pojemność(os):
                  </label>
                  <input
                    type="number"
                    value={editCapacity ?? selected.capacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
                  />

                  <label className="font-semibold text-right col-span-1">
                    Koszt(mln zł):
                  </label>
                  <input
                    type="number"
                    value={editCost ?? selected.cost ?? 0}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none col-span-2"
                  />
                </>
              )}
            </div>

            <div className="flex justify-end mt-2 gap-2">
              <button
                onClick={() => setEditPanel(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100 transition"
              >
                Anuluj
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition"
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