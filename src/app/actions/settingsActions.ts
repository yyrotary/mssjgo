"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getSetting(key: string, fallback: string) {
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", key).single();
    if (error || !data) {
        return fallback;
    }
    return data.value;
}

export async function updateSetting(key: string, value: string) {
    // Upsert the setting
    const { error } = await supabase.from("site_settings").upsert({ key, value });
    if (error) {
        return { error: `Failed to update ${key}: ${error.message}` };
    }
    
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
}
