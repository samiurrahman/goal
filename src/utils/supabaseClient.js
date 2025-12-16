import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tkdjnpfvtgpfmuoroazs.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrZGpucGZ2dGdwZm11b3JvYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDAwNDYsImV4cCI6MjA4MDMxNjA0Nn0.FuEMRsi_sCCLRp51v8qTtSAINjhSHOsD5aFQL_mzAPg";

const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
