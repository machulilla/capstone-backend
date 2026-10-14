import Database from "better-sqlite3";
import path from "path";
import { RawGraphData } from "../types/graph";

// 프로젝트 루트에 context_tracer.db 파일 생성
const dbPath = path.resolve(__dirname, "../../context_tracer.db");
const db = new Database(dbPath);

// 1. 테이블 초기화 (최초 1회 실행)
export function initDatabase() {
    // 문서 테이블
    db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      doc_id TEXT PRIMARY KEY,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // 노드 테이블
    db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      node_id TEXT PRIMARY KEY,
      doc_id TEXT,
      chapter_id TEXT,
      title TEXT,
      page_num INTEGER,
      original_text TEXT,
      FOREIGN KEY(doc_id) REFERENCES documents(doc_id)
    );
  `);

    // 엣지 테이블
    db.exec(`
    CREATE TABLE IF NOT EXISTS edges (
      edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id TEXT,
      source_id TEXT,
      target_id TEXT,
      relation_type TEXT,
      FOREIGN KEY(doc_id) REFERENCES documents(doc_id)
    );
  `);

    console.log("📦 SQLite 데이터베이스 초기화 완료");
}

// 2. LLM이 추출한 그래프 데이터 일괄 저장 함수
export function saveGraphToDb(docId: string, graphData: RawGraphData) {
    const insertDoc = db.prepare(`
    INSERT OR REPLACE INTO documents (doc_id, title) VALUES (?, ?)
  `);

    const insertNode = db.prepare(`
    INSERT OR REPLACE INTO nodes (node_id, doc_id, chapter_id, title, page_num, original_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    const insertEdge = db.prepare(`
    INSERT INTO edges (doc_id, source_id, target_id, relation_type)
    VALUES (?, ?, ?, ?)
  `);

    // 트랜잭션으로 한 번에 안전하게 저장
    const transaction = db.transaction(() => {
        insertDoc.run(docId, "Uploaded Academic Paper");

        for (const node of graphData.nodes) {
            insertNode.run(
                node.id,
                docId,
                node.chapter_id,
                node.title,
                node.pageNum,
                node.originalText
            );
        }

        for (const edge of graphData.edges) {
            insertEdge.run(docId, edge.source, edge.target, edge.relation);
        }
    });

    transaction();
    console.log(`💾 DB 저장 완료: 문서 [${docId}] (노드 ${graphData.nodes.length}개, 엣지 ${graphData.edges.length}개)`);
}

export default db;