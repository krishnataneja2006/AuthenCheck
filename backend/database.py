
import sqlite3
from pathlib import Path

# Store the database inside the backend folder
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "authencheck.db"


def get_connection():
    """Create and return a SQLite database connection."""
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    """Create the credentials table if it does not already exist."""
    connection = get_connection()

    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                credential_id TEXT NOT NULL UNIQUE,
                filename TEXT NOT NULL,
                student_name TEXT,
                issuer TEXT,
                course TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
                document_type TEXT,
                extracted_text TEXT,
                manual_review_required INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        connection.commit()
    finally:
        connection.close()


def get_credential_by_id(credential_id: str):
    """Find a saved credential using its credential ID."""
    connection = get_connection()

    try:
        record = connection.execute(
            """
            SELECT *
            FROM credentials
            WHERE credential_id = ?
            """,
            (credential_id,),
        ).fetchone()

        return dict(record) if record else None
    finally:
        connection.close()


if __name__ == "__main__":
    initialize_database()
    print("AuthenCheck database initialized successfully.")
    print(f"Database location: {DATABASE_PATH}")
