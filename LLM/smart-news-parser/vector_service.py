import os
import logging
from supabase import create_client, Client
from google import genai
from google.genai import types as genai_types

logger = logging.getLogger("smart-news-vector-service")

class VectorService:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        raw_api_key = os.getenv("GEMINI_API_KEY", "").strip().strip("'").strip('"')
        
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase credentials not found. Vector DB va fi dezactivat.")
            self.supabase = None
        else:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
            
        if not raw_api_key:
            logger.warning("Gemini API Key nu a fost gasit. Nu se pot genera embeddings.")
            self.client = None
        else:
            self.client = genai.Client(api_key=raw_api_key)
            
        # Modelul folosit in restul proiectului (384 dimensiuni)
        self.embedding_model = "gemini-embedding-001"
        self.embedding_dims = 384
        
    def generate_embedding(self, text: str) -> list[float]:
        if not self.client:
            return []
        try:
            resp = self.client.models.embed_content(
                model=self.embedding_model,
                contents=text,
                config=genai_types.EmbedContentConfig(output_dimensionality=self.embedding_dims),
            )
            return resp.embeddings[0].values
        except Exception as e:
            logger.error(f"Eroare la generarea embedding-ului: {e}")
            return []
            
    def store_announcement(self, original_text: str, extracted_data: dict):
        if not self.supabase or not self.client:
            logger.warning("VectorService nu este initializat complet, ignoram salvarea in DB.")
            return False
            
        # Generam vectorul bazat pe textul original al anuntului
        embedding = self.generate_embedding(original_text)
        if not embedding:
            logger.error("Nu s-a putut genera embedding-ul.")
            return False
            
        data = {
            "original_text": original_text,
            "materie_sau_subiect": extracted_data.get("materie_sau_subiect"),
            "entitate_sursa": extracted_data.get("entitate_sursa"),
            "tip_eveniment": extracted_data.get("tip_eveniment"),
            "urgenta_estimata": extracted_data.get("urgenta_estimata"),
            "rezumat_notificare": extracted_data.get("rezumat_notificare"),
            "public_tinta": extracted_data.get("public_tinta", []),
            "deadline_absolut": extracted_data.get("deadline_absolut"),
            "locatie": extracted_data.get("locatie"),
            "metadata": extracted_data,
            "embedding": embedding
        }
        
        try:
            self.supabase.table("smart_news_chunks").insert(data).execute()
            logger.info("✅ Anunt salvat cu succes in Vector DB (smart_news_chunks).")
            return True
        except Exception as e:
            logger.error(f"Eroare la salvarea anuntului in Supabase: {e}")
            return False
            
    def query_similar_announcements(self, query: str, n_results: int = 5):
        if not self.supabase or not self.client:
            return []
            
        query_embedding = self.generate_embedding(query)
        if not query_embedding:
            return []
            
        try:
            response = self.supabase.rpc(
                "match_smart_news_chunks",
                {
                    "query_embedding": query_embedding,
                    "match_count": n_results
                }
            ).execute()
            return response.data
        except Exception as e:
            logger.error(f"Eroare la cautarea semantica in Supabase: {e}")
            return []
