import { Component, inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule } from "@angular/forms"
import { RecipeService } from "../../services/recipe.service"
import { RecipeDetailDialogComponent } from "../../components/recipe-detail-dialog/recipe-detail-dialog.component" // Import RecipeDetailDialogComponent
import { DialogService } from "../../services/dialog.service"
import { Idea } from "../../models/idea.model"
import { Category } from "../../models/category.model"
import { RecipeDetail } from "../../models/recipe-detail.model"

type Mode = "CHOOSE" | "DIRECT" | "CATEGORY" | "INGR" | "IDEAS" | "DETAIL"

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RecipeDetailDialogComponent], // Add RecipeDetailDialogComponent to imports
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent {
  private api = inject(RecipeService)
  private dialogService = inject(DialogService)

  mode: Mode = "CHOOSE"
  loading = false
  error: string | null = null

  // direct path
  query = ""
  directIdeas: Idea[] = []

  // category path
  categories: Category[] = []
  selectedCategory: Category | null = null
  ingredients: string[] = []
  ingredientInput = ""
  categoryIdeas: Idea[] = []
  predefinedIngredients: string[] = [] // Add predefinedIngredients property

  // optional (home pe detail render karna ho to)
  detail: RecipeDetail | null = null
  selectedIdea: Idea | null = null

  constructor() {
    this.api.getCategories().subscribe({
      next: ({ categories }) => {
        console.log("[v0] HomeComponent: Categories loaded:", categories) // Add debug log
        this.categories = categories
      },
      error: (e) => {
        console.error("[v0] HomeComponent: Failed to load categories:", e) // Add error log
        this.error = "Failed to load categories." // Set user-friendly error message
        this.categories = []
      },
    })
  }

  // choose path
  useDirect() {
    this.mode = "DIRECT"
    this.error = null
    this.categoryIdeas = [] // clear category results
    this.selectedCategory = null
    this.ingredients = []
    this.predefinedIngredients = [] // Clear predefined ingredients when switching to direct search
  }

  useCategory() {
    this.mode = "CATEGORY"
    this.error = null
    this.directIdeas = [] // clear direct results
    this.query = ""
  }

  // direct ideas
  searchDirect() {
    if (!this.query.trim()) return
    this.loading = true
    this.error = null
    this.directIdeas = []
    this.categoryIdeas = [] // IMPORTANT: clear category list
    this.api.getIdeas({ query: this.query }).subscribe({
      next: ({ ideas }) => {
        console.log("[v0] HomeComponent: Direct ideas loaded:", ideas) // Add debug log
        this.directIdeas = ideas
        this.mode = "IDEAS"
      },
      error: (e) => {
        console.error("[v0] HomeComponent: Failed to fetch direct ideas:", e) // Add error log
        this.error = "Failed to fetch ideas. Please try again." // Set user-friendly error message
      },
      complete: () => (this.loading = false),
    })
  }

  // category path
  pickCategory(cat: Category) {
    this.selectedCategory = cat
    this.ingredients = []
    this.mode = "INGR"
    switch (cat.id) {
      case "indian":
        this.predefinedIngredients = [
          "paneer",
          "chicken",
          "potato",
          "onion",
          "tomato",
          "ginger",
          "garlic",
          "chilli",
          "cumin",
          "coriander",
        ]
        break
      case "italian":
        this.predefinedIngredients = [
          "pasta",
          "tomato",
          "garlic",
          "basil",
          "mozzarella",
          "parmesan",
          "olive oil",
          "onion",
          "oregano",
        ]
        break
      case "mexican":
        this.predefinedIngredients = [
          "tortilla",
          "beans",
          "cheese",
          "avocado",
          "tomato",
          "onion",
          "jalapeno",
          "lime",
          "cilantro",
          "chicken",
          "beef",
        ]
        break
      case "chinese":
        this.predefinedIngredients = [
          "noodles",
          "rice",
          "soy sauce",
          "ginger",
          "garlic",
          "broccoli",
          "carrot",
          "chicken",
          "pork",
          "tofu",
        ]
        break
      case "thai":
        this.predefinedIngredients = [
          "coconut milk",
          "lemongrass",
          "galangal",
          "chilli",
          "fish sauce",
          "rice noodles",
          "chicken",
          "shrimp",
          "lime",
          "basil",
        ]
        break
      default:
        this.predefinedIngredients = []
        break
    }
  }

  addIngredient() {
    const s = this.ingredientInput.trim()
    if (!s) return
    const k = s.toLowerCase()
    if (!this.ingredients.includes(k)) this.ingredients.push(k)
    this.ingredientInput = ""
  }

  addPredefinedIngredient(ingredient: string) {
    const k = ingredient.toLowerCase()
    if (!this.ingredients.includes(k)) {
      this.ingredients.push(k)
    }
  }

  removeIngredient(i: number) {
    this.ingredients.splice(i, 1)
  }

  searchCategoryIdeas() {
    if (!this.selectedCategory) return
    this.loading = true
    this.error = null
    this.categoryIdeas = []
    this.directIdeas = [] // IMPORTANT: clear direct list
    this.api.getIdeas({ categoryId: this.selectedCategory.id, ingredients: this.ingredients }).subscribe({
      next: ({ ideas }) => {
        console.log("[v0] HomeComponent: Category ideas loaded:", ideas) // Add debug log
        this.categoryIdeas = ideas
        this.mode = "IDEAS"
      },
      error: (e) => {
        console.error("[v0] HomeComponent: Failed to fetch category ideas:", e) // Add error log
        this.error = "Failed to fetch ideas. Please try again." // Set user-friendly error message
      },
      complete: () => (this.loading = false),
    })
  }

  // detail — NAVIGATE IMMEDIATELY (no prefetch here)
  openDetail(idea: Idea) {
    this.loading = true
    this.error = null
    this.api.getRecipeDetail({ title: idea.title }).subscribe({
      next: (recipe) => {
        console.log("[v0] HomeComponent: Recipe detail loaded for dialog:", recipe)
        this.dialogService.openDialog(recipe)
        this.loading = false
      },
      error: (e) => {
        console.error("[v0] HomeComponent: Failed to fetch recipe detail for dialog:", e)
        this.error = "Failed to load recipe details. Please try again."
        this.loading = false
      },
    })
  }
}
