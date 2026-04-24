import numpy as np

from .utils import _make_winners

def borda(profile: np.ndarray, weights: np.ndarray, num_winners: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Borda count election: candidates earn points based on their rank on each ballot.

    A candidate ranked 1st receives m-1 points, 2nd receives m-2 points, ...,
    last receives 0 points, where m is the number of candidates. Points are
    multiplied by the voter's weight before accumulation.

    Parameters
    ----------
    profile : np.ndarray, shape (n_voters, m_candidates)
        Each row is a ranked ballot: profile[i, j] is the index of voter i's
        (j+1)-th choice candidate.
    weights : np.ndarray, shape (n_voters,)
        Voting weight of each voter.
    num_winners : int
        Number of candidates to elect.

    Returns
    -------
    winners : np.ndarray of bool, shape (m_candidates,)
        True for elected candidates, False otherwise.
    scores : np.ndarray of float, shape (m_candidates,)
        Weighted Borda point totals.
    """
    m = profile.shape[-1]  # number of candidates
    borda_vec = np.arange(m-1, -1, -1)
    ij_weights = np.outer(weights, borda_vec)
    scores = np.bincount(profile.flatten(), ij_weights.flatten(), minlength=m)
    winners = _make_winners(scores, num_winners)
    return winners, scores
