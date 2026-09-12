# SkillBarter Matching Engine Specification

The SkillBarter Matching Engine is a deterministic, explainable algorithm that computes the compatibility between a user seeking trades and all active neighbors within their exchange radius.

---

## 1. Mathematical Formulation

The composite match score \( M \) ranges from **0% to 100%**:

\[
M = S_{\text{skill}} + P_{\text{location}} + T_{\text{trust}} + A_{\text{availability}}
\]

### Factor 1: Skill Compatibility (\( S_{\text{skill}} \), Max: 50 points)
- **Direct Reciprocal Barter (50 pts)**:
  - User A offers what User B needs **AND** User B offers what User A needs.
- **One-Way Skill Compatibility (25 pts)**:
  - User A offers what User B needs **OR** User B offers what User A needs.
- **No Overlap (0 pts)**:
  - Candidate is omitted from recommendations.

### Factor 2: Location Proximity (\( P_{\text{location}} \), Max: 20 points)
Calculated using the great-circle Haversine distance \( d \) in kilometers:
\[
P_{\text{location}} = \max\left(0, 1.0 - \frac{d}{R_{\max}}\right) \times 20
\]
Where \( R_{\max} \) is the user's configured exchange radius (default 10 km). Closer neighbors earn higher proximity weight.

### Factor 3: Trust Score Rating (\( T_{\text{trust}} \), Max: 20 points)
Normalizes candidate user's community trust score \( T \) (0 to 100):
\[
T_{\text{trust}} = \left(\frac{T}{100}\right) \times 20
\]

### Factor 4: Availability Overlap (\( A_{\text{availability}} \), Max: 10 points)
- Both "Flexible" or identical schedules: **10 points**
- Partial day/time overlap: **7 points**
- Different listed schedules: **4 points**

---

## 2. CEO Scenario Example: Arjun Sharma & Ravi Kumar

| Parameter | Arjun Sharma | Ravi Kumar | Contribution |
| :--- | :--- | :--- | :--- |
| **Offered Skills** | Web Development, Photography | Plumbing, Home Repair | **50 / 50 pts** (Reciprocal!) |
| **Needed Skills** | Plumbing, Carpentry | Web Development | |
| **Proximity** | Hitech City | Madhapur (1.8 km) | **18 / 20 pts** |
| **Trust Score** | 94 / 100 | 94 / 100 | **19 / 20 pts** |
| **Availability** | Weekends & Evenings | Weekends & Evenings | **10 / 10 pts** |
| **Composite Match** | | | **97% Compatibility** |

---

## 3. Explainability Output

For every match, the engine returns human-readable justification strings:
1. `✓ Direct 2-way barter match: You can trade 'Web Development' for 'Plumbing'`
2. `✓ Hyperlocal neighbor (1.8 km away)`
3. `✓ High community trust score (94/100)`
4. `✓ Compatible availability (Weekends & Evenings)`
