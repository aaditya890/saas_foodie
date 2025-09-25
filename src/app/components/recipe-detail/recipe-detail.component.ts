import { Component, inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute } from "@angular/router"
import { Title, Meta } from "@angular/platform-browser"
import { RecipeService } from "../../services/recipe.service"
import { RecipeDetail } from "../../models/recipe-detail.model"


@Component({
  selector: "app-recipe-detail",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./recipe-detail.component.html",
  styleUrls: ["./recipe-detail.component.scss"],
})
export class RecipeDetailComponent {
  private route = inject(ActivatedRoute)
  private api = inject(RecipeService)
  private titleSvc = inject(Title)
  private meta = inject(Meta)

  detail: RecipeDetail | null = null
  loading = true
  err: string | null = null

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get("slug")!
    const q = this.route.snapshot.queryParamMap.get("q") || undefined
    const cat = this.route.snapshot.queryParamMap.get("cat") || undefined
    const ingParam = this.route.snapshot.queryParamMap.get("ing") || ""
    const ingredients = ingParam
      ? ingParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined

    const titleGuess = slug.replace(/-/g, " ")

    this.api.getRecipeDetail({ title: titleGuess, categoryId: cat, ingredients, query: q }).subscribe({
      next: ({ recipe }) => {
        console.log("[v0] RecipeDetailComponent: Recipe detail loaded:", recipe) // Add debug log
        this.detail = recipe
        const pageTitle = `${recipe.title} | Recipe Finder+`
        const descr = `How to make ${recipe.title} in ~${recipe.totalTimeMinutes} mins. Ingredients: ${recipe.ingredients.slice(0, 6).join(", ")}...`
        this.titleSvc.setTitle(pageTitle)
        this.meta.updateTag({ name: "description", content: descr })
        this.loading = false // success path
      },
      error: (e) => {
        console.error("[v0] RecipeDetailComponent: Failed to load recipe detail:", e) // Add error log
        this.err = "Failed to load recipe. Please try again later." // Set user-friendly error message
        this.loading = false // IMPORTANT: stop spinner on error
      },
    })
  }
}
