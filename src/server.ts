import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto"; // <-- 1. 내장 crypto 모듈 import!
import { extractGraphFromPaper } from "./services/geminiService";
import { processGraphHierarchy } from "./services/graphService";
import { initDatabase, saveGraphToDb } from "./db/database"; // <-- 2. DB 함수 import!

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// 서버 시작 시 DB 테이블 자동 생성
initDatabase();

app.get("/", (req: Request, res: Response) => {
    res.send("ContextTracer 백엔드 API 서버가 정상 작동 중입니다! 🚀");
});

// 논문 분석 및 저장 API
app.post("/api/analyze-paper", async (req: Request, res: Response) => {
    try {
        const { docId, paperText } = req.body;

        if (!paperText) {
            return res.status(400).json({ error: "논문 텍스트(paperText)가 누락되었습니다." });
        }

        // 3. docId가 없으면 논문 텍스트 해시값(SHA-256)으로 자동 생성!
        const effectiveDocId =
            docId ||
            `doc_${crypto
                .createHash("sha256")
                .update(paperText)
                .digest("hex")
                .slice(0, 16)}`;

        console.log(`[분석 시작] 문서 ID: ${effectiveDocId}`);

        // 1단계: Gemini로 원본 지식 그래프(노드/엣지/챕터) 추출
        const rawGraphData = await extractGraphFromPaper(paperText);
        console.log(
            `[Gemini 완료] 노드: ${rawGraphData.nodes.length}개, 엣지: ${rawGraphData.edges.length}개`
        );

        // 2단계: SQLite DB에 영구 저장 (원본 보존)
        saveGraphToDb(effectiveDocId, rawGraphData);

        // 3단계: BFS 기반 계층링 산출 및 트리뷰 구조화
        const processedResult = processGraphHierarchy(effectiveDocId, rawGraphData);
        console.log(`[가공 완료] 챕터: ${processedResult.chapters.length}개 처리 완료`);

        // 4단계: 최종 JSON 응답
        return res.status(200).json(processedResult);
    } catch (error: any) {
        console.error("논문 분석 실패:", error);
        return res.status(500).json({
            error: "논문 분석 중 서버 오류가 발생했습니다.",
            details: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`ContextTracer 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
});