# Spatial Election Explore (SEE)

# Planned

## API Endpoint 1: /election

### Input Class: 

1. InputPoint: 
    id: unique id for point 
    type: voter/candidate
    num: number of voters (weight for simulation)
    coordinate: (x,y)
2. InputJSON:
    points:[InputPoint]
    RunId: unique runid for caching
    voting_method: from a list of supported voting methods 
    num_winners: n
    param* to be defined

### Output Class:

1. OutputPoint: (only output candidate)
    id: unique id for point 
    type: voter/candidate
    coordinate: (x,y)
    score: candidate's score in the election
    winner: 
    social_cost: sum of distance between this candidate to all voters

2. OutputJSON: 
    points: [OutputPoint]
    runid: same as input for caching purpose.

## API Endpoint 2: /generate/synthetic

## API Endpoint 3: /generate/survey