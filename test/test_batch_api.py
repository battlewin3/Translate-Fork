"""Tests for batch translation API endpoints.

Uses FastAPI's TestClient for full integration tests without a live server.
"""

import io
import json
import zipfile
import unittest

from fastapi.testclient import TestClient

from pdf2zh.api import app, batches, jobs, jobs_lock, MAX_BATCH_FILES

client = TestClient(app)


def _clear_state():
    """Reset in-memory job/batch state between tests."""
    with jobs_lock:
        jobs.clear()
        batches.clear()


def _make_pdf_bytes(name: str = "test.pdf") -> bytes:
    """Minimal valid PDF bytes (just enough to pass file-type checks)."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
        b"trailer<</Size 4/Root 1 0 R>>\n"
        b"startxref\n190\n%%EOF"
    )


class TestBatchEndpoint(unittest.TestCase):

    def setUp(self):
        _clear_state()

    def tearDown(self):
        _clear_state()

    def test_batch_accepts_multiple_files(self):
        """POST /api/translate-batch accepts up to 20 files."""
        files = [
            ("files", (f"doc{i}.pdf", _make_pdf_bytes(f"doc{i}.pdf"), "application/pdf"))
            for i in range(3)
        ]
        resp = client.post("/api/translate-batch", files=files)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("batch_id", data)
        self.assertEqual(len(data["jobs"]), 3)

    def test_batch_rejects_too_many_files(self):
        """More than 20 files → 413."""
        files = [
            ("files", (f"doc{i}.pdf", _make_pdf_bytes(f"doc{i}.pdf"), "application/pdf"))
            for i in range(MAX_BATCH_FILES + 1)
        ]
        resp = client.post("/api/translate-batch", files=files)
        self.assertEqual(resp.status_code, 413)

    def test_batch_status_returns_correct_structure(self):
        """GET /api/translate-batch/{id} returns expected fields."""
        files = [
            ("files", ("a.pdf", _make_pdf_bytes("a.pdf"), "application/pdf")),
            ("files", ("b.pdf", _make_pdf_bytes("b.pdf"), "application/pdf")),
        ]
        resp = client.post("/api/translate-batch", files=files)
        batch_id = resp.json()["batch_id"]

        status_resp = client.get(f"/api/translate-batch/{batch_id}")
        self.assertEqual(status_resp.status_code, 200)
        data = status_resp.json()
        self.assertEqual(data["batch_id"], batch_id)
        self.assertEqual(data["total"], 2)
        self.assertIn("overall_progress", data)
        self.assertIn("jobs", data)

    def test_batch_status_404_for_unknown_batch(self):
        """GET with unknown batch_id → 404."""
        resp = client.get("/api/translate-batch/nonexistent")
        self.assertEqual(resp.status_code, 404)

    def test_batch_download_requires_completed_jobs(self):
        """Download requires at least one completed job."""
        files = [
            ("files", ("a.pdf", _make_pdf_bytes("a.pdf"), "application/pdf")),
        ]
        resp = client.post("/api/translate-batch", files=files)
        batch_id = resp.json()["batch_id"]

        # No jobs completed → 404
        download_resp = client.get(f"/api/translate-batch/{batch_id}/download?file_type=side")
        self.assertEqual(download_resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
