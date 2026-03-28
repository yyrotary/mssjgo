import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import https from 'https';

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

const imagesDir = path.join(__dirname, "..", "public", "images");
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

async function downloadImage(url, filepath) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    return filepath;
}

async function uploadFile(filename, type) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) return;
    const items = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`Found ${items.length} items in ${filename}`);

    for (const item of items) {
        const originalId = item.id || `${type}_${Math.random().toString(36).substr(2, 9)}`;
        const promptText = item.yaml || item.prompt || "프롬프트 데이터가 제공되지 않았습니다.";
        let imageUrl = item.img;
        let storageUrl = "";

        if (imageUrl) {
            if (!imageUrl.startsWith('http') && imageUrl.startsWith('assets/')) {
                imageUrl = '../' + imageUrl;
            }
            const isAbsolute = imageUrl.startsWith('http');
            const absoluteUrl = isAbsolute ? imageUrl : new URL(imageUrl, BASE_IMG_URL).toString();

            const parsedUrl = new URL(absoluteUrl);
            const filenameOnly = path.basename(parsedUrl.pathname);
            const localFilePath = path.join(imagesDir, filenameOnly);

            try {
                if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size < 100) {
                    console.log(`Downloading ${absoluteUrl}...`);
                    await downloadImage(absoluteUrl, localFilePath);
                }

                // Upload to Supabase Storage
                const fileExt = path.extname(filenameOnly);
                const fileName = `${originalId}${fileExt}`;
                const fileBuffer = fs.readFileSync(localFilePath);

                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('prompt-images')
                    .upload(fileName, fileBuffer, {
                        contentType: fileExt === '.png' ? 'image/png' : 'image/webp',
                        upsert: true
                    });

                if (uploadError) {
                    console.error(`Storage upload error for ${fileName}:`, uploadError.message);
                    storageUrl = localFilePath; // fallback to local if upload fails
                } else {
                    const { data: publicUrlData } = supabase
                        .storage
                        .from('prompt-images')
                        .getPublicUrl(fileName);
                    storageUrl = publicUrlData.publicUrl;
                }

            } catch (err) {
                console.error(`Error processing ${imageUrl}:`, err.message);
                storageUrl = absoluteUrl; // fallback
            }
        }

        const payload = {
            original_id: originalId,
            type: type,
            name: item.name || item.name_ko || "Unknown",
            prompt_text: promptText,
            image_url: storageUrl, // Supabase storage URL
            metadata: item
        };

        const { error } = await supabase
            .from('prompts')
            .upsert(payload, { onConflict: 'original_id' });

        if (error) {
            console.error(`Error uploading DB row ${item.name}:`, error.message);
        }
    }
}

async function createBucket() {
    const { data, error } = await supabase.storage.createBucket('prompt-images', { public: true });
    if (error && error.message !== 'The resource already exists') {
        console.error("Error creating bucket:", error.message);
    } else {
        console.log("Bucket 'prompt-images' is ready.");
    }
}

async function main() {
    await createBucket();
    await uploadFile("business_prompts.json", "business");
    await uploadFile("evaluation_data.json", "evaluation");
    // Skipped evaluation_lite because it overwrites evaluation_data with empty prompts!
    console.log("Upload to Storage and Database complete!");
}

main().catch(console.error);
