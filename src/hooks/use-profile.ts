import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  kyc_status: string;
  profile_photo_url: string | null;
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let realtimeCleanup: (() => void) | null = null;

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          if (!cancelled) { setProfile(null); setLoading(false); }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, phone, email, kyc_status, profile_image_url")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[useProfile] Error fetching profile:", error);
          if (!cancelled) setLoading(false);
          return;
        }

        if (data && (data as any).user_id !== user.id) {
          console.error("[useProfile] SECURITY: Profile user_id mismatch!");
          if (!cancelled) { setProfile(null); setLoading(false); }
          return;
        }

        if (!cancelled) {
          if (data) {
            // Map profile_image_url to profile_photo_url for internal use
            setProfile({
              id: (data as any).id,
              user_id: (data as any).user_id,
              full_name: (data as any).full_name,
              phone: (data as any).phone,
              email: (data as any).email,
              kyc_status: (data as any).kyc_status,
              profile_photo_url: (data as any).profile_image_url,
            });
          }
          setLoading(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('[useProfile] Request aborted (normal in development)');
        } else {
          console.error("Failed to fetch profile:", error);
        }
        if (!cancelled) setLoading(false);
      }
    };

    const setupRealtimeSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        
        const channel = supabase
          .channel(`profile-${user.id}`)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
            (payload) => {
              if (payload.new && !cancelled) {
                const d = payload.new as any;
                if (d.user_id !== user.id) return;
                setProfile({
                  id: d.id,
                  user_id: d.user_id,
                  full_name: d.full_name,
                  phone: d.phone,
                  email: d.email,
                  kyc_status: d.kyc_status,
                  profile_photo_url: d.profile_image_url || d.profile_photo_url,
                });
              }
            }
          )
          .subscribe();

        realtimeCleanup = () => supabase.removeChannel(channel);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.error('[useProfile] Failed to setup real-time subscription:', error);
        }
      }
    };
    
    fetchProfile();
    setupRealtimeSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) {
        if (realtimeCleanup) { realtimeCleanup(); realtimeCleanup = null; }
        fetchProfile();
        setupRealtimeSubscription();
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      if (realtimeCleanup) realtimeCleanup();
    };
  }, []);

  return { profile, loading };
}
