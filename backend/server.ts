import "dotenv/config"
import express, { type Request, type Response } from "express"
import cors from "cors"
import fetch from "node-fetch"

// ================== Types ==================
interface Category {
  id: string
  title: string
  summary: string
}
interface Idea {
  id: string // slug
  title: string
  blurb: string
  categoryId?: string
  imageUrl?: string
  imageAlt?: string
}
interface RecipeDetail {
  id: string // slug
  title: string
  category?: string
  servings: number
  totalTimeMinutes: number
  ingredients: string[]
  steps: string[]
  tips?: string[]
  imageUrl?: string
  imageAlt?: string
}

// Gemini response (minimal)
type GeminiPart = { text?: string }
type GeminiContent = { parts?: GeminiPart[] }
interface GeminiCandidate {
  content?: GeminiContent
}
interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[]
}

// ================== App & Env ==================
const app = express()
app.use(cors()) // dev-friendly
app.use(express.json())

// tiny request logger (useful while debugging)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// ENV
const GOOGLE_API_KEY = process.env["GOOGLE_API_KEY"]
const PEXELS_API_KEY = process.env["PEXELS_API_KEY"]
if (!GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_API_KEY")
  process.exit(1)
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GOOGLE_API_KEY)}`

// ================== Utils ==================
const slugify = (s: string) => {
  console.log("[v0] Slugifying:", s) // Add debug log for slugify
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

async function callGeminiJSON(prompt: string): Promise<any> {
  console.log("[v0] Calling Gemini with prompt:", prompt) // Add debug log for Gemini prompt
  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] }

  const r = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!r.ok) {
    const errorText = await r.text()
    console.error("[v0] Gemini API error:", r.status, errorText) // Add debug log for Gemini API error
    throw new Error(errorText)
  }

  const json = (await r.json()) as GeminiGenerateContentResponse
  console.log("[v0] Gemini API raw response:", JSON.stringify(json, null, 2)) // Add debug log for raw Gemini response
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? "").join("") ?? ""
  const cleaned = text.replace(/```json|```/g, "").trim()
  console.log("[v0] Gemini API cleaned text:", cleaned) // Add debug log for cleaned Gemini text
  return JSON.parse(cleaned)
}

// Image helper — tries Pexels, falls back to loremflickr
async function getImageUrl(query: string, seed: string): Promise<string> {
  console.log("[v0] Getting image for query:", query, "seed:", seed) // Add debug log for image query
  if (PEXELS_API_KEY) {
    try {
      const u = new URL("https://api.pexels.com/v1/search")
      u.searchParams.set("query", query)
      u.searchParams.set("per_page", "1")
      const pr = await fetch(u.toString(), { headers: { Authorization: PEXELS_API_KEY } })
      if (pr.ok) {
        const pj: any = await pr.json()
        const photo = pj?.photos?.[0]
        const src = photo?.src?.medium || photo?.src?.large || photo?.src?.original
        if (src) {
          console.log("[v0] Pexels image found:", src) // Add debug log for Pexels image
          return src
        }
      }
    } catch (e) {
      console.error("[v0] Pexels API error:", e) // Add debug log for Pexels API error
      /* ignore & fallback */
    }
  }
  const tags = encodeURIComponent(`food,${query}`)
  const fallbackUrl = `https://loremflickr.com/640/420/${tags}?lock=${encodeURIComponent(seed)}`
  console.log("[v0] Falling back to loremflickr:", fallbackUrl) // Add debug log for fallback image
  return fallbackUrl
}

// ================== Static Categories ==================
const CATEGORIES: Category[] = [
  { id: "quick-curries", title: "Quick Curries", summary: "30-minute paneer curries." },
  { id: "grills-tikkas", title: "Grills & Tikkas", summary: "Skewers, tandoori, air-fryer." },
  { id: "snacks", title: "Snacks & Starters", summary: "Bites, pakoras, rolls." },
  { id: "wraps-bowls", title: "Wraps & Bowls", summary: "Rolls & bowl meals." },
  { id: "street-style", title: "Street-Style", summary: "Chatpata, bold flavors." },
  { id: "kid-friendly", title: "Kid-Friendly", summary: "Mild, cheesy twists." },
  { id: "high-protein", title: "High-Protein", summary: "Gym-friendly meals." },
  { id: "breakfast", title: "Breakfast", summary: "Bhurji, sandwiches." },
  { id: "party", title: "Party Dishes", summary: "Crowd pleasers." },
  { id: "pure-veg", title: "100% Veg", summary: "Pure veg options." },
]

// ================== Prompt builders ==================
function searchPrompt(payload: { query?: string; categoryId?: string; ingredients?: string[] }) {
  const cat = payload.categoryId ? `Category: ${payload.categoryId}` : "Category: (global)"
  const ing = payload.ingredients?.length ? `Ingredients: ${payload.ingredients.join(", ")}` : "Ingredients: (none)"
  const q = payload.query?.trim() ? `User query: ${payload.query.trim()}` : "User query: (none)"

  return `
You are Recipe Finder+.
Return STRICT JSON with 5–10 recipe ideas:

{
  "ideas": [
    { "id": "quick-paneer-makhani", "title": "Quick Paneer Makhani", "blurb": "Creamy weeknight curry.", "categoryId": "quick-curries" }
  ]
}

Rules:
- "id" must be URL-safe slug (lowercase, hyphens).
- "title" concise and specific.
- "blurb" max 1 short sentence.
- Only 5–10 ideas.
- Consider category and ingredients when given.

${cat}
${ing}
${q}
  `.trim()
}

