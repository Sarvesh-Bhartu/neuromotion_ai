import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const usePatientStore = create((set, get) => ({
  user: null,
  profile: null,
  profileLoaded: false, // Tracks if we have finished checking the DB
  doctor_sync_code: null,
  baseline_rom: 0,
  
  setUser: (user) => {
    set({ user });
    if (user?.id) {
      get().fetchProfile(user.id);
    } else {
      set({ profile: null, profileLoaded: true }); // No user = loaded as null
    }
  },
  
  fetchProfile: async (userId) => {
     if (!userId) return;
     try {
       const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
       if (!error && data) {
          set({ 
            profile: data, 
            doctor_sync_code: data.doctor_sync_code,
            baseline_rom: data.baseline_rom || 0,
            profileLoaded: true 
          });
       } else {
          set({ profile: null, profileLoaded: true });
       }
     } catch (e) {
       console.error("No profile found or error fetching:", e);
       set({ profile: null, profileLoaded: true });
     }
  },
  
  updateSyncCode: async (code) => {
    const user = get().user;
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles').update({ doctor_sync_code: code }).eq('id', user.id);
      if (!error) set({ doctor_sync_code: code });
    } catch (e) {
      console.error("Error updating sync code:", e);
    }
  }
}))
