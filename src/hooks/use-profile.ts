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
          if (!cancelled) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, phone, email, kyc_status, profile_photo_url")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[useProfile] Error fetching profile:", error);
          if (!cancelled) setLoading(false);
          return;
        }

        // CRITICAL: Validate returned data matches authenticated user
        if (data && data.user_id !== user.id) {
          console.error("[useProfile] SECURITY: Profile user_id mismatch!", {
            expected: user.id,
            received: data.user_id,
            timestamp: new Date().toISOString()
          });
          // Reject mismatched data
          if (!cancelled) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          if (data) setProfile(data);
          setLoading(false);
        }
      } catch (error) {
        // Suppress AbortError in development (caused by rapid mount/unmount)
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('[useProfile] Request aborted (normal in development)');
        } else {
          console.error("Failed to fetch profile:", error);
        }
        if (!cancelled) setLoading(false);
      }
    };

    // Real-time updates for profile changes
    const setupRealtimeSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        
        console.log('[useProfile] Setting up real-time subscription for user:', user.id);
        
        const channel = supabase
          .channel(`profile-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              try {
                console.log('[useProfile] Received profile update event:', payload);
                if (payload.new && !cancelled) {
                  const updatedProfile = payload.new as ProfileData;
                  
                  // CRITICAL: Validate subscription update matches authenticated user
                  if (updatedProfile.user_id !== user.id) {
                    console.error("[useProfile] SECURITY: Subscription user_id mismatch!", {
                      expected: user.id,
                      received: updatedProfile.user_id,
                      timestamp: new Date().toISOString()
                    });
                    // Reject mismatched update
                    return;
                  }
                  
                  console.log('[useProfile] Updating profile state with:', updatedProfile);
                  setProfile(updatedProfile);
                }
              } catch (error) {
                console.error('[useProfile] Error processing subscription event:', error);
              }
            }
          )
          .subscribe((status) => {
            console.log('[useProfile] Subscription status:', status);
            if (status === 'SUBSCRIPTION_ERROR') {
              console.error('[useProfile] Subscription error occurred');
            }
          });

        realtimeCleanup = () => {
          console.log('[useProfile] Cleaning up real-time subscription');
          supabase.removeChannel(channel);
        };
      } catch (error) {
        // Suppress AbortError in development (caused by rapid mount/unmount)
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('[useProfile] Subscription setup aborted (normal in development)');
        } else {
          console.error('[useProfile] Failed to setup real-time subscription:', error);
        }
      }
    };
    
    fetchProfile();
    setupRealtimeSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useProfile] Auth state changed:', event, session?.user?.id);
      if (!cancelled) {
        // Clean up old subscription
        if (realtimeCleanup) {
          realtimeCleanup();
          realtimeCleanup = null;
        }
        // Refetch profile and re-establish subscription
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
