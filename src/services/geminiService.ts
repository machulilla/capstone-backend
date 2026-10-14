import { SchemaType } from "@google/generative-ai";
import { genAI } from "../config/gemini";
import { RawGraphData } from "../types/graph";

// 1. 타입을 직접 명시하지 않고 순수 객체로 선언 (ResponseSchema 타입 제거)
const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        chapters: {
            type: SchemaType.ARRAY,
            description: "논문의 주요 챕터 목록 (서론, 이론적배경, 방법론, 실험, 결론 등)",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.STRING },
                    title: { type: SchemaType.STRING },
                    order: { type: SchemaType.INTEGER },
                },
                required: ["id", "title", "order"],
            },
        },
        nodes: {
            type: SchemaType.ARRAY,
            description: "논문에서 추출한 핵심 개념, 문제점, 방법론 기법, 실험 결과 노드들",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.STRING },
                    chapter_id: { type: SchemaType.STRING },
                    title: { type: SchemaType.STRING },
                    pageNum: { type: SchemaType.INTEGER },
                    originalText: { type: SchemaType.STRING },
                },
                required: ["id", "chapter_id", "title", "pageNum", "originalText"],
            },
        },
        edges: {
            type: SchemaType.ARRAY,
            description: "노드 간의 논리적 인과 및 종속 관계선. 고립된 노드가 없도록 연결",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    source: { type: SchemaType.STRING },
                    target: { type: SchemaType.STRING },
                    relation: {
                        type: SchemaType.STRING,
                        description: "관계 유형 ('solves', 'proves', 'extends', 'contains' 중 하나)",
                    },
                },
                required: ["source", "target", "relation"],
            },
        },
    },
    required: ["chapters", "nodes", "edges"],
};

export async function extractGraphFromPaper(paperText: string): Promise<RawGraphData> {
    const model = genAI.getGenerativeModel({
        model: "gemini-3.8-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema as any, // 2. 여기서 'as any'를 붙여 엄격한 타입 체크 우회
            temperature: 0.2,
        },
        systemInstruction: `당신은 AI/컴퓨터공학 학술 논문 구조 분석 및 지식 그래프 구축 전문가입니다. 
제공된 논문 텍스트를 읽고 핵심 챕터, 핵심 노드, 그리고 노드 간의 유향 논리 관계(Edge)를 추출하세요.
- 모든 노드는 원문의 발췌 문장(originalText)과 페이지 번호(pageNum)를 정확히 포함해야 합니다.
- 고립된(연결선이 없는) 노드가 없도록 최소 1개 이상의 연결을 만드세요.`,
    });

    const prompt = `다음 학술 논문 텍스트를 분석하여 지식 그래프 JSON을 생성하세요:\n\n${paperText}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return JSON.parse(responseText) as RawGraphData;
}