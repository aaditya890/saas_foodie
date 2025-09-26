export interface RecipeDetail {
  id: string
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
