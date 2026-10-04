# ============================================================================
# EduTrack AI v2 - analytics-service/app/reports/jobs.py
# Gerenciamento assíncrono de jobs de geração de PDF em segundo plano
# ============================================================================

import os
import time
import uuid
import threading
from typing import Dict, Any, Optional
from datetime import datetime

class ReportJobManager:
    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()
        self.active_count = 0
        self.max_concurrent = 2
        self.temp_dir = os.path.join(os.path.dirname(__file__), "temp")
        os.makedirs(self.temp_dir, exist_ok=True)

    def create_job(self, user_id: int, week_start: Optional[str] = None) -> str:
        with self.lock:
            # Verificar se usuário já tem job em andamento
            for j_id, j in self.jobs.items():
                if j["user_id"] == user_id and j["status"] in ("na_fila", "gerando"):
                    return j_id

            active_count = sum(1 for j in self.jobs.values() if j["status"] in ("na_fila", "gerando"))
            if active_count >= self.max_concurrent:
                raise RuntimeError("MAX_CONCURRENT_EXCEEDED")

            job_id = str(uuid.uuid4())[:8]
            self.jobs[job_id] = {
                "id_job": job_id,
                "user_id": user_id,
                "week_start": week_start,
                "status": "na_fila",
                "created_at": time.time(),
                "file_path": None,
                "error": None
            }
            return job_id

    def get_job(self, job_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        with self.lock:
            job = self.jobs.get(job_id)
            if not job or job["user_id"] != user_id:
                return None
            return {
                "id_job": job["id_job"],
                "status": job["status"],
                "error": job.get("error"),
                "mensagem_erro": job.get("error")
            }

    def get_job_file(self, job_id: str, user_id: int) -> Optional[str]:
        with self.lock:
            job = self.jobs.get(job_id)
            if not job or job["user_id"] != user_id:
                return None
            if job["status"] == "pronto" and job.get("file_path") and os.path.exists(job["file_path"]):
                return job["file_path"]
            return None

    def update_job_status(self, job_id: str, status: str, file_path: str = None, error: str = None):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = status
                if file_path:
                    self.jobs[job_id]["file_path"] = file_path
                if error:
                    self.jobs[job_id]["error"] = error

    def cleanup_old_jobs(self):
        """Remove arquivos temporários e jobs mais antigos que 30 minutos"""
        now = time.time()
        with self.lock:
            to_del = []
            for j_id, j in self.jobs.items():
                if now - j["created_at"] > 1800:
                    to_del.append(j_id)
                    if j.get("file_path") and os.path.exists(j["file_path"]):
                        try:
                            os.remove(j["file_path"])
                        except Exception:
                            pass
            for j_id in to_del:
                del self.jobs[j_id]

job_manager = ReportJobManager()
