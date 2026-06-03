import chromadb
from chromadb.utils import embedding_functions

class RAGEngine:
    def __init__(self, persist_directory="./ugal_vectordb"):
        # Inițializăm baza de date locală unde vom ține regulamentele
        self.client = chromadb.PersistentClient(path=persist_directory)
        
        # Folosim un model multilingv (inclusiv română) pentru a înțelege sensul frazelor
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="paraphrase-multilingual-MiniLM-L12-v2"
        )
        
        # Creăm sau accesăm colecția de cunoștințe UGAL
        self.collection = self.client.get_or_create_collection(
            name="ugal_knowledge",
            embedding_function=self.embedding_fn
        )

    def add_documents(self, documents, metadatas, ids):
        """Funcție pentru a 'hrăni' AI-ul cu regulamente, orare, etc."""
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

    def search(self, query, n_results=3):
        """Caută cele mai relevante paragrafe pentru întrebarea studentului."""
        if self.collection.count() == 0:
            return ""
        
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        # Dacă găsim informații relevante, le combinăm într-un singur text
        if results and results['documents'] and results['documents'][0]:
            context = "\n\n---\n\n".join(results['documents'][0])
            return context
        return ""