import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private snackBar: MatSnackBar) {}

  showSuccess(message: string): void {
    this.open(message, ['toast-success']);
  }

  showError(message: string): void {
    this.open(message, ['toast-error']);
  }

  showInfo(message: string): void {
    this.open(message, ['toast-info']);
  }

  private open(message: string, panelClass: string[]): void {
    const config: MatSnackBarConfig = {
      duration: 2500,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass
    };

    this.snackBar.open(message, undefined, config);
  }
}

