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

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Status: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
}

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

        let promptText = item.yaml || item.prompt || "";
        // Note to handle empty prompts
        if (!promptText && type === "evaluation_lite") {
            promptText = "이 항목(evaluation_lite)은 원본 데이터에 프롬프트 텍스트가 존재하지 않고 이미지만 존재하는 샘플입니다.";
        } else if (!promptText) {
            promptText = "프롬프트 데이터가 제공되지 않았습니다.";
        }

        let imageUrl = item.img;
        let localImagePath = "";

        if (imageUrl) {
            const isAbsolute = imageUrl.startsWith('http');
            const absoluteUrl = isAbsolute ? imageUrl : new URL(imageUrl, BASE_IMG_URL).toString();

            const parsedUrl = new URL(absoluteUrl);
            const filenameOnly = path.basename(parsedUrl.pathname);
            const localFilePath = path.join(imagesDir, filenameOnly);

            try {
                if (!fs.existsSync(localFilePath)) {
                    console.log(`Downloading ${absoluteUrl}...`);
                    await downloadImage(absoluteUrl, localFilePath);
                }
                localImagePath = `/images/${filenameOnly}`;
            } catch (err) {
                console.error(`Error downloading ${imageUrl}:`, err.message);
                localImagePath = absoluteUrl; // fallback
            }
        }

        const payload = {
            original_id: originalId,
            type: type,
            name: item.name || item.name_ko || "Unknown",
            prompt_text: promptText,
            image_url: localImagePath, // update to local path
            metadata: item
        };

        const { error } = await supabase
            .from('prompts')
            .upsert(payload, { onConflict: 'original_id' });

        if (error) {
            console.error(`Error uploading ${item.name}:`, error.message);
        }
    }
}

async function main() {
    await uploadFile("business_prompts.json", "business");
    await uploadFile("evaluation_data.json", "evaluation");
    await uploadFile("evaluation_lite.json", "evaluation_lite");
    console.log("Upload & Download complete!");
}

main().catch(console.error);
