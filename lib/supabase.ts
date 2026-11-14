import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// These are the VILATUCK project's public connection details.
// A publishable key is intended for client apps; never put a service_role/secret key here.
const supabaseUrl = "https://jmoiqgapovhlqxvxilsp.supabase.co";
const supabasePublishableKey = "sb_publishable_g7TxHRmWPJh-kDVNFZCweA_pYwuHkYg";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
