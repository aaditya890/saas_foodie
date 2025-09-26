import { Injectable } from "@angular/core"
import { BehaviorSubject, type Observable } from "rxjs"
import { RecipeDetail } from "../models/recipe-detail.model"

@Injectable({
  providedIn: "root",
})
export class DialogService {
  private showDialogSubject = new BehaviorSubject<boolean>(false)
  showDialog$: Observable<boolean> = this.showDialogSubject.asObservable()

  private recipeDetailSubject = new BehaviorSubject<RecipeDetail | null>(null)
  recipeDetail$: Observable<RecipeDetail | null> = this.recipeDetailSubject.asObservable()

  constructor() {}

  openDialog(recipe: any) {
    console.log("[v0] DialogService: Opening dialog with recipe:", recipe)
    this.recipeDetailSubject.next(recipe)
    this.showDialogSubject.next(true)
  }

  closeDialog() {
    console.log("[v0] DialogService: Closing dialog")
    this.showDialogSubject.next(false)
    this.recipeDetailSubject.next(null)
  }
}
