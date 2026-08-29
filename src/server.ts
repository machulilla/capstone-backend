import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config'; // api 키를 넣어둔 .env
import fs from 'fs';

const app = express();
const port = 3000;

app.use(express.json());

// 1. AI 준비하기
const apiKey = process.env.GEMINI_API_KEY || '';
console.log("API 키 로딩 테스트:", apiKey ? `성공! (시작 부분: ${apiKey.substring(0, 5)}...)` : "실패. 키가 비었습니다. (.env 로드 안됨)");

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

// 프롬프트 자판기 함수
function makePrompt(text: string) {
    return `
너는 다양한 장문 문서의 구조를 분석하고 시각화 데이터를 추출하는 최고 수준의 AI 아키텍트야.
아래 제공된 [문서 내용]을 읽고 지시사항에 따라 완벽한 JSON 형식으로 분석 결과를 출력해.

[마스터 태그 풀 (Master Tag Pool)]
1. 도입/배경
2. 문제제기
3. 개념정의
4. 핵심주장
5. 상세설명
6. 근거/데이터
7. 절차/방법
8. 예시/실습
9. 주의사항
10. 결정사항
11. 결론/요약
12. 향후계획

[지시사항]
1. 문서 전체의 맥락을 파악하여 가장 적절한 '문서 유형(예: 학술논문, 기술매뉴얼, 제품리뷰 등)'을 10자 이내로 정의해.
2. [마스터 태그 풀]에 있는 12개의 태그 중, 이 문서의 구조를 가장 잘 표현할 수 있는 태그 4~6개만 엄선해서 노드(nodes)를 생성해. (절대 풀에 없는 임의의 태그를 만들어 쓰면 안 됨)
3. 각 노드에는 태그 이름(type), 요약된 내용(content), 그리고 원문에서 가장 핵심이 되는 문장 1개(original_text)를 포함해.
4. 추출한 노드들 사이의 논리적 흐름(예: 문제제기 -> 핵심주장 -> 근거/데이터)을 파악하여 엣지(edges)로 연결해.
5. 응답은 반드시 아래의 JSON 구조로만 출력해야 하며, 설명이나 마크다운 코드 블록(\`\`\`json) 같은 불필요한 텍스트는 절대 포함하지 마.

[출력 JSON 구조]
{
  "document_type": "문서 유형",
  "nodes": [
    {
      "id": "node_1",
      "type": "마스터 태그 풀에서 선택한 태그",
      "content": "해당 부분의 핵심 내용 1~2줄 요약",
      "original_text": "원문에서 발췌한 가장 중요한 핵심 문장 1개"
    }
  ],
  "edges": [
    {
      "from": "node_1",
      "to": "node_2",
      "relation": "원인과 결과, 상하위 포함, 부연 설명 등"
    }
  ]
}

[문서 내용]
${text}
`;
}

app.get('/', (req: Request, res: Response) => {
    res.send('캡스톤 디자인 문서 탐색 서버가 작동 중입니다.');
});

// [API 1] 프론트엔드가 문서 텍스트를 던져줄 정식 API 주소
app.post('/api/analyze-document', async (req: Request, res: Response) => {
    try {
        const { documentText } = req.body;
        console.log("프론트엔드에서 텍스트가 도착했습니다. AI 분석 시작!");

        // 자판기 함수에 프론트엔드에서 받은 텍스트 넣기!
        const prompt = makePrompt(documentText);

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

        res.json({ success: true, message: "문서 분석 완료", data: JSON.parse(responseText) });
    } catch (error) {
        console.error("AI 분석 중 에러 발생:", error);
        res.status(500).json({ success: false, message: "AI 분석 실패" });
    }
});


// [API 2] sample.txt 로 테스트하기 위한 임시 API 주소
app.get('/api/test-local-text', async (req: Request, res: Response) => {
    try {
        console.log("sample.txt 파일을 읽기 시작합니다...");
        const extractedText = fs.readFileSync('sample.txt', 'utf-8');

        console.log("텍스트 추출 완료! 글자 수:", extractedText.length);
        console.log("제미나이(3.6 플래시)에게 분석을 넘깁니다...");

        // 자판기 함수에 텍스트 파일에서 읽은 글자 넣기
        const prompt = makePrompt(extractedText);

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

        res.json({ success: true, message: "텍스트 자동 추출 및 AI 분석 완료", data: JSON.parse(responseText) });
    } catch (error) {
        console.error("처리 중 에러 발생:", error);
        res.status(500).json({ success: false, message: "처리 실패" });
    }
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});