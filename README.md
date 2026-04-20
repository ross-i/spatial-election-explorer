# Spatial Election Explore (SEE)

## Environment Management

1. Setup conda environment:
`conda env create -f environment.yml`
`conda activate spatial-election-explorer`

2. Install requirements: 
`pip install -r requirements.txt`
`npm install`

3. Add dependency to the environment:
`pip freeze > requirements.txt`

## Test API

1. Run API:
`uvicorn main:app --reload`
2. Open url: http://127.0.0.1:8000/docs (default local address may vary)

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

## Supported Election Methods:
Single-Winner Options
1. Plurality
2. Borda
3. IRV

Multi-Winner Options
1. Plurality (SNTV)
2. Bloc Plurality
3. Borda
4. STV

