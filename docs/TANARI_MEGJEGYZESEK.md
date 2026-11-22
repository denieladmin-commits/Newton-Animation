# Tanári megjegyzések · Gyakori kérdések

*Minden olyan pont, amelyet egy fizikatanár megkérdezhet, vagy amelyre a diákok rákérdezhetnek: hol egyszerűsít a modell, és miért nem változtat ez a tanulságon. A fejlesztés során folyamatosan bővül. Az alkalmazásban a „A modellről” és az „Ellenőrzés” oldalon is megjelenik.*

Az ellenőrzött számértékek és forrásaik: [VALIDATION.md](VALIDATION.md).

---

## Számértékek, amelyek eltérhetnek a tankönyvtől

**1. Miért 9,82 m/s² a nehézségi gyorsulás, és nem 9,81?**
A modellbolygó nem forog, ezért g = GM/R² = 9,82 m/s². A tankönyvi 9,81 m/s² már tartalmazza a Föld forgásából adódó centrifugális hatást és a bolygó lapultságát (az egyenlítőn 9,78, a sarkokon 9,83 m/s²). A különbség 0,1 %, a tanulságon nem változtat.

**2. Miért 7,91 km/s az első kozmikus sebesség, de a hegyről csak 7,90 km/s kell?**
v₁ = √(GM/r) a középponttól mért r távolságtól függ. A 7,91 km/s a felszínre (r = R) vonatkozik. A Mount Everest csúcsán (r = R + 8,85 km) 7,90 km/s, az ISS magasságában (400 km) 7,67 km/s. Az alkalmazás mindig az aktuális magassághoz tartozó v₁-et mutatja.

**3. Az ISS valódi keringési ideje kb. 92,9 perc, az alkalmazásban 92,4 perc. Melyik a jó?**
Mindkettő. Az alkalmazás pontosan 400 km-es körpályát számol: T = 92,4 perc. Az ISS valójában kb. 415–420 km magasan kering. Ha a magasságot 420 km-re állítjuk, az alkalmazás 92,8 percet ad. A maradék kis eltérés a Föld lapultságából és a valódi pálya enyhén elliptikus alakjából adódik.

**4. Miért nem 6,67·10⁻¹¹, hanem 6,6743·10⁻¹¹ a G?**
Ez a legfrissebb mért érték (CODATA 2018), a 6,67·10⁻¹¹ ennek kerekítése. A számításokhoz az alkalmazás közvetlenül a GM szorzatot használja (NASA adat), mert ez sokkal pontosabban ismert, mint külön G és M. A bolygó tömegét M = GM/G alapján írja ki.

**5. Miért 11,19 km/s a szökési sebesség, nem 11,2?**
11,2 km/s a kerekített tankönyvi érték; a pontos számítás 11,19 km/s. v₂ = √2 · v₁ mindig pontosan teljesül.

## A modell egyszerűsítései

**6. A bolygó nem forog. Mit hagyunk ki ezzel?**
Az egyenlítőn a Föld felszíne 0,47 km/s sebességgel halad kelet felé. A valódi rakétákat ezért keletre indítják: ennyivel kevesebb sebességet kell nekik adni. Newton gondolatkísérlete ezt nem tartalmazza, és az alkalmazás sem.

**7. Miért csak vízszintesen lehet lőni?**
Newton gondolatkísérlete vízszintes lövést ír le. Ekkor a kilövés pillanatában a sebesség merőleges a gravitációs erőre, ezért a kilövési pont mindig a pálya egyik szélső pontja: v₀ < v₁ esetén a bolygótól legtávolabbi pont (apogeum), v₀ > v₁ esetén a legközelebbi (perigeum).

**8. Miért kétdimenziós a modell?**
Ha a golyót oldalirányú erő nem éri, a pályája egy síkban marad, mégpedig abban, amelyet a kilövés iránya és a bolygó középpontja meghatároz. A 2D tehát nem közelítés, hanem pontos.

