import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rtwuvssixbdpckpytrel.supabase.co'
const supabaseAnonKey = 'sb_publishable_jdOcDOq5FFeL8xbixubZnA__wkABEg4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
