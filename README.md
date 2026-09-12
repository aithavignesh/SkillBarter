# SkillBarter

> **"Your Skills. Your Community. Your Currency."**  
> *"Exchange skills locally. Build trust. Spend zero cash."*

SkillBarter is a production-quality hyperlocal social network connecting neighbors to trade physical and digital skills (e.g. plumbing for web development or painting for carpentry) with **zero cash exchange**, governed by an algorithmic community trust score.

---

## 1. Official Problem Statement

Build a:
> **"Hyperlocal Community Service & Skill Barter platform: A geo-fenced social network connecting neighbors to trade physical skills (e.g., plumbing for web design or painting for carpentry) with zero cash exchange, governed by a community trust score."**

In an era of rising service costs and fragmented local communities, people often lack cash to hire specialists while possessing valuable talents themselves. SkillBarter unlocks this latent neighborhood value by treating skills as currency.

---

## 2. Product Interpretation & Solution

Unlike professional career networks (like LinkedIn) focused on recruitment, jobs, and corporate resumes, SkillBarter is purpose-built for:
- Local residents & neighbors
- Freelancers, students, and hobbyists
- Home-repair practitioners (plumbers, electricians, carpenters)
- Creative professionals (photographers, designers, developers)
- Mentors and learners

### The Core Barter Loop
```
CREATE PROFILE ──> ADD SKILLS OFFERED ──> ADD SKILLS NEEDED ──> SET LOCATION
     │
     ▼
DISCOVER NEARBY PEOPLE ──> FIND RECIPROCAL MATCH (e.g. 96%) ──> PROPOSE EXCHANGE
     │
     ▼
REAL-TIME CHAT ──> ACCEPT PROPOSAL ──> ACTIVE WORKSPACE ──> MUTUAL COMPLETION
     │
     ▼
COMMUNITY REVIEWS ──> DYNAMIC TRUST SCORE UPDATE ──> BETTER FUTURE MATCHES
```

---

## 3. Technology Stack

- **Frontend**:
  - React 19, TypeScript, Vite, Tailwind CSS
  - Lucide React icon suite, React Router v7
  - Responsive Mobile Bottom Navigation & Radar Community Map
- **Backend**:
  - Python 3.13 / FastAPI, Pydantic v2
  - SQLAlchemy 2.0 ORM, python-jose (JWT)
  - Native `bcrypt` password hashing (zero passlib legacy bugs)
- **Database**:
  - PostgreSQL 16 + PostGIS (Production & Docker)
  - SQLite + Haversine geospatial fallback engine (Local Dev & automated pytest)
- **Real-Time**:
  - WebSockets (`/ws/{token}`) with live event multiplexing
- **Testing**:
  - `pytest`, `httpx`, TestClient

---

## 4. Key Architectural Features

| Feature | Description |
| :--- | :--- |
| **Strict Zero-Cash Invariant** | No payments, prices, currencies, tokens, or fees anywhere in the system. |
| **Privacy-First Hyperlocal Geofencing** | Approximate distance (e.g. `"1.8 km away"`) is shown. Exact coordinates are never exposed. |
| **Reciprocal Matching Engine** | 4-factor scoring (Skill 50%, Distance 20%, Trust 20%, Availability 10%) with explainable reasons. |
| **Mutual Completion Protocol** | Both parties must confirm completion before an exchange status moves to `COMPLETED`. |
| **Algorithmic Trust Score** | Dynamic 0–100 score calculated on the backend from review quality, reliability, and response rates. |
| **Quick 1-Click Demo Switcher** | Floating toolbar enabling instant persona switching (Arjun, Ravi, Ananya, Priya, Admin) for CEO demonstrations. |

---

## 5. Demonstration Personas & Demo Credentials

Pre-seeded demonstration accounts:

| Persona | Email | Password | Role & Skill Barter Profile |
| :--- | :--- | :--- | :--- |
| **Arjun Sharma** | `arjun@skillbarter.com` | `Password123!` | Offers: **Web Development**, Photography • Needs: **Plumbing**, Carpentry (Trust: 94) |
| **Ravi Kumar** | `ravi@skillbarter.com` | `Password123!` | Offers: **Plumbing**, Home Repair • Needs: **Web Development** (1.8 km away, Trust: 94) |
| **Ananya Rao** | `ananya@skillbarter.com` | `Password123!` | Offers: **UI Design**, Branding • Needs: Photography, Cooking (Trust: 91) |
| **Priya Sharma** | `priya@skillbarter.com` | `Password123!` | Offers: **Photography**, Drone Video • Needs: Carpentry, Gardening (Trust: 96) |
| **Admin User** | `admin@skillbarter.com` | `AdminPassword123!` | **Community Safety & Operations Admin** (Trust: 100) |

