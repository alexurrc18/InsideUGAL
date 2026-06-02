from rag_engine import RAGEngine

def main():
    print("⏳ Inițializăm baza de date vectorială (prima rulare poate descărca modelul de limbaj, durează puțin)...")
    rag = RAGEngine()

    # Aici punem niște informații de test, ca și cum le-am fi luat de pe ugal.ro
    documente = [
        "Facultatea de Automatică, Calculatoare, Inginerie Electrică și Electronică (FACIEE) se află pe strada Științei nr. 2. Aici se studiază Calculatoare, Tehnologia Informației, Automatică și Inginerie Electrică.",
        "Cantina studențească a Universității Dunărea de Jos din Galați se află în Campusul Științei. Meniul zilei pentru studenți este subvenționat și costă aproximativ 15-20 RON (include supa/ciorbă, fel principal și uneori desert).",
        "Căminele studențești sunt împărțite în mai multe zone: Campusul Al. I. Cuza (Căminele LSG, A, B, etc.), Campusul Țiglina și Campusul Științei. Căminul LSG oferă condiții moderne, cu baie în cameră."
    ]
    
    # Metadate (ne ajută dacă vrem să filtrăm doar după facultăți sau doar după cantină pe viitor)
    metadate = [{"categorie": "facultati"}, {"categorie": "cantina"}, {"categorie": "camine"}]
    
    # Fiecare paragraf trebuie să aibă un ID unic
    id_uri = ["doc_faciee_1", "doc_cantina_1", "doc_camine_1"]

    print("📚 Adăugăm cunoștințele în memoria AI-ului...")
    rag.add_documents(documents=documente, metadatas=metadate, ids=id_uri)
    
    print("✅ Gata! Baza de date a fost populată cu succes.")
    print("Acum poți porni chat-ul (AiBot.py) și să îl întrebi despre FACIEE, cantină sau cămine!")

if __name__ == "__main__":
    main()