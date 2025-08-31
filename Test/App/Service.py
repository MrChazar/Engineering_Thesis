import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from torch_geometric.data import Data
from torch.optim import Adam
import pandas as pd
import numpy as np
import math
from geopy.distance import geodesic

class QUBOGCN(nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels, dropout=0.01):
        super(QUBOGCN, self).__init__()
        self.conv1 = GCNConv(in_channels, hidden_channels)
        self.conv2 = GCNConv(hidden_channels, out_channels)
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


def load_existing_shelters_data():
    data = pd.read_csv("Data/schrony-csv.csv")

    # Filtruj do schronów we Wrocławiu w określonym prostokącie
    data = data[
        (data["County"] == "Wrocław") &
        ((data["FacilityType"] == "[1] - (S) - schron") | (data["FacilityType"] == "[2] - (U) - ukrycie")) &
        (data["y"] >= 51.101153) & (data["y"] <= 51.127456) &  # latitude
        (data["x"] >= 17.068503) & (data["x"] <= 17.123730)  # longitude
        ].dropna()

    return data

def solve_problem(data):
    # === Parametry problemu ===
    s = 6  # liczba nowych lokalizacji
    h = 50  # liczba obiektów mieszkalnych
    p = 15  # budżet
    P = [2, 2, 2]  # kary (np. za przekroczenia)

    e = len(data)  # liczba istniejących schronów

    # lokalizacje nowych schronów
    L_new = [
        [51.103504, 17.086370],
        [51.100217, 17.082551],
        [51.100390, 17.099490],
        [51.100590, 17.0590],
        [51.100190, 17.079490],
        [51.100590, 17.059490]
    ]

    # Istniejące lokalizacje schronów
    L_existing = data[["y", "x"]].values.tolist()

    L = L_new + L_existing

    # Koszty i pojemności
    c = [2, 2, 4, 6, 8, 1] + [0] * e  # koszty budowy, 0 dla istniejących
    v = [10, 4, 1, 5, 6, 4] + list(data["Capacity"] / 10)  # pojemności

    # === Obiekty mieszkalne M (syntetyczne) ===
    # Przykład: losowo w przedziale współrzędnych
    np.random.seed(0)
    lat_range = (51.101153, 51.127456)
    lon_range = (17.068503, 17.123730)
    M = [
        [np.random.uniform(*lat_range), np.random.uniform(*lon_range)]
        for _ in range(h)
    ]

    # === Odległości r_{i,n} ===
    r = np.array([[geodesic(l, m).kilometers for m in M] for l in L])

    # === Rozmiary slack zmiennych (log2 zaokrąglone w dół) ===
    slack_sizes = [math.floor(math.log2(vi)) for vi in v]
    slack_sizes.append(math.floor(math.log2(p)))  # budżet jako slack

    # === Inicjalizacja QUBO ===
    N = (s + e) * h + sum(slack_sizes)  # zmienne przypisania + slack
    Q = np.zeros((N, N))

    # Indeks pomocniczy: x_{i,n} → i*h + n
    def idx(i, n):
        return i * h + n

    # Funkcja celu $$ \min \left( \sum_{i \in L} \sum_{n \in M} r_{in} \cdot x_{in} + \sum_{i \in L} \sum_{n \in M} c_i \cdot x_{in} \right)$$
    for i in range(s + e):
        for n in range(h):
            cost = c[i] + r[i][n]
            Q[idx(i, n), idx(i, n)] += cost

    # Ograniczenie #1 $$ \sum_{i \in L} x_{i,n} = 1 \quad \forall n \in M $$
    for n in range(h):
        terms = [(idx(i, n), 1) for i in range(s + e)]

        for a, wa in terms:
            Q[a, a] += P[0] * wa ** 2 - 2 * P[0] * wa
        for i in range(len(terms)):
            for j in range(i + 1, len(terms)):
                a, wa = terms[i]
                b, wb = terms[j]
                value = 2 * P[0] * wa * wb
                Q[a, b] += value / 2
                Q[b, a] += value / 2

    # Ograniczenie #2 $$ \sum_{n \in M} x_{i,n} \leq v_i \quad \forall i \in L $$
    slack_offset = (s + e) * h

    for i in range(s + e):
        N_i = math.floor(math.log2(v[i])) + 1
        slack_idxs = [slack_offset + sum(slack_sizes[:i]) + k for k in range(N_i)]

        x_terms = [(idx(i, n), 1) for n in range(h)]
        s_terms = [(s_idx, 2 ** k) for k, s_idx in enumerate(slack_idxs)]

        terms = x_terms + s_terms
        rhs = v[i]

        for a, wa in terms:
            Q[a, a] += P[1] * (wa ** 2) - 2 * P[1] * rhs * wa
            for b, wb in terms:
                if a < b:
                    Q[a, b] += P[1] * wa * wb
                    Q[b, a] += P[1] * wa * wb

    # $$\sum_{i \in L} c_i \cdot x_i \leq p $$
    budget_slack_offset = (s + e) * h + sum(slack_sizes[:-1])  # ostatni slack_size to ten dla budżetu
    budget_slack_bits = slack_sizes[-1]

    rhs = p

    terms_x = [(idx(i, n), c[i]) for i in range(s + e) for n in range(h)]

    terms_s = [(budget_slack_offset + k, 2 ** k) for k in range(budget_slack_bits)]

    terms = terms_x + terms_s

    for a, wa in terms:
        Q[a, a] += P[2] * (wa ** 2) - 2 * P[2] * wa * rhs
        for b, wb in terms:
            if a < b:
                Q[a, b] += P[2] * wa * wb
                Q[b, a] += P[2] * wa * wb

    Q_sparse = (Q != 0)
    rows, cols = np.where(Q_sparse)

    edge_index = torch.tensor(np.vstack([rows, cols]), dtype=torch.long)
    edge_attr = torch.tensor(Q[rows, cols], dtype=torch.float)

    x = torch.ones((N, 1), dtype=torch.float)

    data = Data(x=x, edge_index=edge_index, edge_attr=edge_attr)

    in_channels = 1
    hidden_channels = 16
    out_channels = 1
    dropout = 0.001
    learning_rate = 1e-3
    epochs = 10000
    tolerance = 1e-4
    patience = 4000
    threshold = 0.4

    model = QUBOGCN(in_channels, hidden_channels, out_channels, dropout)
    model = model.to(torch.float32)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    data = data.to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

    # trening
    best_solution, best_loss = train_qubo_gnn(
        data=data,
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
        for n in range(h):
            x_in = bitlist[i * len(M) + n]
            objective += r[i][n] * x_in + c[i] * x_in

    print(f"Najlepsza wartość funkcji celu (QUBO): {best_loss:.4f}")
    print(f"Wartość funkcji celu: {objective}")

    return data