import numpy as np
from methods import plurality, bloc_plurality, borda, IRV, STV

METHODS = {
    'plurality': plurality,
    'bloc_plurality': bloc_plurality,
    'borda': borda,
    'irv': IRV,
    'stv': STV,
}

def run_election(layers, method, num_winners):
    """
    Runs a spatial election and annotates candidate layers with results.

    Converts the input LayerBundle into a ranked-ballot profile (ranking
    candidates by increasing Euclidean distance from the voter), runs the specified
    election method, and attaches winner/score annotations to each candidate
    point. Any extra metadata fields on layers or points are passed through
    unchanged.

    Parameters
    ----------
    layers : Pyodide JsProxy
        LayerBundle from the frontend, converted via .to_py(). Each layer is a
        dict with keys 'name', 'type' ('candidate' or 'voter'), and 'points'.
        Each point has at minimum 'id', 'x', 'y', and 'weight'.
    method : str
        Election method name. Must be a key of METHODS (case-insensitive).
    num_winners : int
        Number of candidates to elect.

    Returns
    -------
    list of dict
        Candidate layers only, each point annotated with:
        - 'winner' (bool): whether this candidate won a seat.
        - 'score' (float | None): method-assigned score, if the method computes one.
              None for methods that return None for scores (e.g. STV).
    """
    layers = layers.to_py()
    if not isinstance(num_winners, int):
        raise TypeError(f"Number of winners must be an integer, got {num_winners!r}")
    if not isinstance(method, str):
        raise TypeError(f"Election method must be a string, got {method!r}")
    try:
        election_func = METHODS[method.lower()]
    except KeyError:
        raise ValueError(f"Election method must be one of {list(METHODS.keys())}, got {method!r}.")

    candidate_ids, profile, weights = _squash_layers(layers)
    if len(candidate_ids) < num_winners:
        raise ValueError(f"Cannot elect {num_winners} winners when there are only "
                         f"{len(candidate_ids)} candidates.")
    winners, scores = election_func(profile, weights, num_winners)

    out_layers = []
    for layer in layers:
        if layer['type'] == 'candidate':
            for point in layer['points']:
                idx = candidate_ids[point['id']]
                point['winner'] = bool(winners[idx])
                point['score'] = float(scores[idx]) if scores is not None else None
            out_layers.append(layer)

    return out_layers


def _squash_layers(layers):
    """
    Converts a LayerBundle into the arrays needed to run an election.

    Separates voter and candidate layers, computes pairwise Euclidean distances,
    and ranks candidates by proximity for each voter to produce a ranked-ballot profile.

    Parameters
    ----------
    layers : list of dict
        LayerBundle as returned by Pyodide's .to_py(). Each layer has 'type'
        ('candidate' or 'voter') and 'points', each point having 'id', 'x', 'y',
        and 'weight'. Layers of unknown type are skipped with a warning.

    Returns
    -------
    candidate_ids : dict[str, int]
        Maps each candidate point id to its index in the profile columns.
    profile : np.ndarray, shape (n_voters, m_candidates)
        Ranked ballots: profile[i, j] is the index of voter i's (j+1)-th
        closest candidate.
    weights : np.ndarray, shape (n_voters,)
        Voting weight of each voter, in the same order as profile rows.
    """
    candidate_ids = {}
    candidate_positions = []
    voter_positions = []
    weights = []
    for layer in layers:
        match layer['type']:
            case 'voter':
                for point in layer['points']:
                    x, y, w = point['x'], point['y'], point['weight']
                    if not all(isinstance(v, (int, float)) for v in (x, y, w)):
                        raise TypeError(f"Voter point {point['id']!r}: x, y, and weight "
                                        f"must be numeric, got {x!r}, {y!r}, {w!r}.")
                    voter_positions.append((x, y))
                    weights.append(w)
            case 'candidate':
                for point in layer['points']:
                    x, y = point['x'], point['y']
                    if not all(isinstance(v, (int, float)) for v in (x, y)):
                        raise TypeError(f"Candidate point {point['id']!r}: x and y "
                                        f"must be numeric, got {x!r}, {y!r}.")
                    candidate_ids[point['id']] = len(candidate_positions)
                    candidate_positions.append((x, y))
            case _:
                name = layer.get('name', repr(layer))
                print(f"Invalid layer type {layer.get('type')!r} for layer {name!r}. "
                      f"Must be 'candidate' or 'voter'.")
    if not voter_positions:
        raise ValueError("LayerBundle contains no voter layers.")
    if not candidate_positions:
        raise ValueError("LayerBundle contains no candidate layers.")
    voter_positions = np.array(voter_positions)
    candidate_positions = np.array(candidate_positions)
    weights = np.array(weights)
    deltas = voter_positions[:, None, :] - candidate_positions[None, :, :]
    squared_distances = np.sum(deltas * deltas, axis=2)
    profile = np.argsort(squared_distances, axis=1)
    return candidate_ids, profile, weights
