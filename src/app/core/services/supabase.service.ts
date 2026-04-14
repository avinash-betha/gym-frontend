import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  private supabase = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );

  getClient() {
    return this.supabase;
  }
}