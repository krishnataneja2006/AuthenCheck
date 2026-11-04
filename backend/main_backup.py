import json
import os
from google import genai
import re
import uuid
import mimetypes
from pathlib import Path
from datetime import datetime, timezone

import fitz
import pytesseract
from PIL import Image, ImageOps
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import (
    initialize_database,
    get_connection,
    get_credential_by_id,
)

# --------------------------------------------------
# Application configuration
# --------------------------------------------------

app = FastAPI(
    title="AuthenCheck API",
    description="Academic credential upload and preliminary review system",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_PDF_PAGES = 100

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

VALID_STATUSES = {
    "PENDING_REVIEW",
    "VERIFIED",
    "REJECTED",
}

initialize_database()


# --------------------------------------------------
# Text processing helpers
# --------------------------------------------------

def normalize_text(text: str) -> str:
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def check_detail(detail: str, extracted_text: str) -> bool:
    if not detail or not detail.strip():
        return False

    normalized_detail = normalize_text(detail)
    normalized_text = normalize_text(extracted_text)

    return bool(normalized_detail) and normalized_detail in normalized_text


def extract_image_text(image_path: Path) -> str:
    with Image.open(image_path) as image:
        image = ImageOps.exif_transpose(image)
        image = image.convert("L")
        return pytesseract.image_to_string(image, lang="eng").strip()


def extract_pdf_text(pdf_path: Path) -> str:
    extracted_pages = []

    with fitz.open(pdf_path) as document:
        if len(document) == 0:
            raise ValueError("The PDF contains no pages.")

        if len(document) > MAX_PDF_PAGES:
            raise ValueError(
                f"The PDF exceeds the maximum of {MAX_PDF_PAGES} pages."
            )

        for page in document:
            page_text = page.get_text("text").strip()

            if len(page_text) < 20:
                pixmap = page.get_pixmap(
                    matrix=fitz.Matrix(2, 2),
                    alpha=False,
                )
                image = Image.frombytes(
                    "RGB",
                    [pixmap.width, pixmap.height],
                    pixmap.samples,
                )
                ocr_text = pytesseract.image_to_string(
                    image,
                    lang="eng",
                ).strip()

                if len(ocr_text) > len(page_text):
                    page_text = ocr_text

            extracted_pages.append(page_text)

    return "\n".join(extracted_pages).strip()


def detect_document_type(text: str) -> tuple[str, str]:
    normalized = normalize_text(text)

    certificate_indicators = [
        "certificate",
        "degree",
        "diploma",
        "has successfully completed",
        "is hereby awarded",
        "certified that",
        "university",
        "graduated",
        "transcript",
        "academic record",
    ]

    presentation_indicators = [
        "presentation",
        "powerpoint",
        "agenda",
        "slide",
        "thank you for your attention",
    ]

    certificate_matches = [
        item for item in certificate_indicators
        if item in normalized
    ]
    presentation_matches = [
        item for item in presentation_indicators
        if item in normalized
    ]

    if len(certificate_matches) >= 2:
        return (
            "LIKELY_CERTIFICATE",
            "Multiple certificate-related text indicators were detected.",
        )

    if len(presentation_matches) >= 2 and not certificate_matches:
        return (
            "LIKELY_PRESENTATION",
            "Multiple presentation-related text indicators were detected.",
        )

    return (
        "UNKNOWN",
        "The extracted text is insufficient for a confident document classification.",
    )


def detect_dates(text: str) -> list[str]:
    patterns = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        r"\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b",
        r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b",
    ]

    found = []

    for pattern in patterns:
        found.extend(
            re.findall(pattern, text, flags=re.IGNORECASE)
        )

    return list(dict.fromkeys(found))


def detect_credential_identifiers(text: str) -> list[str]:
    patterns = [
        r"\b(?:certificate|credential|registration|serial)\s*(?:no|number|id|#)?\s*[:#-]?\s*[A-Z0-9][A-Z0-9/-]{3,}\b",
        r"\b(?:ID|Ref)\s*[:#-]\s*[A-Z0-9][A-Z0-9/-]{3,}\b",
    ]

    found = []

    for pattern in patterns:
        found.extend(
            re.findall(pattern, text, flags=re.IGNORECASE)
        )

    return list(dict.fromkeys(found))