**9. Miért nem számít a golyó tömege?**
A gravitációs erő és a szükséges centripetális erő is arányos a golyó m tömegével, ezért m kiesik: G·Mm/r² = m·v²/r. Légellenállás nélkül egy 1 g-os és egy 1 t-s golyó pontosan ugyanazon a pályán mozog. Légellenállással már számít a tömeg (a nehezebb golyót kevésbé fékezi a levegő); az alkalmazás egy 10 kg-os vasgolyóval számol.

**10. Miért nem vonzza a golyót a Hold vagy a Nap?**
Földközelben a Hold vonzása a Földének kb. 0,0003 %-a, a Nap árapály-hatása még kisebb. Egy keringés alatt ez nem látható.

**11. Miért látszik a hegy olyan kicsinek?**
Mert valódi méretarányban rajzoljuk. A Mount Everest magassága a Föld sugarának csak 0,14 %-a: ha a Föld egy 30 cm-es kör lenne a táblán, az Everest 0,2 mm magas lenne. A hegy közelítéskor jelenik meg. Teljes bolygónézetben az ágyú egy rögzített méretű jel a kilövési pontban.

**12. Mi a különbség Newton rajza és az alkalmazás között?**
Newton rajzán a hegy erősen eltúlzott magasságú, hogy látszódjon. Az alkalmazásban minden valódi méretarányban van, ezért kell közelíteni. Cserébe minden, ami a képernyőn látszik, mérhető és pontos.

**12a. Az Everestről kilőtt golyók miért mind a hegy közelében csapódnak be?**
Mert a hegy nagyon alacsony a bolygóhoz képest. Az Everestről kilőve még 7,6 km/s-mal is csak kb. 1270 km-re jut el a golyó, 8,85 km magasról nincs „hova esnie”. A Newton-rajzhoz hasonló, egyre messzebb érkező lövéssorozat (A, B, C, D…) jól látszik, ha a hegy magasságát az ISS-gombbal 400 km-re állítjuk: ekkor 4,0 km/s-mal 2850 km-re, 7,3 km/s-mal már a bolygó túloldalára jut a golyó.

**12b. Az Everestről indított körpálya miért „fekszik rá” a bolygó felszínére?**
Mert 8,85 km magasan halad, ami teljes bolygónézetben kevesebb mint fél képpont. Közelítéskor jól látszik, hogy a pálya végig a felszín felett marad.

**12c. Mi valódi méretarányú a képen, és mi nem?**
A bolygó, a hegy, a légkör és minden pálya valódi méretarányú (bal alul a méretskála mutatja, mekkora távolság egy szakasz). Rögzített képernyőméretű, hogy mindig látható legyen: az ágyú, a golyó, a betűjelek és a feliratok. A bolygók felszínén a „kontinensek” díszítő jellegűek, nem a valódi földrajzot mutatják.

**12d. Miért tűnnek el a korábbi lövések, ha másik bolygót vagy hegymagasságot választunk?**
A betűvel jelölt korábbi lövések (A, B, C…) azért maradnak a képen, hogy ugyanarról a hegyről, különböző sebességgel indított pályákat lehessen összehasonlítani, mint Newton rajzán. Másik bolygóval vagy hegymagassággal az összehasonlítás már nem lenne értelmes, ezért ilyenkor törlődnek.

**12e. Mit jelent a „Követés” gomb, és miért ugrik közel a kép 1x sebességen?**
1x (valós idejű) sebességen teljes bolygónézetben a golyó szinte mozdulatlannak látszana (kb. 1 képpont másodpercenként). Ezért lövéskor a kép az ágyúra közelít, és követi a golyót. A követés a kép elhúzásával vagy a ◎ gombbal kapcsolható ki.

## Légellenállás

**13. Miért áll meg szinte azonnal a golyó, ha be van kapcsolva a légellenállás?**
Mert ez a valóság. Az Everest magasságában a levegő sűrűsége a tengerszintinek kb. harmada, a golyó pedig a hangsebesség kb. 25-szörösével halad. A közegellenállási erő a sebesség négyzetével nő: a 10 kg-os golyóra kb. 96 000 N fékezőerő hat, ez a súlyának kb. 980-szorosa. A golyó kb. 1 másodperc alatt veszíti el sebessége felét, és kb. 26 km-re csapódik be. Ezért Newton „hegye” idealizálás, és ezért keringenek a műholdak a légkör felett.

