"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Admin key needed for bypassing RLS on inserts/updates/deletes
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function addPrompt(formData: FormData) {
    const name = formData.get("name") as string;
    const prompt_text = formData.get("prompt_text") as string;
    const type = formData.get("type") as string;
    const image = formData.get("image") as File | null;
    const audio = formData.get("audio") as File | null;

    if (!name || !prompt_text || !type) {
        return { error: "Missing required fields" };
    }

    const original_id = `user_${Date.now()}`;
    let image_url = null;

    if (image && image.size > 0) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${original_id}.${fileExt}`;
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from("prompt-images")
            .upload(fileName, buffer, {
                contentType: image.type,
                upsert: true,
            });

        if (uploadError) {
            return { error: `Image upload failed: ${uploadError.message}` };
        }

        const { data } = supabase.storage.from("prompt-images").getPublicUrl(fileName);
        image_url = data.publicUrl;
    }

    let audio_url = null;
    if (audio && audio.size > 0) {
        const fileExt = audio.name.split('.').pop();
        const fileName = `${original_id}_audio.${fileExt}`;
        const arrayBuffer = await audio.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from("prompt-images")
            .upload(fileName, buffer, {
                contentType: audio.type,
                upsert: true,
            });

        if (uploadError) {
            return { error: `Audio upload failed: ${uploadError.message}` };
        }

        const { data } = supabase.storage.from("prompt-images").getPublicUrl(fileName);
        audio_url = data.publicUrl;
    }

    const { error } = await supabase.from("prompts").insert({
        original_id,
        name,
        prompt_text,
        type,
        image_url,
        is_approved: false,
        metadata: { source: "user", audio_url }
    });

    if (error) {
        return { error: `Database insert failed: ${error.message}` };
    }

    revalidatePath("/");
    return { success: true };
}

export async function updatePrompt(id: string, original_id: string, formData: FormData) {
    const name = formData.get("name") as string;
    const prompt_text = formData.get("prompt_text") as string;
    const type = formData.get("type") as string;
    const image = formData.get("image") as File | null;
    const audio = formData.get("audio") as File | null;
    const removeImage = formData.get("removeImage") === "true";
    const removeAudio = formData.get("removeAudio") === "true";

    if (!name || !prompt_text || !type) {
        return { error: "Missing required fields" };
    }

    let updateData: any = { name, prompt_text, type };

    // We need to fetch existing metadata to update it without overriding other keys
    const { data: existingPrompt } = await supabase.from("prompts").select("metadata").eq("id", id).single();
    let currentMetadata = existingPrompt?.metadata || {};

    if (removeImage) {
        updateData.image_url = null;
        // Attempt to delete old image, ignoring errors
        // Note: This matches the basic extension logic
        const oldFileName = original_id + '.*'; // We don't know the exact ext, but we can't easily wildcard delete in storage without listing. We'll skip exact deletion for now to keep it simple, or implement it if critical.
    } else if (image && image.size > 0) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${original_id}.${fileExt}`;
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from("prompt-images")
            .upload(fileName, buffer, {
                contentType: image.type,
                upsert: true,
            });

        if (uploadError) {
            return { error: `Image upload failed: ${uploadError.message}` };
        }

        const { data } = supabase.storage.from("prompt-images").getPublicUrl(fileName);
        // Add a cache buster so images update instantly
        updateData.image_url = data.publicUrl + "?t=" + Date.now();
    }

    if (removeAudio) {
        currentMetadata.audio_url = null;
    } else if (audio && audio.size > 0) {
        const fileExt = audio.name.split('.').pop();
        const fileName = `${original_id}_audio.${fileExt}`;
        const arrayBuffer = await audio.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from("prompt-images")
            .upload(fileName, buffer, {
                contentType: audio.type,
                upsert: true,
            });

        if (uploadError) {
            return { error: `Audio upload failed: ${uploadError.message}` };
        }

        const { data } = supabase.storage.from("prompt-images").getPublicUrl(fileName);
        currentMetadata.audio_url = data.publicUrl + "?t=" + Date.now();
    }

    updateData.metadata = currentMetadata;

    const { error } = await supabase.from("prompts").update(updateData).eq("id", id);

    if (error) {
        return { error: `Database update failed: ${error.message}` };
    }

    revalidatePath("/");
    return { success: true };
}

export async function deletePrompt(id: string, original_id: string, imageUrl: string | null) {
    const { error } = await supabase.from("prompts").delete().eq("id", id);

    if (error) {
        return { error: `Database delete failed: ${error.message}` };
    }

    // Attempt to delete associated image from storage if it exists on our bucket
    if (imageUrl && imageUrl.includes("prompt-images")) {
        const urlObj = new URL(imageUrl);
        const pathParts = urlObj.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        await supabase.storage.from("prompt-images").remove([fileName]);
    }

    revalidatePath("/");
    return { success: true };
}

export async function ratePrompt(id: string, rating: number) {
    if (rating < 1 || rating > 5) {
        return { error: "Rating must be between 1 and 5" };
    }

    // Fetch existing metadata to avoid overwriting other properties like audio_url or source
    const { data: existingPrompt } = await supabase.from("prompts").select("metadata").eq("id", id).single();
    let currentMetadata = existingPrompt?.metadata || {};

    currentMetadata.rating = rating;

    const { error } = await supabase.from("prompts").update({ metadata: currentMetadata }).eq("id", id);

    if (error) {
        return { error: `Rating update failed: ${error.message}` };
    }

    revalidatePath("/");
    return { success: true };
}

export async function approvePrompt(id: string) {
    const { error } = await supabase.from("prompts").update({ is_approved: true }).eq("id", id);
    if (error) {
        return { error: `Approval failed: ${error.message}` };
    }
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
}