def safe_credential_record(record: dict) -> dict:
    """Return credential fields without exposing extracted OCR text."""
    return {
        "credential_id": record.get("credential_id"),
        "filename": record.get("filename"),
        "student_name": record.get("student_name"),
        "issuer": record.get("issuer"),
        "course": record.get("course"),
        "status": record.get("status"),
        "document_type": record.get("document_type"),
        "manual_review_required": bool(
            record.get("manual_review_required", 1)
        ),
        "created_at": record.get("created_at"),
    }


# --------------------------------------------------
# Basic endpoints
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Welcome to AuthenCheck API",
        "version": "1.5.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# --------------------------------------------------
# Dashboard statistics
# --------------------------------------------------

@app.get("/api/dashboard/stats")
def dashboard_stats():
    connection = get_connection()

    try:
        row = connection.execute(
            """
            SELECT
                COUNT(*) AS total_records,
                SUM(CASE WHEN status = 'PENDING_REVIEW' THEN 1 ELSE 0 END)
                    AS pending_review,
                SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END)
                    AS verified,
                SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END)
                    AS rejected
            FROM credentials
            """
        ).fetchone()

        return {
            "total_records": row["total_records"] or 0,
            "pending_review": row["pending_review"] or 0,
            "verified": row["verified"] or 0,
            "rejected": row["rejected"] or 0,
        }
    finally:
        connection.close()


# --------------------------------------------------
# List and search credentials
# --------------------------------------------------

