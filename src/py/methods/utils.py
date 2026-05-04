import numpy as np

def _make_winners(scores: np.ndarray, k: int) -> np.ndarray:
    """Return a binary array marking the top-k candidates by score.

    Parameters
    ----------
    scores : np.ndarray, shape (m_candidates,)
        Score for each candidate.
    k : int
        Number of winners to select.

    Returns
    -------
    winners : np.ndarray of bool, shape (m_candidates,)
        True for the top-k candidates, False otherwise. Ties broken arbitrarily.
    """
    winner_indices = np.argpartition(scores, -k)[-k:]  # arbitrary tiebreaking
    winners = np.zeros(scores.shape, dtype=bool)
    winners[winner_indices] = True
    return winners
