import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-exercises',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-exercises.component.html',
  styleUrl: './admin-exercises.component.css'
})
export class AdminExercisesComponent implements OnInit, OnDestroy {
  form = {
    name: '',
    description: '',
    muscleGroup: '',
    targetArea: '',
    type: ''
  };

  selectedFiles: File[] = [];
  previewUrls: Array<{ url: string; type: string }> = [];
  existingMedia: any[] = [];
  deletedMediaIds: number[] = [];
  muscleGroups: string[] = [];
  targetAreas: string[] = [];
  exercises: any[] = [];

  isEditMode = false;
  editingExerciseId: number | null = null;
  searchTerm = '';

  creating = false;
  successMessage = '';
  errorMessage = '';


  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadMuscleGroups();
    this.loadExercises();
  }

  get filteredExercises(): any[] {
    const query = String(this.searchTerm || '').trim().toLowerCase();
    if (!query) return this.exercises;

    return this.exercises.filter(ex => {
      const name = String(ex?.name || '').toLowerCase();
      const muscleGroup = String(ex?.muscleGroup || '').toLowerCase();
      const type = String(ex?.type || '').toLowerCase();
      return name.includes(query) || muscleGroup.includes(query) || type.includes(query);
    });
  }

  loadExercises() {
    this.http.get<any>(`${environment.apiBaseUrl}/api/admin/exercises`).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.exercises = Array.isArray(res.data) ? res.data : [];
        } else {
          this.exercises = [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.exercises = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadMuscleGroups() {
    this.http.get<any>(`${environment.apiBaseUrl}/api/admin/exercises/muscle-groups`).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.muscleGroups = Array.isArray(res.data)
            ? res.data.map((m: string) => String(m || '').toUpperCase())
            : [];
        } else {
          this.muscleGroups = [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.muscleGroups = [];
        this.cdr.detectChanges();
      }
    });
  }

  onMuscleChange(preselectedTargetArea?: string) {
    this.form.muscleGroup = String(this.form.muscleGroup || '').toUpperCase();
    this.form.targetArea = '';
    this.targetAreas = [];

    if (!this.form.muscleGroup) {
      this.cdr.detectChanges();
      return;
    }

    this.http.get<any>(`${environment.apiBaseUrl}/api/admin/exercises/target-areas/${encodeURIComponent(this.form.muscleGroup)}`).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.targetAreas = Array.isArray(res.data)
            ? res.data.map((a: string) => String(a || '').toUpperCase())
            : [];

          if (preselectedTargetArea) {
            const normalized = String(preselectedTargetArea).toUpperCase();
            if (this.targetAreas.includes(normalized)) {
              this.form.targetArea = normalized;
            }
          }
        } else {
          this.targetAreas = [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.targetAreas = [];
        this.cdr.detectChanges();
      }
    });
  }

  onFileSelect(event: any) {
    const files = Array.from(event?.target?.files || []) as File[];

    files.forEach(file => {
      this.selectedFiles.push(file);
      const normalizedType = (file.type || '').startsWith('image/')
        ? 'IMAGE'
        : (file.type || '').startsWith('video/')
          ? 'VIDEO'
          : 'FILE';

      this.previewUrls.push({
        url: URL.createObjectURL(file),
        type: normalizedType
      });
    });

    this.cdr.detectChanges();
  }

  removeExistingMedia(index: number) {
    const media = this.existingMedia[index];
    if (media?.id) {
      this.deletedMediaIds.push(media.id);
    }

    this.existingMedia.splice(index, 1);
    this.cdr.detectChanges();
  }

  removeFile(index: number) {
    const preview = this.previewUrls[index];
    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }

    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
    this.cdr.detectChanges();
  }

  editExercise(exercise: any) {
    const id = exercise?.id;
    if (!id) return;

    this.successMessage = '';
    this.errorMessage = '';

    this.http.get<any>(`${environment.apiBaseUrl}/api/admin/exercises/${id}`).subscribe({
      next: (res: any) => {
        const ex = res?.data || exercise;

        this.isEditMode = true;
        this.editingExerciseId = id;

        this.form.name = ex?.name || '';
        this.form.description = ex?.description || '';
        this.form.muscleGroup = String(ex?.muscleGroup || '').toUpperCase();
        this.form.type = String(ex?.type || '').toUpperCase();

        this.onMuscleChange(ex?.targetArea);

        this.existingMedia = Array.isArray(ex?.media) ? ex.media : [];
        this.deletedMediaIds = [];

        this.previewUrls.forEach(item => URL.revokeObjectURL(item.url));
        this.selectedFiles = [];
        this.previewUrls = [];

        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load exercise details.';
        this.cdr.detectChanges();
      }
    });
  }

  deleteExercise(id: number) {
    if (!confirm('Are you sure you want to delete this exercise?')) return;

    this.http.delete<any>(`${environment.apiBaseUrl}/api/admin/exercises/${id}`).subscribe({
      next: (res: any) => {
        if (res?.success !== false) {
          this.successMessage = 'Exercise deleted successfully';
          this.loadExercises();
        } else {
          this.errorMessage = res?.message || 'Failed to delete exercise';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to delete exercise';
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.form.name || !this.form.muscleGroup || !this.form.type) {
      this.errorMessage = 'Please fill required fields: name, muscle group, target area, and type.';
      return;
    }

    if (!this.form.targetArea) {
      this.errorMessage = 'Please select target area';
      return;
    }

    this.creating = true;
    if (this.isEditMode && this.editingExerciseId) {
      const formData = new FormData();
      formData.append('name', this.form.name);
      formData.append('description', this.form.description);
      formData.append('muscleGroup', this.form.muscleGroup);
      formData.append('targetArea', this.form.targetArea);
      formData.append('type', this.form.type);

      this.selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      this.deletedMediaIds.forEach(id => {
        formData.append('deletedMediaIds', String(id));
      });

      this.http.put<any>(`${environment.apiBaseUrl}/api/admin/exercises/${this.editingExerciseId}`, formData).subscribe({
        next: (res: any) => {
          if (res?.success !== false) {
            this.successMessage = 'Exercise updated successfully';
            this.resetForm();
            this.loadExercises();
          } else {
            this.errorMessage = res?.message || 'Failed to update exercise';
          }

          this.creating = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Failed to update exercise';
          this.creating = false;
          this.cdr.detectChanges();
        }
      });
      return;
    }

    const formData = new FormData();
    formData.append('name', this.form.name);
    formData.append('description', this.form.description);
    formData.append('muscleGroup', this.form.muscleGroup);
    formData.append('targetArea', this.form.targetArea);
    formData.append('type', this.form.type);

    this.selectedFiles.forEach(file => {
      formData.append('mediaFiles', file);
    });

    this.http.post<any>(`${environment.apiBaseUrl}/api/admin/exercises`, formData).subscribe({
      next: (res: any) => {
        if (res?.success !== false) {
          this.successMessage = 'Exercise created successfully';
          this.resetForm();
          this.loadExercises();
        } else {
          this.errorMessage = res?.message || 'Failed to create exercise';
        }

        this.creating = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to create exercise';
        this.creating = false;
        this.cdr.detectChanges();
      }
    });
  }

  resetForm() {
    this.form = {
      name: '',
      description: '',
      muscleGroup: '',
      targetArea: '',
      type: ''
    };
    this.targetAreas = [];
    this.existingMedia = [];
    this.deletedMediaIds = [];
    this.isEditMode = false;
    this.editingExerciseId = null;

    this.previewUrls.forEach(item => URL.revokeObjectURL(item.url));
    this.selectedFiles = [];
    this.previewUrls = [];
  }

  ngOnDestroy() {
    this.previewUrls.forEach(item => URL.revokeObjectURL(item.url));
  }
}