> **Tip**: You can use the floating **Demo Switcher** at the bottom-right of the screen to switch between any of these users instantly with 1 click!

---

## 6. End-to-End CEO Demonstration Script

1. **Log in as Arjun Sharma**:
   - Navigate to `/feed` or use the 1-click switcher.
   - Observe Arjun's profile: Offers *Web Development*, Needs *Plumbing*.
2. **Open Skill Matches**:
   - Navigate to `/matches`.
   - See **Ravi Kumar** at the top with a **96% Match** (1.8 km away in Madhapur).
   - View the compatibility breakdown: Direct 2-way barter match, high trust (94/100).
3. **Propose Exchange**:
   - Click **Propose Exchange**.
   - Enter: *"I can build your landing page in exchange for help fixing my kitchen sink."*
   - Submit proposal.
4. **Switch to Ravi Kumar**:
   - Use the demo switcher to switch to **Ravi Kumar**.
   - Notice the incoming notification and active proposal under `/exchanges`.
   - Click **Accept Barter** -> Exchange transitions to **ACTIVE**.
5. **Real-Time Chat & Workspace**:
   - Open the **Exchange Workspace** or `/messages`.
   - Send chat messages between Arjun and Ravi over live WebSockets.
6. **Mutual Completion**:
   - Arjun clicks **Confirm Completion**.
   - Ravi clicks **Confirm Completion** -> Status automatically becomes **COMPLETED**.
7. **Review & Trust Score Recalculation**:
   - Both submit 5-star reviews and feedback.
   - Backend dynamically re-computes trust scores and updates badges!

---

## 7. Setup & Installation

### Option A: Local Quickstart (Zero-Dependency SQLite)

#### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python -m pip install pydantic-settings
python -m app.seed.seed_data
python -m uvicorn app.main:app --reload --port 8000
```
Backend API will be running at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend application will be running at: `http://localhost:5173`.

---

### Option B: Docker Compose (PostgreSQL + PostGIS)

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL with PostGIS: `localhost:5432`

---

## 8. Automated Testing

Run the comprehensive pytest suite covering authentication, geospatial discovery, matching engine, exchange lifecycle, reviews, messaging, and admin safety:

```bash
cd backend
python -m pytest tests -v
```

To run frontend TypeScript validation and production build check:
```bash
cd frontend
npm run build
```

---

## 9. API Architecture Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & return JWT |
| `POST` | `/api/auth/register` | Register new neighborhood member |
| `GET` | `/api/users/me` | Fetch authenticated profile & skills |
| `GET` | `/api/users/nearby` | Hyperlocal radius query sorted by distance |
| `GET` | `/api/matches` | Reciprocal dynamic compatibility engine |
| `POST` | `/api/exchanges` | Propose skill-for-skill exchange |
| `PATCH` | `/api/exchanges/{id}/complete` | Mutual completion protocol |
| `POST` | `/api/reviews` | Submit post-exchange verified review |
| `GET` | `/api/trust/user/{id}` | Explainable trust score breakdown |
| `WS` | `/ws/{token}` | Real-time WebSocket multiplexer |
| `GET` | `/api/community/stats` | Hyperlocal neighborhood dashboard metrics |

---

## 10. Security & Safety Principles

1. **Zero Secret Leaks**: Passwords hashed using native bcrypt (72-byte truncation safe).
2. **Location Privacy**: Coordinates are fuzzed into approximate distances.
3. **Authorization**: Users can only modify their own proposals, messages, and profiles.
4. **Moderation**: Complete admin panel for deactivating accounts and resolving abuse reports.
5. **No Currency Gateways**: Zero financial attack surfaces.

---

## 11. Documentation Links

- [System Architecture](docs/ARCHITECTURE.md)
- [Matching Engine Specification](docs/MATCHING_ENGINE.md)
- [Trust Score Formula & Badges](docs/TRUST_SCORE_SPEC.md)
