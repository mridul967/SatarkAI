import sqlite3
import json
from datetime import datetime
from typing import List, Optional

DB_PATH = "/app/data/satarkai.db"

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
        conn.commit()
        conn.close()

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
                prediction.get("processing_time_ms", 0),
                json.dumps(prediction.get("graph_signals", []))
            ))
            conn.commit()
        except Exception as e:
            print(f"DB save error: {e}")
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
        total = conn.execute("SELECT COUNT(*) as c FROM transactions").fetchone()["c"]
        flagged = conn.execute("SELECT COUNT(*) as c FROM transactions WHERE risk_level IN ('HIGH','CRITICAL')").fetchone()["c"]
        avg_score = conn.execute("SELECT AVG(fraud_score) as a FROM transactions").fetchone()["a"] or 0
        conn.close()
        return {
            "total_transactions": total,
            "flagged_transactions": flagged,
            "average_fraud_score": round(avg_score, 4),
            "flag_rate": round(flagged / max(total, 1) * 100, 2)
        }

db_service = DatabaseService()
