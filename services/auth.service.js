import { supabase } from '../lib/supabase'

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerUser(formData) {
  const {
    firstName,
    middleName,
    lastName,
    phone,
    dob,
    role,
    email,
    password,
  } = formData

  // Step 1: Create auth account in Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw authError

  const userId = authData.user.id

  // Step 2: Save user info to your users table
  const { error: userError } = await supabase.from('users').insert({
    user_id: userId,
    first_name: firstName,
    middle_name: middleName || null,
    last_name: lastName,
    phone_number: phone,
    date_of_birth: dob,
    role: role,
    email: email,
    password_hash: 'managed_by_supabase', // Supabase handles real password
  })

  if (userError) throw userError

  // Step 3: Create role-specific profile
  if (role === 'elderly') {
    const { error: profileError } = await supabase
      .from('elderly_profiles')
      .insert({ user_id: userId })

    if (profileError) throw profileError
  }

  if (role === 'caregiver') {
    const { error: profileError } = await supabase
      .from('caregiver_profiles')
      .insert({ user_id: userId })

    if (profileError) throw profileError
  }

  return authData
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  // Get role from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, first_name, last_name')
    .eq('user_id', data.user.id)
    .single()

  if (userError) throw userError

  return {
    user: data.user,
    role: userData.role,
    firstName: userData.first_name,
    lastName: userData.last_name,
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ─── Get Current User ─────────────────────────────────────────────────────────
export async function getCurrentUser() {
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) return null

  const userId = sessionData.session.user.id

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error

  return data
}