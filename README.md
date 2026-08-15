# ThaliScan

Private, photo-based calorie estimator for **North Indian vegetarian** meals.

Snap a thali (dal, sabzi, roti, rice, paneer) → itemized portions in **katoris/count** → calories + protein → one **Smart Reduction Tip**.

Stack: **React (Vite + Tailwind)** frontend · **FastAPI** backend · **NVIDIA Nemotron 3 Nano Omni** vision (via [NVIDIA NIM](https://build.nvidia.com)).

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- A free [NVIDIA API key](https://build.nvidia.com) (NIM trial — no OpenAI credits needed)
- [Tailscale](https://tailscale.com/) on your PC and phone (for remote access)

### Why Nemotron 3 Nano Omni (not Ultra 550B)?

**Nemotron 3 Ultra 550B is text-only** — it cannot read meal photos. For photo-based calorie estimation you need a **multimodal** model. NVIDIA’s **Nemotron 3 Nano Omni** (30B, image + text) is the right fit in the Nemotron family and is available on the same NVIDIA NIM API with a free trial tier.

---

## 1. Configure

```powershell
cd "D:\Nutrition App"
copy .env.example .env
```

1. Go to [build.nvidia.com](https://build.nvidia.com) → sign in → open [Nemotron 3 Nano Omni](https://build.nvidia.com/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning) → **Get API Key**
2. Edit `.env`:

```env
NVIDIA_API_KEY=nvapi-...
VISION_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
VISION_BASE_URL=https://integrate.api.nvidia.com/v1
HOST=0.0.0.0
PORT=8000
```

**Optional — switch back to OpenAI:**

```env
VISION_API_KEY=sk-...
VISION_MODEL=gpt-4o
VISION_BASE_URL=https://api.openai.com/v1
```

---

## 2. Run backend

```powershell
cd "D:\Nutrition App\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 3. Run frontend

In a **second** terminal:

```powershell
cd "D:\Nutrition App\frontend"
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open on this PC: [http://127.0.0.1:5173](http://127.0.0.1:5173)

The Vite dev server proxies `/api` to the backend, so the UI and API feel like one app.

---

## 4. Access on your phone over Tailscale

### One-time setup

1. Install Tailscale on your **Windows PC** and **phone**, sign in with the same account.
2. Confirm both devices appear in the [Tailscale admin console](https://login.tailscale.com/admin/machines).
3. On the PC, copy your Tailscale IP (looks like `100.x.y.z`):

```powershell
tailscale ip -4
```

### Open the app on your phone

With **both** backend and frontend running (`0.0.0.0`):

1. On your phone (on Tailscale), open:

   `http://100.x.y.z:5173`

   (replace with your PC’s Tailscale IPv4)

2. Tap **Take Photo / Upload**, shoot your plate, wait for the breakdown.

### If the UI loads but estimates fail

The browser calls `/api` on the same host/port as the UI (Vite proxy). That only works when you hit the **Vite** URL (`:5173`).

If you prefer pointing the phone at the API directly, set in `frontend/.env`:

```env
VITE_API_BASE=http://100.x.y.z:8000
```

Then restart `npm run dev`.

### Windows Firewall (if the phone cannot connect)

Allow inbound TCP on the ports you use:

```powershell
New-NetFirewallRule -DisplayName "ThaliScan UI" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "ThaliScan API" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

Tailscale MagicDNS name also works if enabled, e.g. `http://your-pc-name:5173`.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Status + whether vision key is configured |
| `POST` | `/api/estimate` | `multipart/form-data` field `file` = meal image |

Example response shape:

```json
{
  "meal_summary": "Home-style dal, aloo sabzi, 2 roti",
  "items": [
    {
      "item": "Dal tadka",
      "portion": "1.5 katori",
      "calories": 220,
      "protein_g": 12,
      "carbs_g": 28,
      "fat_g": 7,
      "notes": "Ghee tadka included"
    }
  ],
  "totals": { "calories": 640, "protein_g": 24, "carbs_g": 78, "fat_g": 18 },
  "smart_reduction_tip": {
    "tip": "Skip 1 roti to cut ~120 kcal while keeping dal protein.",
    "estimated_calorie_savings": 120,
    "estimated_protein_change_g": -3
  },
  "confidence": "medium",
  "assumptions": ["Rotis assumed medium phulka size"]
}
```

---

## Notes

- Estimates are approximate (vision + typical North Indian home portions).
- Photos are sent to NVIDIA NIM (or your configured OpenAI-compatible endpoint).
- Nemotron Ultra 550B can be used for text-only tasks but **not** for this photo workflow.
- For a fully offline setup later, point `VISION_BASE_URL` at a local vLLM/Ollama server running Nano Omni.
