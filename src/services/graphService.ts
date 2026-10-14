import {
    RawGraphData,
    ProcessedNode,
    TreeNode,
    ChapterProcessed,
    FinalGraphResponse,
} from "../types/graph";

// 최대 계층 링 개수 제한 (UI 가독성 유지용)
const MAX_RING_DEPTH = 3;

export function processGraphHierarchy(docId: string, rawData: RawGraphData): FinalGraphResponse {
    const { chapters, nodes, edges } = rawData;

    const processedChapters: ChapterProcessed[] = chapters.map((chapter) => {
        // 1. 해당 챕터에 속한 노드 및 엣지 필터링
        const chapterNodes = nodes.filter((n) => n.chapter_id === chapter.id);
        const chapterNodeIds = new Set(chapterNodes.map((n) => n.id));
        const chapterEdges = edges.filter(
            (e) => chapterNodeIds.has(e.source) && chapterNodeIds.has(e.target)
        );

        // 2. 인접 리스트(방향) 및 진입차수(in-degree) 계산
        const adjList = new Map<string, string[]>();
        const inDegreeMap = new Map<string, number>();
        const parentCandidates = new Map<string, string[]>(); // target -> [source1, source2...]

        chapterNodes.forEach((node) => {
            adjList.set(node.id, []);
            inDegreeMap.set(node.id, 0);
            parentCandidates.set(node.id, []);
        });

        chapterEdges.forEach((edge) => {
            adjList.get(edge.source)?.push(edge.target);
            inDegreeMap.set(edge.target, (inDegreeMap.get(edge.target) || 0) + 1);
            parentCandidates.get(edge.target)?.push(edge.source);
        });

        // 3. BFS 시작 노드(Root) 선정: 진입차수가 0인 노드들
        let rootNodes = chapterNodes.filter((n) => inDegreeMap.get(n.id) === 0);
        // 만약 순환 구조 등으로 진입차수 0이 없다면 페이지 번호가 가장 앞선 노드를 루트로 삼음
        if (rootNodes.length === 0 && chapterNodes.length > 0) {
            rootNodes = [chapterNodes.sort((a, b) => a.pageNum - b.pageNum)[0]];
        }

        // 4. BFS (너비 우선 탐색)로 노드별 Depth 계산
        const depthMap = new Map<string, number>();
        const visited = new Set<string>();
        const queue: { id: string; depth: number }[] = [];

        rootNodes.forEach((root) => {
            queue.push({ id: root.id, depth: 1 }); // 링 1부터 시작
            visited.add(root.id);
            depthMap.set(root.id, 1);
        });

        while (queue.length > 0) {
            const current = queue.shift()!;
            const neighbors = adjList.get(current.id) || [];

            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    const nextDepth = current.depth + 1;
                    depthMap.set(neighborId, nextDepth);
                    queue.push({ id: neighborId, depth: nextDepth });
                }
            }
        }

        // 미방문 고립 노드가 있다면 기본 depth 1 부여
        chapterNodes.forEach((node) => {
            if (!depthMap.has(node.id)) {
                depthMap.set(node.id, 1);
            }
        });

        // 5. 얽힌 노드(다중 부모) 대표 부모 선정 & ProcessedNode 조립
        const processedNodes: ProcessedNode[] = chapterNodes.map((node) => {
            const calculatedDepth = depthMap.get(node.id) || 1;
            // MAX_RING_DEPTH(3)를 초과하는 깊이는 3으로 클램핑
            const finalDepth = Math.min(calculatedDepth, MAX_RING_DEPTH);
            const inDeg = inDegreeMap.get(node.id) || 0;
            const candidates = parentCandidates.get(node.id) || [];

            let mainParentId: string | undefined = undefined;
            const subRelations: string[] = [];

            if (candidates.length === 1) {
                mainParentId = candidates[0];
            } else if (candidates.length > 1) {
                // 부모 후보들 중 depth가 가장 낮고, 페이지 번호가 앞선 노드를 대표 부모로 선정
                candidates.sort((a, b) => {
                    const depthDiff = (depthMap.get(a) || 1) - (depthMap.get(b) || 1);
                    if (depthDiff !== 0) return depthDiff;
                    const nodeA = chapterNodes.find((n) => n.id === a);
                    const nodeB = chapterNodes.find((n) => n.id === b);
                    return (nodeA?.pageNum || 0) - (nodeB?.pageNum || 0);
                });
                mainParentId = candidates[0];
                subRelations.push(...candidates.slice(1));
            }

            return {
                ...node,
                depth: finalDepth,
                inDegree: inDeg,
                mainParentId,
                subRelations,
            };
        });

        // 해당 챕터의 최대 계층링 개수 산출 (최대 3개로 제한)
        const maxCalculatedDepth = Math.max(...processedNodes.map((n) => n.depth), 1);
        const totalRings = Math.min(maxCalculatedDepth, MAX_RING_DEPTH);

        // 6. 트리 뷰용 단일 계층 트리 구조(TreeNode[]) 생성
        const nodeLookup = new Map<string, TreeNode>();
        processedNodes.forEach((pn) => {
            nodeLookup.set(pn.id, {
                nodeId: pn.id,
                title: pn.title,
                pageNum: pn.pageNum,
                originalText: pn.originalText,
                depth: pn.depth,
                relatedNodes: pn.subRelations,
                children: [],
            });
        });

        const treeRoots: TreeNode[] = [];
        processedNodes.forEach((pn) => {
            const treeNode = nodeLookup.get(pn.id)!;
            if (pn.mainParentId && nodeLookup.has(pn.mainParentId)) {
                // 대표 부모의 자식 배열에 추가
                nodeLookup.get(pn.mainParentId)!.children.push(treeNode);
            } else {
                // 부모가 없으면 최상위 루트 노드로 배치
                treeRoots.push(treeNode);
            }
        });

        // 읽기 편하도록 본문 등장 순서(pageNum)로 정렬
        const sortTreeRecursively = (items: TreeNode[]) => {
            items.sort((a, b) => a.pageNum - b.pageNum);
            items.forEach((child) => sortTreeRecursively(child.children));
        };
        sortTreeRecursively(treeRoots);

        return {
            chapterId: chapter.id,
            title: chapter.title,
            order: chapter.order,
            totalRings,
            nodes: processedNodes,
            tree: treeRoots,
        };
    });

    return {
        docId,
        chapters: processedChapters,
        edges,
    };
}