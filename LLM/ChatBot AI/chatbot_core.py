import os
import json
from datetime import datetime
import requests
from urllib.parse import quote

# Importurile din modulele tale (asigură-te că le dai și aceste fișiere)
from llm_client import LLMClient
from prompt_builder import PromptBuilder
from output_parser import OutputParser

class ChatbotCore:
    def __init__(self, model_name="openai/gpt-oss-120b:free"):
        self.model_name = model_name
        self._prompt_builder = PromptBuilder()
        self._output_parser = OutputParser()
        self.history_dir = "histories"
        
        os.makedirs(self.history_dir, exist_ok=True)
        
        # Inițializăm clientul LLM
        self._client = LLMClient(model_name=self.model_name, 
                                 system_instruction=self._prompt_builder.build())
        
        self.current_session = self.create_new_session()

    def create_new_session(self):
        """Creează o conversație nouă."""
        session = {
            "id": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "title": "Conversație nouă",
            "messages": [],
            "created": datetime.now().isoformat()
        }
        self._client.reset([])
        self.current_session = session
        return session

    def load_session(self, session_id):
        """Încarcă o conversație existentă din istoric."""
        path = os.path.join(self.history_dir, f"{session_id}.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                self.current_session = json.load(f)
            
            # Reconstruim istoricul pentru model
            history_for_llm = [{"role": m["role"], "text": m.get("full_prompt", m["text"])} 
                               for m in self.current_session["messages"]]
            self._client.reset(self._prompt_builder.format_history(history_for_llm))
            return True
        return False

    def save_session(self):
        """Salvează conversația curentă."""
        path = os.path.join(self.history_dir, f"{self.current_session['id']}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.current_session, f, ensure_ascii=False, indent=2)

    def send_message(self, text, file_paths=None):
        """
        Funcția principală pe care o va apela colegul de backend.
        Primește textul utilizatorului și o listă de căi către fișiere atașate.
        Returnează un dicționar cu răspunsul sau eroarea.
        """
        if file_paths is None:
            file_paths = []
            
        file_context = ""
        file_names = []
        
        # Procesăm fișierele dacă există
        for path in file_paths:
            if os.path.exists(path):
                fname = os.path.basename(path)
                file_names.append(fname)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read(8000)
                    file_context += f"\n\n--- Conținut fișier: {fname} ---\n{content}\n--- End {fname} ---"
                except Exception as e:
                    file_context += f"\n\n[Eroare la citirea {fname}: {e}]"

        full_prompt = text + file_context
        display_text = text
        if file_names:
            display_text += f"\n\n📎 Atașament: {', '.join(file_names)}"

        # Apelăm API-ul
        try:
            raw = self._client.send(full_prompt)
            reply = self._output_parser.parse(raw)
            
            # Salvăm în istoric
            self.current_session["messages"].append({
                "role": "user", "text": display_text, "full_prompt": full_prompt, "timestamp": datetime.now().isoformat()
            })
            self.current_session["messages"].append({
                "role": "model", "text": reply, "timestamp": datetime.now().isoformat()
            })
            
            # Setăm titlul dacă e prima interacțiune
            if len(self.current_session["messages"]) == 2:
                self.current_session["title"] = text[:32] + ("…" if len(text) > 32 else "")
                
            self.save_session()
            return {"status": "success", "reply": reply}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def generate_image_url(self, prompt):
        """Returnează direct un URL către imaginea generată pe care frontend-ul să o afișeze."""
        import random
        clean = prompt[:300]
        # Eliminăm diacriticele pentru stabilitate la URL
        ro_map = {"ă":"a","â":"a","î":"i","ș":"s","ț":"t","Ă":"A","Â":"A","Î":"I","Ș":"S","Ț":"T"}
        for k, v in ro_map.items():
            clean = clean.replace(k, v)
            
        seed = random.randint(1, 99999)
        url = f"https://image.pollinations.ai/prompt/{quote(clean)}?width=768&height=512&seed={seed}&nologo=true&model=flux"
        return {"status": "success", "image_url": url}