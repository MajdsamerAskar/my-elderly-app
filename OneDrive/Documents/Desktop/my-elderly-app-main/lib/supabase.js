import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
 
// 👇 Replace these with your actual values from Supabase Dashboard → Settings → API
const SUPABASE_URL = 'https://ttjxoxwngzzobvkzuble.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0anhveHduZ3p6b2J2a3p1YmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTM2NjQsImV4cCI6MjA4OTY2OTY2NH0.5RQdHPehzIcX1-JjgErxtCNrWSla5wITcAMdhhpPlRY'
 
// This keeps the user logged in between app restarts
const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})