// 1. Gemini가 뱉어내는 원본 그래프 데이터 규격
export interface ChapterRaw {
    id: string;
    title: string;
    order: number;
}

export interface NodeRaw {
    id: string;
    chapter_id: string;
    title: string;
    pageNum: number;
    originalText: string;
}

export interface EdgeRaw {
    source: string;
    target: string;
    relation: "solves" | "proves" | "extends" | "contains";
}

export interface RawGraphData {
    chapters: ChapterRaw[];
    nodes: NodeRaw[];
    edges: EdgeRaw[];
}

// 2. 프론트엔드로 전달할 계산 완료된 데이터 규격
export interface ProcessedNode extends NodeRaw {
    depth: number; // 링 레벨 (1, 2, 3...)
    inDegree: number; // 자신을 향하는 화살표 개수
    mainParentId?: string; // 대표 부모 노드 ID
    subRelations: string[]; // 다중 연결된 서브 노드 ID 목록
}

export interface TreeNode {
    nodeId: string;
    title: string;
    pageNum: number;
    originalText: string;
    depth: number;
    relatedNodes: string[];
    children: TreeNode[];
}

export interface ChapterProcessed {
    chapterId: string;
    title: string;
    order: number;
    totalRings: number; // 해당 챕터에 필요한 계층링 수 (최대 3~4개)
    nodes: ProcessedNode[]; // 행성 뷰용 노드 목록
    tree: TreeNode[]; // 집중 모드 트리 뷰용 계층 데이터
}

export interface FinalGraphResponse {
    docId: string;
    chapters: ChapterProcessed[];
    edges: EdgeRaw[];
}