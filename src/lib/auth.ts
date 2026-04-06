import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Cached per-request auth helper.
 * React cache() deduplicates this across layout + page in the same render,
 * eliminating the double auth+profile fetch that previously happened on every navigation.
 */
export const getAuthProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return profile ?? null;
});
