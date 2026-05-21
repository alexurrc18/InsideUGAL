A.

1. faci un repsitory nou pe git
2. deschizi folderul unde vrei sa salvezi proiectul
3. deschizi git bash / cmd / windows power shell
4. 'git clone <repository link>'
5. copiezi folderele proiectului tau in locatia unde ai dat git clone
6. deschizi proiectul din locatie unde le-ai copiat anterior
7. deschizi un terminal
8. 'git status' - pt a vedea fisierele noi (cele cu rosu nu sunt incarcate in git)
9. 'git add .' (pentru a incarca toate fisierele noi)
10. (optional) apelezi iar "git status" pt a verifica daca fiserele au fost incarcate (momentan ele sunt incarcate in folderul git-ului de pe pc dar nu si pe net)
11. 'git commit -m "aici adaugi o descriere scurta"
12. 'git push origin main' - asta va trimite modificarile catre git hub
13. (optional) 'git status' - pt a verifica daca toate fisierele au fost trimise

B.

1. 'git checkout -b <feature_data_numeutilizator>' - face un branch nou, copiaza branch-ul main si te muta in noul branch
   ---------dupa ce ai terminat modificarile - user1 (cel care face primul push cu modificari pe branch-ul main)
   1a. 'git status'
   2a. 'git add .'
   3a. 'git commit -m "aici adaugi o descriere scurta"
   4a. 'git push'
   5a. copiezi si rulezi mesajul primit: 'git push --set-upstream origin <feature_data_numeutilizator>'
   6a. mergi pe git hub si apesi pe 'Compare & pull request' apoi check si merge
   7a. in terminal - te muti pe branch-ul main cu 'git checkout main'
   8a. 'git pull' - pentru a face update la branch-ul main cu modificarile de pe git hub
   9a. pentru a face noi modificari revii la pasul 1 folosind un nume nou de feature branch
   ---------dupa ce ai terminat modificarile - user2 (cel care nu face primul push cu modificari pe branch-ul main)
   1b. - 'git status'
   2b. - 'git add .'
   3b. - 'git commit -m "aici adaugi o descriere scurta"'
   4b. - te muti pe branch-ul main pentru a face update cu modificarile daugate de user-ul 1 - 'git checkout main'
   5b. - 'git pull' - pentru a face update la main
   6b. - 'git checkout' <numele branch-ului tau>
   7b. - 'git rebase main'
   8b. - rezolvi conflictele
   9b. - dai 'git add .' ("add ." adauga toate fisierele proiectului, daca vrei sa modifici doar un fisier, in loc de punct scrii numele fisierului)
   10b - 'git rebase --continue'
   11b. - poti sa adaugi detalii la fisierul notpad deschis sau doar in inchizi
   12b. - 'git push'
   13b. - copiezi si rulezi mesajul primit : 'git push --set-upstream origin <feature_data_numeutilizator>'
   14b. - mergi pe git hub si apesi pe 'Compare & pull request' apoi check si merge
   15a. - in terminal - te muti pe branch-ul main cu 'git checkout main'
   16a. - 'git pull' - pentru a face update la branch-ul main cu modificarile de pe git hub
   17b. - pentru a face noi modificari revii la pasul 1 folosind un nume nou de feature branch

!!!!! daca realizezi ca ai inceput modificarile direct in branch-ul MAIN

1. 'git status'
2. 'git restore .'
