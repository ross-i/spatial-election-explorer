import numpy as np

from .utils import _make_winners

def plurality(profile: np.ndarray,
              weights: np.ndarray,
              num_winners: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Standard plurality election: each voter votes for their top-ranked candidate.

    Sometimes called Single Non-Transferable Vote (SNTV) in the multi-winner setting.

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
        Weighted first-place vote totals.
    """
    return _generic_plurality(profile, weights, num_winners, 1)


def bloc_plurality(profile: np.ndarray,
                   weights: np.ndarray,
                   num_winners: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Bloc plurality election: each voter votes for their top num_winners candidates.

    Generalizes plurality to multi-winner elections. Each voter's ballot
    contributes one vote to each of their top ``num_winners`` choices.

    Parameters
    ----------
    profile : np.ndarray, shape (n_voters, m_candidates)
        Each row is a ranked ballot: profile[i, j] is the index of voter i's
        (j+1)-th choice candidate.
    weights : np.ndarray, shape (n_voters,)
        Voting weight of each voter.
    num_winners : int
        Number of candidates to elect.
        Also the number of candidates each voter votes for.

    Returns
    -------
    winners : np.ndarray of bool, shape (m_candidates,)
        True for elected candidates, False otherwise.
    scores : np.ndarray of float, shape (m_candidates,)
        Weighted vote totals.
    """
    return _generic_plurality(profile, weights, num_winners, num_winners)


def _generic_plurality(profile: np.ndarray,
                       weights: np.ndarray,
                       num_winners: int,
                       k: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Shared implementation for plurality (k=1) and bloc plurality (k=num_winners).

    Parameters
    ----------
    profile : np.ndarray, shape (n_voters, m_candidates)
        Ranked ballots.
    weights : np.ndarray, shape (n_voters,)
        Voter weights.
    num_winners : int
        Number of candidates to elect.
    k : int
        Number of candidates each voter votes for (top-k of their ballot).
    """
    points = profile[:, :k].flatten()
    if k > 1:
        weights = np.repeat(weights, k)
    scores = np.bincount(points, weights, profile.shape[1])
    winners = _make_winners(scores, num_winners)
    return winners, scores
