import pandas as pd
from geopy.distance import geodesic # do obliczenia odległości
import numpy as np
import math
import torch
from torch_geometric.data import Data
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from torch_geometric.data import Data
from torch.optim import Adam

class QUBOGCN(nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels, dropout=0.001):
        super().__init__()
        # wyłącz automatyczne self-loops i normalizację, jeśli wolisz kontrolować normalizację samemu
        self.conv1 = GCNConv(in_channels, hidden_channels, add_self_loops=False, normalize=False)
        self.conv2 = GCNConv(hidden_channels, out_channels, add_self_loops=False, normalize=False)
        self.dropout = dropout

    def forward(self, data):
        x, edge_index, edge_weight = data.x, data.edge_index, data.edge_attr
        x = self.conv1(x, edge_index, edge_weight=edge_weight)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        x = self.conv2(x, edge_index, edge_weight=edge_weight)
        return torch.sigmoid(x).squeeze()

def qubo_loss(probs, Q):
    probs = probs.view(-1, 1)  # (N, 1)
    Q = Q.detach().float().to(probs.device)
    return (probs.T @ Q @ probs).squeeze()

def train_qubo_gnn(data, Q, model, optimizer, epochs=1000, tol=1e-4, patience=10000, threshold=0.5):
    best_loss = float('inf')
    best_solution = None
    wait = 0

    if not isinstance(Q, torch.Tensor):
        Q = torch.tensor(Q, dtype=torch.float32)
    Q = Q.detach().to(model.parameters().__next__().device)

    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        probs = model(data)
        loss = qubo_loss(probs, Q)
        loss.backward()
        optimizer.step()

        if epoch % 100 == 0:
            print(f"Epoch {epoch}, Loss: {loss.item():.6f}")
            print(f"Probs: {probs}")

        # Early stopping
        if loss.item() + tol < best_loss:
            best_loss = loss.item()
            best_solution = (probs >= threshold).float().detach()
            wait = 0
        else:
            wait += 1

        if wait >= patience:
            print(f"Early stopping at epoch {epoch}")
            break

    return best_solution, best_loss

def format_solution(bitlist, objective, budget, L_new, L_existing, M, c, y_offset, idx_x):
    points = []
    id_counter = 0

    for i, coords in enumerate(L_new + L_existing):
        y_i = bitlist[y_offset + i]
        if i < len(L_new):
            schron_type = "potential_shelter" if y_i == 0 else "built_shelter"
            cost = c[i]
        else:
            schron_type = "built_shelter" if y_i == 1 else "potential_shelter"
            cost = 0

        points.append({
            "id": id_counter,
            "type": schron_type,
            "cost": cost,
            "assigned_to": None,
            "x": coords[1],
            "y": coords[0],
        })
        id_counter += 1

    for n, coords in enumerate(M):
        assigned_to = None
        for i in range(len(L_new) + len(L_existing)):
            if bitlist[idx_x(i, n)] == 1:
                assigned_to = i
                break

        points.append({
            "id": id_counter,
            "type": "apartment",
            "cost": None,
            "assigned_to": assigned_to,
            "x": coords[1],
            "y": coords[0],
        })
        id_counter += 1

    used_budget = sum(c[i] * bitlist[y_offset + i] for i in range(len(L_new) + len(L_existing)))

    return {
        "points": points,
        "objective": int(objective),
        "used_budget": used_budget,
    }


