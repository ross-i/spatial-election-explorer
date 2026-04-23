import numpy as np

def run_election(layers, method, num_winners):
    layers = layers.to_py()
    print(layers)
    print(method)
    print(num_winners)

    # TODO: everything :)
    # Contract: any extra fields present on a layer dict or point dict in the input must be
    # copied through to the corresponding output dict unchanged. The frontend may attach
    # arbitrary metadata (e.g. display names, colors) and expects to find it on the output.

    return [
        {
            "name": 'Layer1',
            "type": 'candidate',
            "points":[
                { "id": "a1", "winner": True, "score": 1, "x": 0.2, "y": 0.4 },
                { "id": "a2", "winner": False, "score": 1, "x": 0.5, "y": 0.7 },
                { "id": "a3", "winner": False, "score": 1, "x": 0.9, "y": 0.1 },
            ],
        }
    ]

