import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  const token = localStorage.getItem('gym_token');


  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      const backendMessage = error?.error?.message;

      if (error?.status === 0) {
        toast.showError('Unable to connect. Check your network.');
      } else if (error?.status === 401) {
        toast.showError(backendMessage || 'Invalid credentials');
      } else if (error?.status === 403) {
        toast.showError('Access denied');
      } else if (error?.status === 500) {
        toast.showError('Server error. Try again later');
      } else {
        toast.showError(backendMessage || 'Something went wrong');
      }

      return throwError(() => error);
    })
  );
};
