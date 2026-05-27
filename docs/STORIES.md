🎯 User Stories - InsideUGAL (Versiunea Administrativă)

👑 Ierarhia de Acces (Roluri și Permisiuni)
🔴 Șef de departament / Administrator
Nivel: Acces Total.
Responsabilități: Gestionează conturile și rolurile, modifică inventarul și prețurile la cantină, validează locațiile pe hartă și decide statusul final al sesizărilor (Rezolvat).

🟡 Profesor / Staff
Nivel: Acces Gestiune Conținut.
Responsabilități: Postează și editează noutăți sau evenimente specifice facultăților. Are acces de vizualizare pe toate modulele administrative.

🟢 Student Responsabil
Nivel: Acces Gestiune Operativă (Staff junior).
Responsabilități: Actualizează meniul zilnic al cantinei, adaugă puncte de interes pe hartă și preia sesizările tehnice pentru a le trimite spre soluționare.

🔵 Student (Utilizator)
Nivel: Acces Vizualizare & Raportare.
Responsabilități: Consultă meniul cantinei, harta și știrile. Poate raporta probleme prin modulul de sesizări, dar nu poate modifica datele oficiale ale sistemului.

🎨 User Stories pe Pagini
🏠 Pagina: Home (Tablou de bord)
Ca Șef de Departament, vreau să văd statistici globale despre sesizări și utilizatori, astfel încât să pot monitoriza performanța campusului.
Ca Profesor, vreau să văd o listă cu evenimentele zilei, astfel încât să îmi organizez activitatea academică.
Ca Student Responsabil, vreau să văd un sumar al postărilor recente, astfel încât să știu ce informații necesită actualizare.
Ca Student, vreau să văd un sumar al noutăților și starea sesizărilor mele, astfel încât să fiu informat dintr-o privire.

📰 Paginile: Noutăți & Evenimente
Ca Șef de Departament, vreau să șterg orice anunț neadecvat, astfel încât să mențin integritatea platformei.
Ca Profesor, vreau să postez anunțuri despre cursuri sau conferințe, astfel încât studenții să fie la curent cu oportunitățile academice.
Ca Student Responsabil, vreau să public și să editez știri sau evenimente studențești, astfel încât colegii să fie activi în campus.
Ca Student, vreau să filtrez noutățile după facultatea mea, astfel încât să găsesc rapid informația relevantă.

🍴 Pagina: Cantină
Ca Șef de Departament, vreau să configurez stocurile și furnizorii, astfel încât gestiunea cantinei să fie sub control.
Ca Profesor, vreau să văd meniul special pentru profesori sau ofertele zilei, astfel încât să îmi planific pauza de masă.
Ca Student Responsabil, vreau să actualizez prețurile și meniul zilnic, astfel încât datele afișate să fie mereu reale.
Ca Student, vreau să văd gramajul și valorile nutriționale ale produselor, astfel încât să îmi aleg masa în funcție de dietă.

📍 Pagina: Hartă
Ca Șef de Departament, vreau să validez punctele GPS noi, astfel încât harta oficială să nu aibă erori de poziționare.
Ca Profesor, vreau să localizez rapid sălile de curs sau laboratoarele unde am activitate, astfel încât să ajung la timp la ore.
Ca Student Responsabil, vreau să adaug puncte de interes noi (ex: o sală nouă de lectură), astfel încât harta să fie utilă colegilor.
Ca Student, vreau să primesc indicații către o anumită facultate, astfel încât să ajung rapid la cursuri.

🏛️ Pagina: Facultăți
Ca Șef de Departament, vreau să editez structura facultăților (nume, decanat), astfel încât informația instituțională să fie corectă.
Ca Profesor, vreau să actualizez datele de contact personale de pe pagina facultății, astfel încât studenții să mă poată găsi la orele de consultații.
Ca Student Responsabil, vreau să actualizez programul secretariatelelor, astfel încât studenții să nu vină în afara orelor de program.
Ca Student, vreau să găsesc rapid adresa de email a secretariatului meu, astfel încât să pot trimite cereri oficiale.

👤 Pagina: Conturi
Ca Administrator, vreau să schimb rolurile utilizatorilor, astfel încât să ofer permisiuni de "Student Responsabil" sau "Profesor" colegilor desemnați.
Ca Profesor, vreau să îmi gestionez datele profesionale, astfel încât profilul meu să fie vizibil corect în sistem.
Ca Șef de Departament, vreau să văd log-urile de acces, astfel încât să asigur securitatea bazei de date.
Ca Student, vreau să îmi actualizez poza de profil și parola, astfel încât contul meu să fie securizat și personalizat.

⚠️ Pagina: Sesizări
Ca Șef de Departament, vreau să închid sesizările rezolvate, astfel încât să mențin lista de sarcini curată.
Ca Profesor, vreau să raportez o problemă tehnică într-o sală de curs, astfel încât procesul de predare să nu fie afectat.
Ca Student Responsabil, vreau să preiau sesizările și să le atribui echipei de mentenanță, astfel încât problemele să fie procesate rapid.
Ca Student, vreau să raportez o defecțiune (ex: lumină arsă) și să primesc notificare când este remediată.

🛠️ Target-uri Tehnice (Echipe)
Backend: Securizarea endpoint-urilor astfel încât un "Student Normal" să nu poată accesa funcțiile de POST sau DELETE.
Database: Setarea regulilor RLS astfel încât Profesorii să poată edita doar conținutul ce aparține facultății lor.
LLM: Antrenarea bot-ului pentru a răspunde diferit (ex: Studentului îi dă meniul, Profesorului îi dă detalii despre procedurile academice).
