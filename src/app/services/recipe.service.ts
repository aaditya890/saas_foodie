import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import  { Observable } from "rxjs"
import { Category } from "../models/category.model"
import { Idea } from "../models/idea.model"
import { RecipeDetail } from "../models/recipe-detail.model"


export const slugify = (s: string) => {
  console.log("[v0] Slugifying:", s) // Add debug log for slugify
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

@Injectable({ providedIn: "root" })
export class RecipeService {
  private base = "/api" // proxied to backend

  constructor(private http: HttpClient) {}

  // legacy (for your initial UI)
  getRecipes(prompt: string): Observable<{ text: string }> {
    console.log("[v0] RecipeService: Calling getRecipes with prompt:", prompt) // Add debug log
    return this.http.post<{ text: string }>(`${this.base}/gemini`, { prompt })
  }

  getCategories(): Observable<{ categories: Category[] }> {
    console.log("[v0] RecipeService: Calling getCategories") // Add debug log
    return this.http.get<{ categories: Category[] }>(`${this.base}/categories`)
  }

  getIdeas(payload: { query?: string; categoryId?: string; ingredients?: string[] }): Observable<{ ideas: Idea[] }> {
    console.log("[v0] RecipeService: Calling getIdeas with payload:", payload) // Add debug log
    return this.http.post<{ ideas: Idea[] }>(`${this.base}/ideas`, payload)
  }

  getRecipeDetail(payload: { title: string; categoryId?: string; ingredients?: string[]; query?: string }): Observable<{
    recipe: RecipeDetail
  }> {
    console.log("[v0] RecipeService: Calling getRecipeDetail with payload:", payload) // Add debug log
    return this.http.post<{ recipe: RecipeDetail }>(`${this.base}/recipe`, payload)
  }
}
