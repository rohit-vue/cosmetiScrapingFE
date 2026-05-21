# Cosmetic Scraper Frontend

Next.js dashboard for starting cosmetic supplier scrapers, watching live scraper logs, tracking run status, and downloading raw, partial, cleaned, and combined CSV outputs from the Python backend.

## Requirements

- Node.js 20 or newer
- npm, included with Node.js
- Python backend running from `../CosmeticScraping`
- Backend API available at `http://localhost:8000` by default

## Frontend Installation

From the frontend folder:

```bash
cd frontendcosmetic
npm install
```

If dependencies are already installed, you can skip `npm install`.

## Environment

The frontend reads the backend API URL from `NEXT_PUBLIC_API_BASE_URL`.

Create `frontendcosmetic/.env.local` only if the backend is not running on the default URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Without this file, the frontend uses `http://localhost:8000`.

## Running The App

Start the backend first:

```bash
cd ../CosmeticScraping
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install
python run_server.py
```

Then start the frontend in a second terminal:

```bash
cd frontendcosmetic
npm run dev
```

Open `http://localhost:3000` in your browser.

## Useful Commands

```bash
npm run dev
```

Runs the development server with webpack.

```bash
npm run build
```

Builds the production app.

```bash
npm run start
```

Runs the production build after `npm run build`.

```bash
npm run lint
```

Runs ESLint.

## Backend Connection

The dashboard calls these backend endpoints:

- `GET /api/health`
- `GET /api/scrapers`
- `POST /api/runs`
- `POST /api/runs/{run_id}/stop`
- `GET /api/runs/{run_id}/state`
- `GET /api/runs/{run_id}/scrapers/{scraper_id}/logs`
- CSV downloads under `/api/runs/{run_id}/...`

Backend CSV outputs are written inside `../CosmeticScraping/runs/{run_id}`.

## Backend Setup CSV

A backend setup checklist is available at:

```text
../CosmeticScraping/backend_setup.csv
```

It includes backend requirements, Python package versions, installation commands, environment variables, and run commands.

## Troubleshooting

- If the dashboard cannot load scrapers, make sure `python run_server.py` is running in `CosmeticScraping`.
- If browser automation fails, run `python -m playwright install` inside the backend virtual environment.
- If CORS or API calls fail, confirm `NEXT_PUBLIC_API_BASE_URL` matches the backend URL.
- If scraper downloads are missing, check `CosmeticScraping/runs/{run_id}` and the live scraper logs in the dashboard.
