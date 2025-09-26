import { Component, inject } from '@angular/core';
import { DialogService } from '../../services/dialog.service';
import { RecipeDetail } from '../../models/recipe-detail.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recipe-detail-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-detail-dialog.component.html',
  styleUrl: './recipe-detail-dialog.component.scss'
})
export class RecipeDetailDialogComponent {
    private dialogService = inject(DialogService)
  showDialog = false
  recipe: RecipeDetail | null = null
  private subscriptions = new Subscription()

  ngOnInit() {
    this.subscriptions.add(
      this.dialogService.showDialog$.subscribe((show) => {
        this.showDialog = show
        console.log("[v0] RecipeDetailDialogComponent: showDialog updated to", show)
      }),
    )
    this.subscriptions.add(
      this.dialogService.recipeDetail$.subscribe((recipe) => {
        this.recipe = recipe
        console.log("[v0] RecipeDetailDialogComponent: recipe updated to", recipe?.title)
      }),
    )
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe()
  }

  closeDialog() {
    this.dialogService.closeDialog()
  }
}