def get_shelter_allocation(budget: int):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    data = pd.read_csv("../../Notebooks/data/schrony-csv.csv")

    data = data[
        (data["County"] == "Wrocław") &
        ((data["FacilityType"] == "[1] - (S) - schron") | (data["FacilityType"] == "[2] - (U) - ukrycie")) &
        (data["y"] >= 51.101153) & (data["y"] <= 51.127456) &  # latitude
        (data["x"] >= 17.068503) & (data["x"] <= 17.123730)  # longitude
        ].dropna()

    s = 0
    h = 50
    p = 15
    P = [40, 4, 4, 40]
    e = len(data)

    L_new = [
        #[51.103504, 17.086370],
        #[51.100217, 17.082551],
        #[51.100390, 17.099490],
        #[51.100590, 17.0590],
        #[51.100190, 17.079490],
        #[51.100590, 17.059490]
    ]

    L_existing = data[["y", "x"]].values.tolist()

    L =  L_existing

    # Koszty i pojemności
    c = [2, 2, 4, 6, 8, 1] + [0] * e
    v = [10, 4, 1, 5, 6, 4] + list(data["Capacity"] / 10)

    slack_sizes = [math.floor(math.log2(vi)) for vi in v]  # za pojemności schronów
    slack_sizes.append(math.floor(math.log2(p)))  # za budżet

    np.random.seed(42)
    lat_range = (51.101153, 51.127456)
    lon_range = (17.068503, 17.123730)
    M = [
        [np.random.uniform(*lat_range), np.random.uniform(*lon_range)]
        for _ in range(h)
    ]

    # Odległości r_{i,n} w kilometrach
    r = [[geodesic(l, m).kilometers for m in M] for l in L]
    r = np.array(r)

    # Zmienna decyzyjna jeśli schron
    x = [[1 for _ in range(h)] for _ in range(s + e)]

    # Inicjalizacja QUBO - bierzemy pod uwagę już zmiennę typu slack
    N = (s + e) * h + (s + e) + sum(slack_sizes)
    Q = np.zeros((N, N))

    def idx_x(i, n):
        return i * h + n

    def idx_y(i):
        return (s + e) * h + i

    # \min \left( \sum_{i \in L} \sum_{n \in M} r_{in} \cdot x_{in} + \sum_{i \in L}  c_i \cdot y_{i} \right)
    # koszty odległości dla x_{i,n}
    for i in range(s + e):
        for n in range(h):
            Q[idx_x(i, n), idx_x(i, n)] += r[i][n]

    # koszty budowy dla y_i
    for i in range(s + e):
        Q[idx_y(i), idx_y(i)] += c[i]

    # \sum_{i \in L} x_{i,n} = 1 \quad \forall n \in M

    for n in range(h):
        terms = [(idx_x(i, n), 1) for i in range(s + e)]

        # przekątna
        for a, wa in terms:
            Q[a, a] += P[0] * wa ** 2 - 2 * P[0] * wa

        # pary zmiennych
        for i in range(len(terms)):
            for j in range(i + 1, len(terms)):
                a, wa = terms[i]
                b, wb = terms[j]
                value = 2 * P[0] * wa * wb
                Q[a, b] += value / 2
                Q[b, a] += value / 2

    # \sum_{n \in M} x_{i,n} \leq v_i \quad \forall i \in L
    slack_offset = (s + e) * h

    for i in range(s + e):
        N_i = math.floor(math.log2(v[i])) + 1
        slack_idxs = [slack_offset + sum(slack_sizes[:i]) + k for k in range(N_i)]

        x_terms = [(idx_x(i, n), 1) for n in range(h)]
        s_terms = [(s_idx, 2 ** k) for k, s_idx in enumerate(slack_idxs)]

        terms = x_terms + s_terms
        rhs = v[i]

        for a, wa in terms:
            Q[a, a] += P[1] * (wa ** 2) - 2 * P[1] * rhs * wa
            for b, wb in terms:
                if a < b:
                    Q[a, b] += P[1] * wa * wb
                    Q[b, a] += P[1] * wa * wb

    # \sum_{i \in L} c_i \cdot y_{i} \leq p
    slack_offset = (s + e) * h  # po x'ach
    y_offset = slack_offset + sum(slack_sizes[:-1])  # po wszystkich slackach pojemnościowych
    budget_slack_offset = y_offset + (s + e)  # po y'ach
    budget_slack_bits = slack_sizes[-1]

    rhs = p

    # y_i z wagami c_i
    terms_y = [(y_offset + i, c[i]) for i in range(s + e)]
    # slack bity dla budżetu
    terms_s = [(budget_slack_offset + k, 2 ** k) for k in range(budget_slack_bits)]

    terms = terms_y + terms_s

    for a, wa in terms:
        Q[a, a] += P[2] * (wa ** 2) - 2 * P[2] * wa * rhs
        for b, wb in terms:
            if a < b:
                Q[a, b] += P[2] * wa * wb
    # x_{in} \leq y_i   \   \quad \forall i \in L \ \forall n \in M
    for i in range(s + e):
        for n in range(h):
            x_idx = idx_x(i, n)
            y_idx = y_offset + i

            Q[x_idx, x_idx] += P[3]
            Q[x_idx, y_idx] += -P[3]
            Q[y_idx, x_idx] += -P[3]

    Q_sparse = (Q != 0)
    rows, cols = np.where(Q_sparse)

    edge_index = torch.tensor(np.vstack([rows, cols]), dtype=torch.long)
    edge_attr = torch.tensor(Q[rows, cols], dtype=torch.float)

    x = torch.ones((N, 1), dtype=torch.float)

    q_data = Data(x=x, edge_index=edge_index, edge_attr=edge_attr)

    in_channels = 1
    hidden_channels = 32
    out_channels = 1
    dropout = 0.01
    learning_rate = 1e-3
    epochs = 5000
    tolerance = 1e-4
    patience = 5000
    threshold = 0.9

    model = QUBOGCN(in_channels, hidden_channels, out_channels, dropout)
    model = model.to(torch.float32)
    model = model.to(device)
    q_data = q_data.to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    # trening
    best_solution, best_loss = train_qubo_gnn(
        data=q_data,
        Q=Q,
        model=model,
        optimizer=optimizer,
        epochs=epochs,
        tol=tolerance,
        patience=patience,
        threshold=threshold
    )

    bitlist = best_solution.int().cpu().tolist()
    print(f"Najlepsze rozwiązanie {bitlist}")

    objective = 0.0
    for i in range(s + e):
        y_i = bitlist[y_offset + i]
        objective += c[i] * y_i  # koszt budowy

        for n in range(h):
            x_in = bitlist[idx_x(i, n)]
            objective += r[i][n] * x_in  # koszt odległości

    print(f"Najlepsza wartość funkcji celu (QUBO): {best_loss:.4f}")
    print(f"Wartość funkcji celu: {objective}")

    print("\nRozwiązanie")
    for i in range(s + e):
        y_i = bitlist[y_offset + i]
        status = "BUDOWANY" if y_i == 1 else "NIE budowany"
        print(f"Schron {i}: {status}")
        for n in range(h):
            if bitlist[idx_x(i, n)] == 1:
                print(f"  -> przydzielony mieszkaniec {n}")

    return format_solution(bitlist, objective, budget, L_new, L_existing, M, c, y_offset, idx_x)