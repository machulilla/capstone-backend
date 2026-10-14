import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const apiKey = process.env.GEMINI_API_KEY || "";

if (!apiKey) {
    console.error("❌ [오류] GEMINI_API_KEY가 설정되지 않았습니다! .env 파일을 확인하세요.");
} else {
    console.log("🔑 GEMINI_API_KEY 확인 완료");
}

export const genAI = new GoogleGenerativeAI(apiKey);