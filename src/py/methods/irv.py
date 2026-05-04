import numpy as np

def IRV(profile: np.ndarray, weights: np.ndarray, num_winners: int) -> tuple[np.ndarray, np.ndarray]:
    """
    Instant Runoff Voting: iteratively eliminates the weakest candidate.

    In each round, each voter's weight is credited to their highest-ranked
    candidate still in the ``remaining`` set. The candidate with the fewest
    votes is eliminated. Elimination continues until ``num_winners``
    candidates remain.

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
        True for candidates who survived all elimination rounds.
    scores : np.ndarray of float, shape (m_candidates,)
        Weighted vote totals from the final elimination round. Not a
        meaningful cardinal ranking across all candidates; eliminated
        candidates will have a score of 0. All zeros if num_winners == m.
    """
    n, m = profile.shape
    remaining = np.ones(m, dtype=bool)
    scores = np.zeros(m)
    while remaining.sum() > num_winners:
        votes = profile[np.arange(n), np.argmax(remaining[profile], axis=1)]
        scores = np.bincount(votes, weights, minlength=m)
        print(f'{scores=}')
        to_elim = np.argmin(np.where(scores > 0, scores, np.inf))
        remaining[to_elim] = False
    return remaining, scores

