# portfolio-web

## Music player is lwk fucked didnt put time into it 

## Getting Started

### Prerequisites
- Node.js 18.17 or later
- npm / yarn / pnpm

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm run start
```

## Guest book & visitors on Vercel

These features need a durable store. On Vercel, use **Upstash Redis**:

1. In the Vercel project → **Storage** → create an **Upstash Redis** database (or Marketplace → Upstash).
2. Connect it to the project so these env vars are set:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy.

Locally, copy `.env.template` to `.env.local` and paste the same Upstash values.

Verify with `GET /api/debug` — `backend` should be `"upstash"` and the write/read test should pass.

Without Upstash (or the optional GitHub store fallback), counts and signatures only live in memory and reset on every serverless cold start.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