**14. Mennyire pontos a légellenállás modellje?**
Egyszerűsített, de nagyságrendileg helyes:
- a légkör sűrűsége exponenciálisan csökken a magassággal (skálamagasság 8,5 km);
- a légellenállási tényező állandó (C_d = 0,5). Ennyi sebességnél a valódi érték inkább 0,9–1, vagyis a valóságban a fékezés még erősebb lenne;
- a golyó felhevülését, olvadását nem modellezzük.

**15. Miért nincs légellenállás 100 km felett?**
A 100 km-es Kármán-vonalat szokás a világűr határának tekinteni. A modell e fölött a sűrűséget nullának veszi. A valóságban a légkör nyomokban 400 km-en is jelen van: az ISS emiatt havonta kb. 2 km-t süllyed, és rendszeresen meg kell emelni a pályáját.

**16. Miért nincs légellenállás-kapcsoló a Holdon?**
A Holdnak nincs légköre. A Marsé van, de a földinek kb. 1/60-a sűrűségű.

## Mozgás és energia

**17. Ha a golyó kering, akkor esik vagy nem esik?**
Esik, folyamatosan. Az első másodpercben ugyanúgy 4,9 m-t esik, mint egy elejtett kő. Közben 7,9 km-t halad előre, és ennyi távolságon a Föld felszíne éppen 4,9–5 m-rel görbül el. A golyó tehát esik, de a talaj ugyanannyival „elfordul” alóla. Az alkalmazás ezt 1x sebességen, közelítve mutatja meg.

**18. Miért negatív a helyzeti energia?**
A nullszintet a végtelen távolban vesszük fel. A gravitáció vonzó erő, ezért a golyót a végtelenbe kivinni munkába kerül: bármilyen véges távolságban kevesebb energiája van, mint a végtelenben, vagyis E_p = −G·Mm/r negatív. Felszínközelben két magasság közötti különbség jó közelítéssel m·g·h, tehát ez összhangban van az iskolai képlettel. A negatív E_p előnye: a teljes energia előjeléből látszik, hogy a golyó a bolygó körül marad (E < 0), vagy elszökik (E ≥ 0).

**19. Miért ellipszis a pálya, ha v₀ nagyobb v₁-nél?**
Ekkor a gravitáció nem elég ahhoz, hogy körpályán tartsa a golyót, ezért távolodik, közben lassul, majd visszafordul: ez az ellipszis. A kilövési pont a bolygóhoz legközelebbi pont lesz. Ha v₀ kisebb v₁-nél, a kilövési pont a legtávolabbi pont, és a golyó becsapódik, mert az ellipszis belemetsz a bolygóba.

**20. Mi történik pontosan v₂-nél?**
A pálya parabola, a golyó soha nem tér vissza. v₂ felett hiperbola. Az alkalmazás akkor jelzi az elszökést, amikor a golyó a bolygó sugarának 30-szorosánál messzebb van, és az összenergiája nem negatív.

**21. A gyorsítás (10x, 100x …) megváltoztatja a fizikát?**
Nem. A gyorsítás csak azt szabja meg, hogy a valós idő egy másodperce alatt mennyi szimulált idő telik el. A számítás lépésköze a pálya alakjához igazodik, nem a gyorsításhoz, ezért minden sebességen ugyanazt a pályát kapjuk. 1x sebességen a szimuláció valós idejű.

## Pontosság

**22. Mennyire pontos a szimuláció?**
A program a negyedrendű Runge–Kutta (RK4) módszerrel számol. Ellenőrzésképp a pontos, képlettel számolt Kepler-pályával vetjük össze: egy harmadkörnyi ellipszispálya után az eltérés 0,016 mm. Az összenergia 10 keringés alatt 10⁻¹³ nagyságrendű relatív hibával marad állandó. A részleteket és a futtatható ellenőrzéseket lásd: [VALIDATION.md](VALIDATION.md).

**23. Honnan származnak az állandók?**
A NASA bolygó-adatlapjairól (Planetary Fact Sheets): GM, átlagos sugár, a légkör sűrűsége és skálamagassága. A G értéke CODATA 2018.
