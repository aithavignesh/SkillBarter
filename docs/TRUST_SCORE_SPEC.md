# SkillBarter Trust Score Specification

Trust is the central currency of SkillBarter. In the absence of monetary transactions, the algorithmic trust score safeguards community members against no-shows, poor workmanship, and bad actors.

---

## 1. Trust Score Weighting Breakdown

The trust score is bounded between **0 and 100** points and computed strictly on the backend:

| Factor | Weight | Evaluation Method |
| :--- | :--- | :--- |
| **Review Quality** | **40%** | Average star rating (1–5 converted to 30 pts) + `would_exchange_again` ratio (10 pts) |
| **Completion Reliability** | **25%** | \(\frac{\text{Completed}}{\text{Completed} + \text{Cancelled by User}} \times 25\) |
| **Response Rate** | **15%** | Ratio of incoming barter proposals accepted, countered, or answered rather than left expired |
| **Exchange Volume History** | **10%** | Logarithmic scaling: \(\min\left(10, \frac{\ln(1 + N)}{\ln(11)} \times 10\right)\) up to 10+ trades |
| **Safety Standing & Penalties** | **10%** | Deduction of 5 points for every upheld safety violation or resolved misconduct report |

---

## 2. Activity-Based Badges

Badges are awarded programmatically upon satisfying verifiable criteria:

1. **Verified Member**: Registered account with confirmed location and initial skills.
2. **Reliable Exchanger**: Completed 5+ exchanges with an average rating of \(\ge 4.5\) stars.
3. **Community Helper**: Completed trades across 3 or more distinct skill categories.
4. **Top Contributor**: Trust score of \(\ge 90\) and at least 5 completed exchanges.
5. **10+ Successful Exchanges**: Reached double-digit barter milestone.

---

## 3. Anti-Gaming Protections

1. **Mutual Review Requirement**: Reviews can only be submitted after an exchange has completed both party confirmations.
2. **Duplicate Prevention**: Only 1 review per exchange per participant. Repeated trades between the exact same pair experience diminishing returns on the volume component.
3. **Cancellation Accountability**: The participant who triggers a cancellation is recorded as `cancelled_by_id`, penalizing their reliability ratio while protecting the innocent party.
