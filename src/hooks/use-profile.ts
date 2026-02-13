import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  kyc_status: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, email, kyc_status")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!cancelled && data) {
        setProfile(data);
      }
      if (!cancelled) setLoading(false);
    };

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}
