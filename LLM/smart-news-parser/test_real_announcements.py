import asyncio
import os
import json
from dotenv import load_dotenv
from llm_service import LLMService

async def run_tests():
    # Incarcam configuratia din root-ul LLM
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_env_path = os.path.abspath(os.path.join(current_dir, "..", ".env"))
    load_dotenv(dotenv_path=root_env_path, override=True)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ EROARE: GEMINI_API_KEY nu a fost gasit!")
        return

    service = LLMService(api_key=api_key)

    announcements = [
        {
            "name": "Concurs Severin Bumbaru",
            "text": """Concursul de creativitate în IT „Severin Bumbaru” - ediția 2026
Dragi studenți,

Vă invităm să participați la ediția din 2026 a Concursului de creativitate în IT „Severin Bumbaru”.

Anul acesta, pentru studenți, există două secțiuni: (1) Programare Avansată și Inteligență Artificială și (2) Programare Orientată pe Obiecte, Baze de Date și Tehnologii Web.

Ediția 2026 se va desfășura ONLINE în format HACKATHON de 2 zile în perioada 25-27 martie 2026 având secțiuni cu tematică propusă de experți din învățământul preuniversitar și universitar.

Fiecare echipă, formată din maximum trei membri, va realiza o aplicație într-un domeniu de (1) Programare Avansată și Inteligență Artificială sau (2) Programare Orientată pe Obiecte, Baze de Date și Tehnologii Web.

În desfăşurarea concursului, fiecare echipă va avea la dispoziție 48 de ore pentru dezvoltarea proiectului, 15-20 de minute pentru prezentarea rezultatelor şi încă 10-15 minute de conversaţie cu juriul.

Înscrierea participanţilor se face până pe 20 martie 2026.

Mai multe informații despre concurs și înscriere puteți obține pe site-ul concursului: https://www.concurssbumbaru.ugal.ro/

Vă așteptăm cu drag să vă înscrieți!"""
        },
        {
            "name": "Decontare Transport",
            "text": """Decontare transport studenți
Conform Legii 141/2025, în anul 2026, prin derogare de la prevederile art. 128, alin. (3) din Legea învățământului superior nr. 199/2023, cu modificările și completările ulterioare, studenții înmatriculați la forma de învățământ cu frecvență în instituțiile de învățământ superior acreditate beneficiază de tarif redus cu 90% pentru transportul intern auto și pentru transportul intern feroviar la toate categoriile de trenuri, clasa a II-a, doar pe distanțele/rutele dintre localitatea de domiciliu și localitatea unde se află instituția de învățământ superior la care studentul este înmatriculat. (2) În anul 2026, prin derogare de la prevederile art. 128, alin. (3) din Legea învățământului superior nr. 199/2023, cu modificările și completările ulterioare, studenții înmatriculați la forma de învățământ cu frecvență în instituțiile de învățământ superior acreditate beneficiază de tarif redus cu 90% pe mijloacele de transport local în comun și transportul cu metroul, în localitatea în care își are sediul instituția de învățământ superior la care studentul este înmatriculat, vă transmitem mocul de decontare a abonamentelor lunare la transportul local.

Studenții orfani sau studentii proveniți din casele de copii beneficiază de gratuitate pentru transportul local.
Eliberarea titlurilor de transport cu reducere 90% și gratuite pentru studenți se efectuează în baza legitimației de student pentru reducere la transport vizată pentru anul universitar în curs și a unui act de identitate sau pașaport, până la împlinirea vârstei de 30 ani.
Decontarea transportului nu se face pe perioada vacanțelor.
Studenții beneficiază lunar de un singur abonament cu reducere de 90% sau gratuit, după caz.


Decontarea abonamentului de transport local în comun TRANSURB
Studenții care doresc decontarea abonamentelor de transport local în comun puse la dispoziție de către Societatea de transport local, trebuie să parcurgă următoarele etape:

Procurarea, de la chioșcurile Societății, a abonamentelor PLUS NOMINALE de transport local în comun eliberate pe baza legitimației de transport studenți, cu valoarea de 90% din prețul întreg.
Depunerea la secretariatul facultății unde urmează cursurile a următoarelor documente:
cererea completată și semnată de student (Anexa 1);
copia carnetului de student vizat pentru anul în curs;
copia actului de identitate (CI);
bonul fiscal de achiziționare al abonamentului lunar în original, (seria cardului de pe bonul fiscal trebuie să fie aceeași cu seria de pe cardul de transport);
abonamentul trebuie să aibă prima zi de valabilitate în luna anterioară depunerii documentelor;
copia cardului nominal de transport (să fie lizibile numele și seria cardului);
documente justificative în cazul studenților orfani (copie certificat deces);
extrasul de cont (titular studentul) - se aduce o singură dată, la prima decontare, sau atunci când numărul de cont/banca se modifică.


Decontarea abonamentului interurban auto și transport naval
Studenții care doresc decontarea biletelor de transport interurban auto și transportul naval trebuie să aibă în vedere următoarele:

studenții beneficiază lunar de decontarea a maximum 8 bilete sau de un singur abonament cu reducere de 90% sau gratuit, după caz, care se atașează la cerere (Anexa 2);
biletele depuse pentru decontare trebuie să fie din luna anterioară datei încare se solicită decontarea;
biletele depuse pentru decontare trebuie să conțină în mod vizibil: denumirea (sigla) firmei de transport, ștampila firmei de transport, data efectuării călătoriei, ruta de deplasare, nr. bon și valoarea biletului de călătorie (nu se vor primi bilete pe care unul sau mai multe din aceste elemente lipsesc; toate datele trebuie să apară pe fața biletului). Biletele depuse pentru decontare care au serii consecutive sau apropiate (care pot fi din același mijloc de transport) se vor anula;
pe abonament trebuie specificat numărul de călătorii și ruta, anexată chitanța/bonul fiscal cu care s-a plătit, talonul cu numărul călătoriilor emis la eliberarea abonamentului;
ruta trebuie să coincidă cu adresa de domiciliu din cartea de identitate a studentului;
dacă pe ruta de deplasare de la facultate până la localitatea de domiciliu există rută directă feroviară, nu se decontează biletele sau abonamentul pentru mijlocul de transport auto.
în cazul în care studentul locuiește într-o localitate deservită de o stație de cale ferată, călătoria se poate face fracționat cu mijloacele de transport ale mai multor operatori de transport feroviar și auto, doar pe ruta de deplasare de la facultate până la localitatea de domiciliu, decontându-se doar transportul auto pentru 8 călătorii sau abonamentul lunar.


Important!
Pe toate copiile depuse studentul va scrie conform cu originalul și va semna.
Abonamentele se cumpără și se decontează lunar.
Documentele se depun la secretariatul facultății în perioada 1-7 ale lunii.
Virarea sumelor în conturile studenților se efectuează până în ultima zi a lunii inclusiv."""
        }
    ]

    for ann in announcements:
        print(f"\n🚀 Testare: {ann['name']}...")
        try:
            result = await service.extract_tasks(ann['text'])
            print(f"✅ Rezultat pentru {ann['name']}:")
            print(json.dumps(result.model_dump(), indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"❌ EROARE la {ann['name']}: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())
