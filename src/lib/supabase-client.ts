import { createClient } from '@supabase/supabase-js'

// Ortam değişkenlerini kontrol et ve varsayılan değerler kullan
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxb2JqY3pjeGpvbG54ZnVheGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYyNzg0NjIsImV4cCI6MjAzMTg1NDQ2Mn0.Tl4kQAcpEPlbVi7J8uB4CKdxgL8n7xJcnQvLh1LkZT0';

// Gerekli kontrolleri yap
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase configuration is missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 