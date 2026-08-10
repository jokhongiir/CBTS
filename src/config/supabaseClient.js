// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cnlbqsugfwctfncmlvim.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubGJxc3VnZndjdGZuY21sdmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MDI3MDAsImV4cCI6MjA5ODk3ODcwMH0.xuUPD94qmUWxTPLQ3PJitGE2S9xiph5ZjHAeAXuj0-k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});