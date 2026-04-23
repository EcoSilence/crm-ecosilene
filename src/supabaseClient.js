import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aopxqymvcgaklfwqhjjv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcHhxeW12Y2dha2xmd3Foamp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzI3MzQsImV4cCI6MjA5MjU0ODczNH0.BgKxvitxbIn_ZHqu9fZw_1d0IFmSlKuRqOle3n8Ngoc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
