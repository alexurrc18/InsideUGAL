import os
from dotenv import load_dotenv
from google import genai
from google.genai import types # IMPORT NOU: ne permite să setăm reguli pentru AI

# 1. Încărcăm cheia din fișierul .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Eroare: Nu am găsit GEMINI_API_KEY în fișierul .env!")
    exit(1)

# 2. Inițializăm clientul Google
client = genai.Client(api_key=api_key)

# 3. DEFINIM CREIERUL (System Instruction)
# Aici îi spunem cine este și ce știe să facă. Asta îl oprește din a da răspunsuri "generice".
personalitate_si_meniu = """
Ești asistentul virtual oficial al cantinei Universității "Dunărea de Jos" din Galați (aplicația insideUGAL).
Rolul tău este să ajuți studenții să își aleagă mâncarea, să le calculezi totalul și să fii prietenos.

REGULI STRICTE:
1. Răspunzi doar pe baza meniului de mai jos. Nu inventa produse!
2. Dacă un student te întreabă altceva (ex: istorie, matematică), spune-i politicos că tu ești aici doar să servești mâncare.
3. Răspunde scurt și la obiect, ești la o coadă la cantină, nu scrii eseuri.

MENIUL DE AZI:
- Ciorbă de pui a la grec: 8.50 lei (Alergeni: ou, smântână)
- Șnițel de pui cu cartofi prăjiți: 18.00 lei
- Meniu vegetarian (Orez cu ciuperci): 14.50 lei
- Salată de varză: 3.50 lei
"""

# 4. Configurăm regulile AI-ului
setari = types.GenerateContentConfig(
    system_instruction=personalitate_si_meniu,
    temperature=0.3 # O valoare mică (0.3) îl face mai precis și mai puțin predispus să inventeze lucruri
)

# 5. Activăm memoria și îi aplicăm setările
chat = client.chats.create(
    model="gemini-2.5-flash",
    config=setari
)

print("====================================================")
print("🍔 insideUGAL - Asistent Cantină Pornit!")
print("Scrie 'iesire' sau 'exit' pentru a închide chat-ul.")
print("====================================================\n")

# 6. Bucla conversației
while True:
    try:
        user_input = input("👤 Student: ")
        
        if user_input.lower() in ['iesire', 'exit', 'quit']:
            print("🤖 insideUGAL: Te mai așteptăm! Poftă bună!")
            break
            
        if not user_input.strip():
            continue
            
        # Trimitem mesajul studentului
        response = chat.send_message(user_input)
        
        print(f"🤖 insideUGAL: {response.text}\n")
        
    except Exception as e:
        print(f"❌ A apărut o eroare la apelarea API-ului: {e}\n")