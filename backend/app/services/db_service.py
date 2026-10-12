"""
Hybrid Database Service
Provides a unified interface for Cloud Firestore with an automatic robust local JSON/file-backed
fallback storage engine when live Firebase credentials are not yet supplied.
Ensures zero-friction local development, instant testability, and full cloud production readiness.
"""

import os
import json
import threading
from typing import Dict, Any, List, Optional, Tuple

from backend.app.config import config

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False


class LocalStorageEngine:
    """Thread-safe persistent JSON-backed storage mimicking Firestore collections."""

    def __init__(self, storage_dir: str):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self._lock = threading.RLock()

    def _get_collection_path(self, collection_name: str) -> str:
        return os.path.join(self.storage_dir, f"{collection_name}.json")

    def _read_collection(self, collection_name: str) -> Dict[str, Dict[str, Any]]:
        path = self._get_collection_path(collection_name)
        if not os.path.exists(path):
            return {}
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _write_collection(self, collection_name: str, data: Dict[str, Dict[str, Any]]):
        path = self._get_collection_path(collection_name)
        temp_path = path + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        if os.path.exists(path):
            os.replace(temp_path, path)
        else:
            os.rename(temp_path, path)

    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            data = self._read_collection(collection)
            return data.get(doc_id)

    def set(self, collection: str, doc_id: str, document: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            data = self._read_collection(collection)
            data[doc_id] = document
            self._write_collection(collection, data)
            return document

    def update(self, collection: str, doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            data = self._read_collection(collection)
            if doc_id not in data:
                return None
            data[doc_id].update(updates)
            self._write_collection(collection, data)
            return data[doc_id]

    def delete(self, collection: str, doc_id: str) -> bool:
        with self._lock:
            data = self._read_collection(collection)
            if doc_id in data:
                del data[doc_id]
                self._write_collection(collection, data)
                return True
            return False

    def query(self, collection: str, filters: List[Tuple[str, str, Any]]) -> List[Dict[str, Any]]:
        with self._lock:
            data = self._read_collection(collection)
            results = list(data.values())
            for field, op, val in filters:
                if op == "==":
                    results = [d for d in results if d.get(field) == val]
                elif op == "!=":
                    results = [d for d in results if d.get(field) != val]
                elif op == "in":
                    results = [d for d in results if d.get(field) in val]
            return results

    def list_all(self, collection: str) -> List[Dict[str, Any]]:
        with self._lock:
            data = self._read_collection(collection)
            return list(data.values())


class DatabaseService:
    def __init__(self):
        self.firestore_client = None
        self.is_cloud = False
        self.local_engine = LocalStorageEngine(config.LOCAL_DB_DIR)
        self._init_backend()

    def _init_backend(self):
        if not FIREBASE_AVAILABLE:
            print("[DB Service] Firebase SDK not installed or available. Using local persistent storage engine.")
            return

        cred_path = config.FIREBASE_CREDENTIALS_PATH
        if cred_path and os.path.exists(cred_path):
            try:
                if not firebase_admin._apps:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred, {"projectId": config.FIREBASE_PROJECT_ID})
                self.firestore_client = firestore.client()
                self.is_cloud = True
                print(f"[DB Service] Successfully initialized Cloud Firestore with credentials from {cred_path}")
            except Exception as e:
                print(f"[DB Service] Warning: Cloud Firestore init failed ({e}). Falling back to local storage engine.")
        else:
            print("[DB Service] No Firebase credentials path specified. Operating in local persistent storage mode.")

    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        if self.is_cloud and self.firestore_client:
            try:
                doc = self.firestore_client.collection(collection).document(doc_id).get()
                return doc.to_dict() if doc.exists else None
            except Exception as e:
                print(f"[DB Service] Firestore get error: {e}. Checking local engine.")
        return self.local_engine.get(collection, doc_id)

    def set(self, collection: str, doc_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        if self.is_cloud and self.firestore_client:
            try:
                self.firestore_client.collection(collection).document(doc_id).set(data)
            except Exception as e:
                print(f"[DB Service] Firestore set error: {e}. Persisting to local engine.")
        return self.local_engine.set(collection, doc_id, data)

    def update(self, collection: str, doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self.is_cloud and self.firestore_client:
            try:
                self.firestore_client.collection(collection).document(doc_id).update(updates)
            except Exception as e:
                print(f"[DB Service] Firestore update error: {e}. Updating local engine.")
        return self.local_engine.update(collection, doc_id, updates)

    def delete(self, collection: str, doc_id: str) -> bool:
        if self.is_cloud and self.firestore_client:
            try:
                self.firestore_client.collection(collection).document(doc_id).delete()
            except Exception as e:
                print(f"[DB Service] Firestore delete error: {e}.")
        return self.local_engine.delete(collection, doc_id)

    def query(self, collection: str, filters: List[Tuple[str, str, Any]]) -> List[Dict[str, Any]]:
        if self.is_cloud and self.firestore_client:
            try:
                query_ref = self.firestore_client.collection(collection)
                for field, op, val in filters:
                    query_ref = query_ref.where(field, op, val)
                docs = query_ref.stream()
                return [doc.to_dict() for doc in docs]
            except Exception as e:
                print(f"[DB Service] Firestore query error: {e}. Querying local engine.")
        return self.local_engine.query(collection, filters)

    def list_all(self, collection: str) -> List[Dict[str, Any]]:
        if self.is_cloud and self.firestore_client:
            try:
                docs = self.firestore_client.collection(collection).stream()
                return [doc.to_dict() for doc in docs]
            except Exception as e:
                print(f"[DB Service] Firestore list error: {e}. Listing local engine.")
        return self.local_engine.list_all(collection)


db = DatabaseService()
