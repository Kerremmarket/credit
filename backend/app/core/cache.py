"""Caching utilities for expensive computations."""
import hashlib
import json
import joblib
import time
from pathlib import Path
from typing import Any, Optional, Dict, List
import logging

from .config import CACHE_DIR, CACHE_ENABLED, CACHE_TTL

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages caching of expensive computations."""
    
    def __init__(self):
        self.cache_dir = CACHE_DIR
        self.enabled = CACHE_ENABLED
        
    def _get_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate a unique cache key from parameters."""
        # Sort kwargs for consistent hashing
        sorted_items = sorted(kwargs.items())
        key_str = f"{prefix}_" + "_".join(f"{k}:{v}" for k, v in sorted_items)
        
        # Hash for shorter filenames
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def _get_cache_path(self, cache_key: str, extension: str = "joblib") -> Path:
        """Get the full path for a cache file."""
        return self.cache_dir / f"{cache_key}.{extension}"
    
    def get(self, prefix: str, **kwargs) -> Optional[Any]:
        """Get cached value if it exists and is not expired."""
        if not self.enabled:
            return None
        
        cache_key = self._get_cache_key(prefix, **kwargs)
        cache_path = self._get_cache_path(cache_key)
        meta_path = self._get_cache_path(cache_key, "meta")
        
        if not cache_path.exists() or not meta_path.exists():
            return None
        
        try:
            # Check expiration
            with open(meta_path, 'r') as f:
                meta = json.load(f)
            
            if time.time() - meta['timestamp'] > CACHE_TTL:
                logger.info(f"Cache expired for {prefix}")
                self.invalidate(prefix, **kwargs)
                return None
            
            # Load cached data
            data = joblib.load(cache_path)
            logger.info(f"Cache hit for {prefix}")
            return data
            
        except Exception as e:
            logger.error(f"Error reading cache: {str(e)}")
            return None
    
    def set(self, prefix: str, data: Any, **kwargs):
        """Store data in cache."""
        if not self.enabled:
            return
        
        cache_key = self._get_cache_key(prefix, **kwargs)
        cache_path = self._get_cache_path(cache_key)
        meta_path = self._get_cache_path(cache_key, "meta")
        
        try:
            # Save data
            joblib.dump(data, cache_path)
            
            # Save metadata
            meta = {
                'timestamp': time.time(),
                'prefix': prefix,
                'kwargs': kwargs
            }
            with open(meta_path, 'w') as f:
                json.dump(meta, f)
            
            logger.info(f"Cached data for {prefix}")
            
        except Exception as e:
            logger.error(f"Error writing cache: {str(e)}")
    
    def invalidate(self, prefix: str, **kwargs):
        """Invalidate a specific cache entry."""
        cache_key = self._get_cache_key(prefix, **kwargs)
        cache_path = self._get_cache_path(cache_key)
        meta_path = self._get_cache_path(cache_key, "meta")
        
        for path in [cache_path, meta_path]:
            if path.exists():
                path.unlink()
        
        logger.info(f"Invalidated cache for {prefix}")
    
    def invalidate_prefix(self, prefix: str):
        """Invalidate all cache entries with a given prefix."""
        count = 0
        for meta_file in self.cache_dir.glob("*.meta"):
            try:
                with open(meta_file, 'r') as f:
                    meta = json.load(f)
                
                if meta.get('prefix') == prefix:
                    cache_file = meta_file.with_suffix('.joblib')
                    meta_file.unlink()
                    if cache_file.exists():
                        cache_file.unlink()
                    count += 1
                    
            except Exception as e:
                logger.error(f"Error invalidating cache: {str(e)}")
        
        logger.info(f"Invalidated {count} cache entries for prefix {prefix}")
    
    def clear_all(self):
        """Clear all cache entries."""
        count = 0
        for cache_file in self.cache_dir.glob("*"):
            if cache_file.is_file():
                cache_file.unlink()
                count += 1
        
        logger.info(f"Cleared {count} cache files")


# Global instance
cache_manager = CacheManager()



