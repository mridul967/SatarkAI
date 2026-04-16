import sqlite3
import json
import os
from datetime import datetime
from typing import List, Optional

DB_PATH = "/app/data/satarkai.db"
COMPLIANCE_PDF_DIR = "/app/data/compliance_reports"

class DatabaseService:
    def __init__(self):
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT UNIQUE,
                user_id TEXT,
                amount REAL,
                merchant_id TEXT,
                device_id TEXT,
                ip_address TEXT,
                timestamp TEXT,
                location TEXT,
                merchant_category TEXT,
                fraud_score REAL,
                risk_level TEXT,
                explanation TEXT,
                model_used TEXT,
                processing_time_ms REAL,
                graph_signals TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_comparisons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT,
                provider TEXT,
                fraud_score REAL,
                risk_level TEXT,
                explanation TEXT,
                processing_time_ms REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_aggregates (
                user_id TEXT PRIMARY KEY,
                avg_amount REAL,
                transaction_count INTEGER,
                device_diversity_count INTEGER,
                last_update TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compliance_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT UNIQUE,
                user_id TEXT,
                amount REAL,
                fraud_score REAL,
                risk_level TEXT,
                status TEXT DEFAULT 'PENDING_REVIEW',
                institution_type TEXT DEFAULT 'NBFC',
                llm_explanation TEXT,
                pdf_path TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
        
        # Ensure PDF storage directory exists
        os.makedirs(COMPLIANCE_PDF_DIR, exist_ok=True)

    def save_transaction(self, txn_data: dict, prediction: dict):
        conn = self._get_conn()
        try:
            conn.execute("""
                INSERT OR REPLACE INTO transactions 
                (transaction_id, user_id, amount, merchant_id, device_id, ip_address,
                 timestamp, location, merchant_category, fraud_score, risk_level,
                 explanation, model_used, processing_time_ms, graph_signals)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                txn_data.get("transaction_id"),
                txn_data.get("user_id"),
                txn_data.get("amount"),
                txn_data.get("merchant_id"),
                txn_data.get("device_id"),
                txn_data.get("ip_address"),
                txn_data.get("timestamp"),
                txn_data.get("location"),
                txn_data.get("merchant_category"),
                prediction.get("fraud_score"),
                prediction.get("risk_level"),
                prediction.get("reason", prediction.get("explanation", "")),
                prediction.get("model_used", "ensemble"),
                prediction.get("processing_time_ms", prediction.get("latency_ms", 0)),
                json.dumps(prediction.get("graph_signals", []))
            ))
            conn.commit()
        except Exception as e:
            print(f"DB save error: {e}")
    def update_user_aggregate(self, txn_data: dict):
        conn = self._get_conn()
        try:
            # 1. Fetch current aggregates
            row = conn.execute("SELECT * FROM user_aggregates WHERE user_id = ?", (txn_data["user_id"],)).fetchone()
            
            if row:
                old_avg = row["avg_amount"]
                count = row["transaction_count"] + 1
                new_avg = old_avg + (txn_data["amount"] - old_avg) / count
                
                # Update (simulating diversity count as a fixed increment for mock)
                conn.execute("""
                    UPDATE user_aggregates 
                    SET avg_amount = ?, transaction_count = ?, last_update = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                """, (new_avg, count, txn_data["user_id"]))
            else:
                conn.execute("""
                    INSERT INTO user_aggregates (user_id, avg_amount, transaction_count, device_diversity_count)
                    VALUES (?, ?, 1, 1)
                """, (txn_data["user_id"], txn_data["amount"]))
            conn.commit()
        except Exception as e:
            print(f"DB aggregate update error: {e}")
        finally:
            conn.close()

    def save_comparison(self, transaction_id: str, results: list):
        conn = self._get_conn()
        try:
            for r in results:
                conn.execute("""
                    INSERT INTO model_comparisons
                    (transaction_id, provider, fraud_score, risk_level, explanation, processing_time_ms)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    transaction_id,
                    r.get("model_used"),
                    r.get("fraud_score"),
                    r.get("risk_level"),
                    r.get("explanation"),
                    r.get("processing_time_ms", 0)
                ))
            conn.commit()
        except Exception as e:
            print(f"DB comparison save error: {e}")
        finally:
            conn.close()

    def get_recent_transactions(self, limit: int = 50, start_date: Optional[str] = None, end_date: Optional[str] = None) -> list:
        conn = self._get_conn()
        query = "SELECT * FROM transactions"
        params = []
        
        conditions = []
        if start_date:
            conditions.append("created_at >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("created_at <= ?")
            params.append(end_date)
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        rows = conn.execute(query, params).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_comparisons_for_txn(self, transaction_id: str) -> list:
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT * FROM model_comparisons WHERE transaction_id = ? ORDER BY provider",
            (transaction_id,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_stats(self) -> dict:
        conn = self._get_conn()
        
        # Total keeps counting forever for scale
        total = conn.execute("SELECT COUNT(*) as c FROM transactions").fetchone()["c"]
        
        # Flagged count is ALL-TIME so detected anomalies never vanish from the dashboard
        flagged = conn.execute("SELECT COUNT(*) as c FROM transactions WHERE risk_level IN ('HIGH','CRITICAL')").fetchone()["c"]
        
        # Averages and flag rates use a rolling window for model health monitoring
        recent_window = 500
        
        avg_score = conn.execute(f"SELECT AVG(fraud_score) as a FROM (SELECT fraud_score FROM transactions ORDER BY created_at DESC LIMIT {recent_window})").fetchone()["a"] or 0
        
        # Flag rate based on rolling window (model health metric)
        recent_flagged = conn.execute(f"SELECT COUNT(*) as c FROM (SELECT risk_level FROM transactions ORDER BY created_at DESC LIMIT {recent_window}) WHERE risk_level IN ('HIGH','CRITICAL')").fetchone()["c"]
        
        conn.close()
        
        window_size = min(total, recent_window)
        return {
            "total_transactions": total,
            "flagged_transactions": flagged,
            "average_fraud_score": round(avg_score, 4),
            "flag_rate": round(recent_flagged / max(window_size, 1) * 100, 2)
        }

    # ── Compliance Report Methods ──────────────────────────
    def save_compliance_report(self, transaction_id: str, user_id: str, amount: float,
                                fraud_score: float, risk_level: str, institution_type: str,
                                llm_explanation: str, pdf_bytes: bytes) -> str:
        """Save a compliance report: metadata to DB, PDF to disk. Returns the pdf path."""
        pdf_filename = f"FMR1_DRAFT_{transaction_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        pdf_path = os.path.join(COMPLIANCE_PDF_DIR, pdf_filename)
        
        # Write PDF to disk
        with open(pdf_path, 'wb') as f:
            f.write(pdf_bytes)
        
        conn = self._get_conn()
        try:
            conn.execute("""
                INSERT OR REPLACE INTO compliance_reports
                (transaction_id, user_id, amount, fraud_score, risk_level, status,
                 institution_type, llm_explanation, pdf_path)
                VALUES (?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?, ?)
            """, (
                transaction_id, user_id, amount, fraud_score, risk_level,
                institution_type, llm_explanation, pdf_path
            ))
            conn.commit()
        except Exception as e:
            print(f"DB compliance save error: {e}")
        finally:
            conn.close()
        return pdf_path

    def get_compliance_reports(self, limit: int = 100) -> list:
        """Return all compliance reports (newest first)."""
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT * FROM compliance_reports ORDER BY created_at DESC LIMIT ?",
            (limit,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_compliance_report(self, transaction_id: str) -> Optional[dict]:
        """Get a single compliance report by transaction_id."""
        conn = self._get_conn()
        row = conn.execute(
            "SELECT * FROM compliance_reports WHERE transaction_id = ?",
            (transaction_id,)
        ).fetchone()
        conn.close()
        return dict(row) if row else None

    def get_compliance_stats(self) -> dict:
        """Get compliance statistics."""
        conn = self._get_conn()
        total = conn.execute("SELECT COUNT(*) as c FROM compliance_reports").fetchone()["c"]
        pending = conn.execute("SELECT COUNT(*) as c FROM compliance_reports WHERE status = 'PENDING_REVIEW'").fetchone()["c"]
        conn.close()
        return {
            "total_reports": total,
            "pending_review": pending,
        }

    def update_compliance_status(self, transaction_id: str, status: str):
        """Update the status of a compliance report."""
        conn = self._get_conn()
        try:
            conn.execute(
                "UPDATE compliance_reports SET status = ? WHERE transaction_id = ?",
                (status, transaction_id)
            )
            conn.commit()
        except Exception as e:
            print(f"DB compliance status update error: {e}")
        finally:
            conn.close()

db_service = DatabaseService()
