# Minu Trennipäevik

Isiklik trennipäevik, mille kujundan enda treeningute ja eelistuste järgi, sest olemasolevad rakendused ei vasta minu vajadustele piisavalt hästi.

## Eesmärk

Rakendus aitab mul treeningkavasid hallata, treeninguid üles märkida ja eri harjutuste raskusastme muutumist aja jooksul jälgida. Soovin ise valida, milliseid harjutusi ja andmeid kasutan, ning näha iga harjutuse arengut eraldi.

## Sihtgrupp

Rakenduse ainus sihtkasutaja olen mina ise. Teen selle enda treeningute ja eelistuste järgi.

## Funktsionaalsus

- Valida nelja algse kava vahel: Seistes, Istudes, Põrandal ja Kardio.
- Luua lisakavasid ning muuta või kustutada enda loodud kavasid.
- Lisada ja eemaldada harjutusi igas kavas.
- Märkida harjutuse seeriate arv, kordused seerias ja raskusaste skaalal 1–5. Kardioharjutuse puhul saab märkida minutid ja raskusastme.
- Lisada treeningule kuupäeva ja märkmeid.
- Vaadata treeninguid värvikoodiga kalendris ning treeningute ajaloos.
- Muuta ja kustutada salvestatud treeninguid.
- Avada eraldi Arengu vaade, valida harjutuste loendist harjutus ja vaadata selle raskusastme lihtsat graafikut.
- Hoida sama nimega harjutusi eri kavades eraldi, näiteks „Seistes – Sõudmine“ ja „Istudes – Sõudmine“.

## Tehnoloogiad

- **HTML** – lehe struktuur ja vormid.
- **CSS** – kujundus ja kohandamine eri ekraanisuurustele.
- **JavaScript** – kavade, treeningute, kalendri ja arengugraafiku toimimine.
- **localStorage** – andmete salvestamine samas veebilehitsejas.
- **Git ja GitHub** – versioonihaldus ja projekti jagamine.

## Teostusplaan

1. Kavandada isiklikuks kasutuseks vajalikud vaated ja andmeväljad.
2. Luua HTML-i ja CSS-iga treeningu, kalendri ja arengu vaated.
3. Lisada JavaScriptiga kavade ning harjutuste loomine ja muutmine.
4. Lisada treeningu salvestamine koos seeriate, korduste, minutite, raskusastme ja märkmetega.
5. Salvestada andmed localStorage'is ning kuvada neid ajaloos ja värvikoodiga kalendris.
6. Koostada harjutuse ja kava järgi eraldi raskusastme trendigraafik.
7. Viimistleda rakenduse kasutusmugavus ja kasutusjuhend.

## Valmisoleku kriteeriumid

Projekt on valmis, kui:

- saan kasutada nelja algset kava ning luua, muuta ja kustutada enda lisatud kavasid;
- saan kavas harjutusi lisada ja eemaldada;
- saan salvestada treeningu kuupäeva, harjutuste seeriad ja kordused või kardio minutid, raskusastme ning märkmed;
- salvestatud treeningud säilivad veebilehitsejas ning neid saab ajaloos muuta ja kustutada;
- kalender kuvab trennid vastava kava värviga;
- Arengu vaates saan harjutuse valida ning näha selle raskusastme trendi ajas;
- sama nimega harjutused eri kavades kuvatakse eraldi;
- rakendus on arusaadav ja kasutatav arvutis ning telefonis.

## Käivitamine

Ava `index.html` veebilehitsejas. Treeninguandmed salvestatakse samas veebilehitsejas localStorage'i.
