import numpy as np

def STV(profile: np.ndarray, weights: np.ndarray, num_winners: int) -> tuple[np.ndarray, None]:
    """
    Single Transferable Vote: proportional multi-winner election with vote transfer.

    Uses the Droop quota as the election threshold:
    ``threshold = total_weight / (num_winners + 1)``.

    Each round, the candidate with the most first-active-choice votes is checked:
    - If their tally exceeds the threshold, they are elected and their supporters'
      weights are scaled down by the surplus fraction ``(1 - threshold / score)``,
      transferring the remainder to those voters' next choices.
    - If no candidate exceeds the threshold, the weakest candidate is eliminated
      and their supporters advance to their next active choice.
    If the number of remaining candidates equals the number of unfilled seats,
    all remaining candidates are elected immediately.

    Tiebreaking is arbitrary (numpy argmin/argmax). Election order is
    non-simultaneous (candidates are seated one at a time, even if multiple
    are above threshold at some point).

    Parameters
    ----------
    profile : np.ndarray, shape (n_voters, m_candidates)
        Each row is a ranked ballot: profile[i, j] is the index of voter i's
        (j+1)-th choice candidate.
    weights : np.ndarray, shape (n_voters,)
        Voting weight of each voter.
        Copied internally; not modified in place.
    num_winners : int
        Number of seats to fill.

    Returns
    -------
    winners : np.ndarray of bool, shape (m_candidates,)
        True for elected candidates, False otherwise.
    scores : None
        No meaningful score for STV in our context; always returns None.
    """

    weights = weights.copy().astype(float)
    n, m = profile.shape
    winners = np.zeros(m, dtype=bool)
    remaining = np.ones(m, dtype=bool)
    threshold = weights.sum() / (num_winners + 1)
    while winners.sum() < num_winners:
        if (num_winners - winners.sum()) == remaining.sum():
            winners |= remaining
            break
        # For each voter, find which of their ranked candidates are still active
        candidate_is_active = remaining[profile]  # shape (n, m): True where ranked candidate hasn't been eliminated
        top_choice_col = np.argmax(candidate_is_active, axis=1)  # index into each voter's ballot of their top active pick
        votes = profile[np.arange(n), top_choice_col]  # map back to candidates
        scores = np.bincount(votes, weights, minlength=m)
        top_cand = np.argmax(scores)
        if scores[top_cand] > threshold:
            winners[top_cand] = True
            weights[votes == top_cand] *= (1 - threshold / scores[top_cand])
        else:
            top_cand = np.argmin(np.where(scores > 0, scores, np.inf))
        remaining[top_cand] = False
    return winners, None
