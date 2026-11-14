import sqlite3
import json
import os
from datetime import datetime
from typing import List, Optional, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "syncore_events.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Table for persistent crash and anomaly events
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT DEFAULT 'normal',
        message TEXT NOT NULL,
        linear_accel REAL,
        gyro REAL,
        roll REAL,
        pitch REAL,
        alarm INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL,
        raw_json TEXT
    );
    """)

    # Table for device configuration & thresholds
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS device_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    conn.commit()

    # Pre-populate default thresholds if not present
    cursor.execute("SELECT count(*) as count FROM device_settings WHERE key = 'thresholds'")
    if cursor.fetchone()["count"] == 0:
        default_thresholds = {
            "linearAccelThreshold": 2.5,
            "tiltThreshold": 45.0,
            "gyroThreshold": 200.0
        }
        cursor.execute(
            "INSERT INTO device_settings (key, value, updated_at) VALUES (?, ?, ?)",
            ("thresholds", json.dumps(default_thresholds), datetime.utcnow().isoformat())
        )
        conn.commit()

    conn.close()

def insert_event(evt: Dict[str, Any]) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    event_id = evt.get("id") or f"EVT-{int(datetime.utcnow().timestamp() * 1000) % 10000:04d}"
    timestamp = evt.get("timestamp") or datetime.utcnow().isoformat()
    
    cursor.execute("""
    INSERT OR REPLACE INTO events (
        id, type, category, severity, message, linear_accel, gyro, roll, pitch, alarm, timestamp, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id,
        evt.get("type", "UNKNOWN"),
        evt.get("category", "General"),
        evt.get("severity", "normal"),
        evt.get("message", ""),
        evt.get("linear_accel"),
        evt.get("gyro"),
        evt.get("roll"),
        evt.get("pitch"),
        1 if evt.get("alarm") else 0,
        timestamp,
        json.dumps(evt)
    ))
    
    conn.commit()
    conn.close()
    return event_id

def get_events(limit: int = 200, category: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if category and category != "ALL":
        cursor.execute("SELECT * FROM events WHERE category = ? ORDER BY timestamp DESC LIMIT ?", (category, limit))
    else:
        cursor.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,))
        
    rows = cursor.fetchall()
    events = []
    for r in rows:
        events.append({
            "id": r["id"],
            "type": r["type"],
            "category": r["category"],
            "severity": r["severity"],
            "message": r["message"],
            "linear_accel": r["linear_accel"],
            "gyro": r["gyro"],
            "roll": r["roll"],
            "pitch": r["pitch"],
            "alarm": bool(r["alarm"]),
            "timestamp": r["timestamp"]
        })
    conn.close()
    return events

def clear_events() -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events")
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted

def get_setting(key: str) -> Optional[Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM device_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["value"])
        except:
            return row["value"]
    return None

def set_setting(key: str, value: Any):
    conn = get_db_connection()
    cursor = conn.cursor()
    val_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
    cursor.execute(
        "INSERT OR REPLACE INTO device_settings (key, value, updated_at) VALUES (?, ?, ?)",
        (key, val_str, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
