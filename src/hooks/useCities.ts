import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";

/**
 * Custom hook to fetch cities from Supabase.
 * Returns { data: cities, error, isLoading }
 */
export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      let { data: cities, error } = await supabase.from("cities").select("*");
      if (error) throw error;
      return cities;
    },
  });
}