function detailPrompt(payload: { title: string; categoryId?: string; ingredients?: string[]; query?: string }) {
  const cat = payload.categoryId ? `Category: ${payload.categoryId}` : "Category: (unspecified)"
  const ing = payload.ingredients?.length
    ? `Ingredients to incorporate: ${payload.ingredients.join(", ")}`
    : "Ingredients to incorporate: (none)"
  const q = payload.query?.trim() ? `Original user query: ${payload.query.trim()}` : ""
  const id = slugify(payload.title)

  return `
You are Recipe Finder+.
Return STRICT JSON for ONE detailed recipe:

{
  "recipe": {
    "id": "${id}",
    "title": "${payload.title}",
    "category": "${payload.categoryId ?? ""}",
    "servings": 2,
    "totalTimeMinutes": 30,
    "ingredients": ["..."],
    "steps": ["..."],
    "tips": ["optional tip 1", "optional tip 2"]
  }
}

Constraints:
- 8–14 ingredients, realistic pantry items.
- 6–10 steps, each a single sentence (no numbering in text).
- Prefer weeknight-friendly unless category suggests otherwise.

${cat}
${ing}
${q}
  `.trim()
}

// ================== Routes ==================
app.get("/api/health", (_req: Request, res: Response) => res.json({ ok: true }))

// Categories (static)
app.get("/api/categories", (_req: Request, res: Response) => {
  res.json({ categories: CATEGORIES })
})

// Ideas (Gemini) — supports direct query OR category + ingredients
app.post("/api/ideas", async (req: Request, res: Response) => {
  try {
    const payload = req.body as { query?: string; categoryId?: string; ingredients?: string[] }
    console.log("[v0] /api/ideas received payload:", payload) // Add debug log for ideas payload
    const data = await callGeminiJSON(searchPrompt(payload))

    if (Array.isArray(data?.ideas)) {
      data.ideas = data.ideas.slice(0, 10).map((it: any) => ({
        id: slugify(it?.id || it?.title || "recipe-idea"),
        title: String(it?.title || "Recipe Idea"),
        blurb: String(it?.blurb || ""),
        categoryId: it?.categoryId || payload.categoryId,
      }))

      // attach image
      await Promise.all(
        data.ideas.map(async (it: any) => {
          const q = `${it.title} indian paneer dish`
          it.imageUrl = await getImageUrl(q, it.id)
          it.imageAlt = it.title
        }),
      )
    } else {
      console.warn("[v0] Gemini returned no ideas or invalid ideas format:", data) // Add debug log for invalid ideas
      data.ideas = []
    }
    res.json(data)
  } catch (e) {
    console.error("[v0] /api/ideas error:", e) // Add debug log for ideas error
    res.status(500).json({ error: "Failed to generate ideas" })
  }
})

// Recipe detail (Gemini)
app.post("/api/recipe", async (req: Request, res: Response) => {
  try {
    const payload = req.body as { title: string; categoryId?: string; ingredients?: string[]; query?: string }
    console.log("[v0] /api/recipe received payload:", payload) // Add debug log for recipe detail payload
    if (!payload?.title) return res.status(400).json({ error: "title is required" })

    const data = await callGeminiJSON(detailPrompt(payload))

    if (data?.recipe) {
      data.recipe.id = slugify(data.recipe.id || data.recipe.title)
      data.recipe.title = String(data.recipe.title || payload.title)
      data.recipe.category = data.recipe.category || payload.categoryId || ""
      data.recipe.servings = Number(data.recipe.servings || 2)
      data.recipe.totalTimeMinutes = Number(data.recipe.totalTimeMinutes || 30)
      data.recipe.ingredients = Array.isArray(data.recipe.ingredients) ? data.recipe.ingredients : []
      data.recipe.steps = Array.isArray(data.recipe.steps) ? data.recipe.steps : []
      data.recipe.tips = Array.isArray(data.recipe.tips) ? data.recipe.tips : []

      const q = `${data.recipe.title} indian paneer dish`
      data.recipe.imageUrl = await getImageUrl(q, data.recipe.id)
      data.recipe.imageAlt = data.recipe.title
    } else {
      console.warn("[v0] Gemini returned no recipe or invalid recipe format:", data) // Add debug log for invalid recipe
      data.recipe = null
    }
    res.json(data)
  } catch (e) {
    console.error("[v0] /api/recipe error:", e) // Add debug log for recipe detail error
    res.status(500).json({ error: "Failed to generate recipe detail" })
  }
})

// Legacy simple endpoint (kept for your old UI)
app.post("/api/gemini", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as { prompt?: string }
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required" })

    const systemInstruction = `
You are Recipe Finder+. Given a list of ingredients, return 5 concise recipe ideas.
Number them 1-5 and keep each to a single sentence with a clear dish name.
Prefer quick, weeknight-friendly options.`.trim()

    const payload = {
      contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nIngredients: ${prompt}` }] }],
    }

    const r = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!r.ok) return res.status(r.status).json({ error: await r.text() })

    const json = (await r.json()) as GeminiGenerateContentResponse
    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text ?? "")
        .join("")
        .trim() ?? ""

    res.json({ text })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Server error" })
  }
})

// Error handler (last)
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal Server Error" })
})

// Listen
const port = Number(process.env["PORT"] ?? 3000)
const host = "127.0.0.1"
app.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`)
})
