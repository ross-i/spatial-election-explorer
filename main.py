from fastapi import FastAPI
from pydantic import BaseModel
from enum import Enum

app = FastAPI(title="Spatial Election Explorer API")

# Define custom types
class PointType(str, Enum):
    VOTER = "voter"
    CANDIDATE = "candidate"

class VoterDistribution(str, Enum): # Choose from "Gaussian", "Uniform rectangle", "Uniform disk"
    GAUSSIAN = "gaussian"
    UNIFORM_RECT = "uniform_rect"
    UNIFORM_DISK = "uniform_disk"

class VotingRule(str, Enum): 
    ##### DEFINE THE SUPPORTED VOTING RULES #####
    pass

# Request Models
class Point(BaseModel):
    id: str
    type: PointType  # "voter" or "candidate"
    num: int = 1  # number of voters, weight for simulation, ignored for candidates
    coordinate: tuple[float, float]

class ElectionRequest(BaseModel):
    points: list[Point]
    voting_rule: VotingRule 
    num_winners: int = 1
    runid: str | None = None  # optional ID for the simulation run, for frontend tracking

class GenerateSyntheticRequest(BaseModel):
    num_voters: int
    num_candidates: int
    voter_distribution: VoterDistribution  
    candidate_distribution: str  

class GenerateSurveyRequest(BaseModel):
    # PLACEHOLDER: define parameters for sampling real survey data
    pass

# Response Models
class ScoredPoint(BaseModel): # Used to return candidates with scores and winners
    id: str
    type: str
    num: int  # should be 1, or do we even need this?
    coordinate: tuple[float, float]
    score: float  # populated for candidates
    winner: bool # TRUE if this candidate is a winner, FALSE otherwise
    social_cost: float # sum of distance between this candidate to all voters

class ElectionResponse(BaseModel):
    points: list[ScoredPoint]
    runid: str | None = None  # echo back the run ID for frontend tracking

class GenerateResponse(BaseModel):
    points: list[Point]

# Endpoint 1: Run election simulation
@app.post("/election", response_model=ElectionResponse)
def run_election(req: ElectionRequest) -> ElectionResponse:
    # Placeholder. Build this first

    voters = [p for p in req.points if p.type == PointType.VOTER]
    candidates = [p for p in req.points if p.type == PointType.CANDIDATE]








    result_points = []
    return ElectionResponse(
        points=result_points,
        runid=req.runid,
    )

# Endpoint 2: generate synthetic election data
@app.post("/generate/synthetic", response_model=GenerateResponse)
def generate_synthetic_data(req: GenerateSyntheticRequest) -> GenerateResponse:
    # Placeholder. Build if needed on server side
    result_points = []
    return GenerateResponse(
        points=result_points
    )

# Endpoint 3: sample survey data
@app.post("/generate/survey", response_model=GenerateResponse)
def sample_survey_data(req: GenerateSurveyRequest) -> GenerateResponse:
    # Placeholder. Build if needed on server side
    result_points = []
    return GenerateResponse(
        points=result_points
    )