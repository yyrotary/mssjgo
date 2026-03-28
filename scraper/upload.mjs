import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY in env.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_IMG_URL = "https://furoku.github.io/bananaX/projects/infographic-evaluation/ko/";

async function getJson(filename) {
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    }
    return [];
}

async function uploadFile(filename, type) {
    const items = await getJson(filename);
    console.log(`Found ${items.length} items in ${filename}`);

    for (const item of items) {
        const originalId = item.id || `${type}_${Math.random().toString(36).substr(2, 9)}`;

        // Construct absolute image URL
        let imageUrl = item.img;
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = new URL(imageUrl, BASE_IMG_URL).toString();
        }

        const payload = {
            original_id: originalId,
            type: type,
            name: item.name || item.name_ko || "Unknown",
            prompt_text: item.yaml || item.prompt || "",
            image_url: imageUrl || "",
            metadata: item
        };

        const { data, error } = await supabase
            .from('prompts')
            .upsert(payload, { onConflict: 'original_id' });

        if (error) {
            console.error(`Error uploading ${item.name}:`, error.message);
        } else {
            console.log(`Uploaded: ${item.name}`);
        }
    }
}

async function main() {
    await uploadFile("business_prompts.json", "business");
    await uploadFile("evaluation_data.json", "evaluation");
    await uploadFile("evaluation_lite.json", "evaluation_lite");
    console.log("Upload complete!");
}

main().catch(console.error);