@app.get("/api/credentials")
def list_credentials(
    search: str = Query(default="", max_length=200),
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    if status is not None:
        status = status.strip().upper()

        if status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid status filter.",
            )

    connection = get_connection()

    try:
        conditions = []
        parameters = []

        if search.strip():
            pattern = f"%{search.strip()}%"
            conditions.append(
                """
                (
                    credential_id LIKE ?
                    OR filename LIKE ?
                    OR student_name LIKE ?
                    OR issuer LIKE ?
                    OR course LIKE ?
                )
                """
            )
            parameters.extend([pattern] * 5)

        if status:
            conditions.append("status = ?")
            parameters.append(status)

        where_clause = (
            "WHERE " + " AND ".join(conditions)
            if conditions
            else ""
        )

        total = connection.execute(
            f"SELECT COUNT(*) FROM credentials {where_clause}",
            parameters,
        ).fetchone()[0]

        rows = connection.execute(
            f"""
            SELECT *
            FROM credentials
            {where_clause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            parameters + [limit, offset],
        ).fetchall()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "credentials": [
                safe_credential_record(dict(row))
                for row in rows
            ],
        }
    finally:
        connection.close()


# --------------------------------------------------
# Get one credential
# --------------------------------------------------

@app.get("/api/credentials/{credential_id}")
def get_credential(credential_id: str):
    record = get_credential_by_id(credential_id)

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Credential not found.",
        )

    return safe_credential_record(record)


# --------------------------------------------------
# NEW: Update credential status
# --------------------------------------------------

@app.put("/api/credentials/{credential_id}/status")
def update_credential_status(
    credential_id: str,
    status: str = Form(...),
):
    new_status = status.strip().upper()

    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Choose PENDING_REVIEW, "
                "VERIFIED, or REJECTED."
            ),
        )

    connection = get_connection()

    try:
        existing = connection.execute(
            """
            SELECT credential_id
            FROM credentials
            WHERE credential_id = ?
            """,
            (credential_id,),
        ).fetchone()

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Credential not found.",
            )

        connection.execute(
            """
            UPDATE credentials
            SET status = ?
            WHERE credential_id = ?
            """,
            (new_status, credential_id),
        )
        connection.commit()

        updated = connection.execute(
            """
            SELECT *
            FROM credentials
            WHERE credential_id = ?
            """,
            (credential_id,),
        ).fetchone()

        return {
            "message": "Credential status updated successfully.",
            "credential": safe_credential_record(dict(updated)),
        }

    except HTTPException:
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update credential status.",
        ) from exc
    finally:
        connection.close()


# --------------------------------------------------
# Upload and analyze credential
# --------------------------------------------------

@app.post("/api/credentials/upload")
async def upload_credential(
    file: UploadFile = File(...),
    student_name: str = Form(...),
    issuer: str = Form(...),
    course: str = Form(...),
):
    student_name = student_name.strip()
    issuer = issuer.strip()
    course = course.strip()

    if not student_name or not issuer or not course:
        raise HTTPException(
            status_code=400,
            detail="Student name, issuer, and course are required.",
        )

    original_filename = Path(file.filename or "").name
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, PNG, JPG, and JPEG files are supported.",
        )

    content_type = (file.content_type or "").lower()

    allowed_mime_types = {
        ".pdf": {"application/pdf", "application/octet-stream"},
        ".png": {"image/png", "application/octet-stream"},
        ".jpg": {"image/jpeg", "image/jpg", "application/octet-stream"},
        ".jpeg": {"image/jpeg", "image/jpg", "application/octet-stream"},
    }

    if content_type not in allowed_mime_types[extension]:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file type does not match the file extension.",
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="The maximum upload size is 10 MB.",
        )

    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="The file does not appear to be a valid PDF.",
        )

    if extension in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(
            status_code=400,
            detail="The file does not appear to be a valid JPEG image.",
        )

    if extension == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(
            status_code=400,
            detail="The file does not appear to be a valid PNG image.",
        )

    saved_filename = f"{uuid.uuid4().hex}{extension}"
    saved_path = UPLOAD_DIR / saved_filename

    try:
        saved_path.write_bytes(content)

        if extension == ".pdf":
            extracted_text = extract_pdf_text(saved_path)
        else:
            extracted_text = extract_image_text(saved_path)

    except (fitz.FileDataError, OSError, ValueError) as exc:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail="Could not read the uploaded document.",
        ) from exc
    except pytesseract.TesseractError as exc:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="OCR processing failed. Check the Tesseract installation.",
        ) from exc
    except Exception as exc:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing the file.",
        ) from exc

    document_type, document_type_reason = detect_document_type(
        extracted_text
    )

    detail_checks = {
        "student_name": check_detail(student_name, extracted_text),
        "issuer": check_detail(issuer, extracted_text),
        "course": check_detail(course, extracted_text),
    }

    missing_details = [
        name
        for name, found in detail_checks.items()
        if not found
    ]

    detected_dates = detect_dates(extracted_text)
    detected_credential_ids = detect_credential_identifiers(
        extracted_text
    )

    manual_review_required = (
        not extracted_text.strip()
        or document_type != "LIKELY_CERTIFICATE"
        or bool(missing_details)
    )

    credential_id = str(uuid.uuid4())

    connection = get_connection()

    try:
        connection.execute(
            """
            INSERT INTO credentials (
                credential_id,
                filename,
                student_name,
                issuer,
                course,
                status,
                document_type,
                extracted_text,
                manual_review_required
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                credential_id,
                original_filename,
                student_name,
                issuer,
                course,
                "PENDING_REVIEW",
                document_type,
                extracted_text,
                int(manual_review_required),
            ),
        )
        connection.commit()
    except Exception as exc:
        connection.rollback()
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="Could not save the credential record.",
        ) from exc
    finally:
        connection.close()

    return {
        "message": "Credential uploaded and processed successfully.",
        "credential_id": credential_id,
        "filename": original_filename,
        "student_name": student_name,
        "issuer": issuer,
        "course": course,
        "status": "PENDING_REVIEW",
        "extracted_text": extracted_text,
        "text_extracted": bool(extracted_text.strip()),
        "document_type": document_type,
        "document_type_reason": document_type_reason,
        "detail_checks": detail_checks,
        "missing_details": missing_details,
        "additional_checks": {
            "dates_detected": bool(detected_dates),
            "credential_identifiers_detected": bool(
                detected_credential_ids
            ),
        },
        "detected_dates": detected_dates,
        "detected_credential_ids": detected_credential_ids,
        "manual_review_required": manual_review_required,
        "note": (
            "These are preliminary automated checks only. "
            "They do not prove that the credential is authentic. "
            "Independent issuer confirmation may be required."
        ),
    }
