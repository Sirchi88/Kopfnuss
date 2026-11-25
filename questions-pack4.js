// KOPFNUSS – Fragen-Paket 4
(() => {
const Q = window.QUESTIONS;
const add = (k, arr) => { Q.mc[k] = (Q.mc[k] || []).concat(arr); };

add('welt', [
  ["In welcher Stadt steht der Burj Khalifa?", "Dubai", "Abu Dhabi", "Doha", "Riad"],
  ["In welcher Stadt steht die Freiheitsstatue?", "New York", "Washington", "Boston", "Philadelphia"],
  ["Welches Land ist für Tulpenfelder und Windmühlen bekannt?", "Niederlande", "Belgien", "Dänemark", "Schweden"],
  ["In welchem Land liegt die Stadt Krakau?", "Polen", "Tschechien", "Ungarn", "Slowakei"],
  ["Welche Stadt war 1972 Gastgeber der Olympischen Sommerspiele in Deutschland?", "München", "Berlin", "Hamburg", "Stuttgart"],
  ["Was ist die Hauptstadt von Griechenland?", "Athen", "Thessaloniki", "Sparta", "Korinth"],
  ["Was ist die Hauptstadt von Belgien?", "Brüssel", "Antwerpen", "Brügge", "Gent"],
  ["Was ist die Hauptstadt von Dänemark?", "Kopenhagen", "Aarhus", "Odense", "Malmö"],
  ["Was ist die Hauptstadt von Russland?", "Moskau", "Sankt Petersburg", "Kasan", "Nowosibirsk"],
  ["Was ist die Hauptstadt von China?", "Peking", "Shanghai", "Hongkong", "Kanton"],
  ["Was ist die Hauptstadt von Japan?", "Tokio", "Osaka", "Kyoto", "Yokohama"],
  ["Welche Stadt ist für Fado-Musik und gelbe Straßenbahnen bekannt?", "Lissabon", "Madrid", "Barcelona", "Porto"],
  ["In welchem Land isst man Pierogi?", "Polen", "Italien", "Frankreich", "Griechenland"],
  ["Welches Land hat ein weißes Kreuz auf rotem Grund als Flagge?", "Schweiz", "Dänemark", "Österreich", "Schweden"],
  ["Welches Land hat ein weißes Kreuz, das nach links verschoben ist, auf rotem Grund?", "Dänemark", "Schweiz", "Norwegen", "Finnland"],
  ["In welcher Stadt steht die berühmte Karlsbrücke?", "Prag", "Wien", "Budapest", "Krakau"],
  ["Welche Stadt nennt man wegen ihrer Wolkenkratzer „Mainhattan“?", "Frankfurt am Main", "Hamburg", "Köln", "Düsseldorf"],
  ["Woher kommt der Cappuccino?", "Italien", "Österreich", "Frankreich", "Spanien"],
  ["Was ist ein „Tuk-Tuk“?", "Ein dreirädriges Motortaxi", "Ein Tanz", "Ein Dessert", "Ein Musikinstrument"],
  ["In welchem Land feiert man den „Día de los Muertos“?", "Mexiko", "Spanien", "Brasilien", "Argentinien"],
]);

add('erdkunde', [
  ["Welcher Fluss ist der längste, der durch Deutschland fließt (deutscher Abschnitt)?", "Rhein", "Elbe", "Donau", "Main"],
  ["Welches Bundesland hat keinen direkten Zugang zum Meer – und ist Bayerns Nachbar im Westen?", "Baden-Württemberg", "Niedersachsen", "Schleswig-Holstein", "Mecklenburg-Vorpommern"],
  ["Welche Insel gehört zu Spanien und liegt im Atlantik?", "Teneriffa", "Mallorca", "Ibiza", "Menorca"],
  ["Zu welchem Land gehören die Azoren?", "Portugal", "Spanien", "Frankreich", "Großbritannien"],
  ["Zu welchem Land gehört Madeira?", "Portugal", "Spanien", "Italien", "Marokko"],
  ["Zu welchem Land gehört die Insel Rhodos?", "Griechenland", "Türkei", "Zypern", "Italien"],
  ["Welcher Ozean umgibt die Antarktis?", "Südpolarmeer", "Pazifik", "Arktischer Ozean", "Indischer Ozean"],
  ["Welche Stadt liegt in zwei Erdteilen – Europa und Asien?", "Istanbul", "Moskau", "Kairo", "Athen"],
  ["Wie heißt der größte Regenwald der Erde?", "Amazonas-Regenwald", "Kongo-Regenwald", "Borneo-Regenwald", "Daintree"],
  ["Welcher Fluss bildet einen Teil der Grenze zwischen Deutschland und Polen?", "Oder", "Elbe", "Weser", "Spree"],
  ["Welches Land grenzt an Frankreich, Deutschland und Belgien?", "Luxemburg", "Schweiz", "Niederlande", "Österreich"],
  ["In welchem Land liegt der Vesuv?", "Italien", "Griechenland", "Spanien", "Island"],
  ["Welcher ist der aktivste Vulkan Europas?", "Ätna", "Vesuv", "Stromboli", "Hekla"],
  ["Welcher Kontinent ist der kälteste?", "Antarktis", "Europa", "Asien", "Nordamerika"],
  ["Welches Land hat die meisten Einwohner in Südamerika?", "Brasilien", "Argentinien", "Kolumbien", "Peru"],
  ["Was ist die Hauptstadt von Peru?", "Lima", "Cusco", "Quito", "La Paz"],
  ["Welche Meerenge trennt Großbritannien von Frankreich?", "Ärmelkanal", "Bosporus", "Gibraltar", "Skagerrak"],
  ["Welches Gebirge liegt in Südamerika?", "Anden", "Ural", "Atlas", "Karpaten"],
  ["Welches Gebirge liegt in Nordafrika?", "Atlas", "Anden", "Himalaya", "Kaukasus"],
]);

add('natur', [
  ["Welches Tier ist das größte Raubtier an Land in Afrika?", "Löwe", "Leopard", "Gepard", "Hyäne"],
  ["Wie heißt ein weiblicher Hirsch?", "Hirschkuh", "Ricke", "Stute", "Bache"],
  ["Wie heißt ein weibliches Wildschwein?", "Bache", "Ricke", "Sau", "Fähe"],
  ["Wie heißt eine Füchsin?", "Fähe", "Ricke", "Bache", "Zibbe"],
  ["Welches Tier frisst hauptsächlich Ameisen?", "Ameisenbär", "Dachs", "Igel", "Maulwurf"],
  ["Welche Schlange ist die längste der Welt?", "Netzpython", "Anakonda", "Königskobra", "Boa"],
  ["Welche Farbe hat ein Rotkehlchen an der Brust?", "Orange-rot", "Blau", "Gelb", "Grün"],
  ["Welcher Vogel legt seine Eier in fremde Nester?", "Kuckuck", "Amsel", "Specht", "Meise"],
  ["Welches Tier trägt sein Haus auf dem Rücken?", "Schnecke", "Igel", "Käfer", "Assel"],
  ["Was sammeln Eichhörnchen für den Winter?", "Nüsse & Samen", "Blätter", "Steine", "Insekten"],
  ["Welche Pflanze nennt man auch „Kaiserkrone“?", "Eine Zwiebelblume (Fritillaria)", "Eine Rose", "Ein Kaktus", "Eine Palme"],
  ["Welches Obst wächst an einem Strauch und ist rot oder schwarz?", "Johannisbeere", "Apfel", "Kirsche", "Pflaume"],
  ["Was ist eine Zucchini botanisch?", "Ein Kürbisgewächs", "Ein Nachtschattengewächs", "Ein Kohl", "Eine Wurzel"],
  ["Welches Kraut gehört klassisch in Tzatziki?", "Dill", "Basilikum", "Rosmarin", "Oregano"],
  ["Welcher Baum hat weiße Rinde?", "Birke", "Eiche", "Buche", "Kiefer"],
  ["Welcher Nadelbaum verliert im Herbst seine Nadeln?", "Lärche", "Fichte", "Tanne", "Kiefer"],
  ["Wie nennt man die Haare am Pferdehals?", "Mähne", "Schweif", "Fell", "Kamm"],
  ["Welches Tier kann seine Farbe wechseln?", "Chamäleon", "Leguan", "Gecko", "Schildkröte"],
  ["Was frisst ein Blauwal hauptsächlich?", "Krill", "Robben", "Haie", "Algen"],
  ["Wie viele Flügel hat eine Biene?", "4", "2", "6", "8"],
]);

add('koerper', [
  ["Wie heißt der Knochen am Oberschenkel lateinisch?", "Femur", "Humerus", "Radius", "Tibia"],
  ["Welches Organ produziert die meisten Verdauungsenzyme?", "Bauchspeicheldrüse", "Magen", "Leber", "Dickdarm"],
  ["Wo wird Nahrung hauptsächlich aufgenommen (resorbiert)?", "Im Dünndarm", "Im Magen", "Im Dickdarm", "In der Speiseröhre"],
  ["Was ist die Speiseröhre?", "Der Schlauch vom Mund zum Magen", "Ein Teil der Lunge", "Ein Blutgefäß", "Ein Nerv"],
  ["Wie viele Lungenflügel hat der Mensch?", "2", "1", "3", "4"],
  ["Welcher Lungenflügel ist kleiner?", "Der linke (wegen des Herzens)", "Der rechte", "Beide gleich", "Wechselt täglich"],
  ["Was ist ein Hämatom?", "Ein Bluterguss", "Ein Knochenbruch", "Eine Entzündung", "Ein Ausschlag"],
  ["Was ist eine Migräne?", "Starker, anfallsartiger Kopfschmerz", "Ein Magenproblem", "Eine Hautkrankheit", "Ein Augenleiden"],
  ["Wie viele Gramm wiegt ein erwachsenes Gehirn ungefähr?", "ca. 1.300–1.400 g", "ca. 300 g", "ca. 3.000 g", "ca. 800 g"],
  ["Welches Hormon reguliert den Blutzucker nach dem Essen?", "Insulin", "Adrenalin", "Melatonin", "Östrogen"],
  ["Was ist ein Muskelkater?", "Mikroverletzungen im Muskel nach Belastung", "Milchsäure im Blut", "Eine Entzündung der Sehnen", "Ein Knochenproblem"],
  ["Welches Vitamin steckt reichlich in Karotten (als Vorstufe)?", "Vitamin A", "Vitamin C", "Vitamin D", "Vitamin B12"],
  ["Welches Mineral ist besonders wichtig für Knochen?", "Calcium", "Eisen", "Natrium", "Zink"],
  ["Was ist der Fachbegriff für Bluthochdruck?", "Hypertonie", "Hypotonie", "Anämie", "Arrhythmie"],
  ["Was ist eine Anämie?", "Blutarmut", "Bluthochdruck", "Herzrasen", "Nierenschwäche"],
  ["Welcher Teil des Auges reguliert die Lichtmenge?", "Pupille", "Netzhaut", "Linse", "Hornhaut"],
  ["Wie heißt der hörbare Teil des Ohrs außen?", "Ohrmuschel", "Ohrtrompete", "Schnecke", "Amboss"],
  ["Wie heißen die drei Gehörknöchelchen?", "Hammer, Amboss, Steigbügel", "Säge, Feile, Bohrer", "Stab, Zapfen, Ring", "Kiefer, Zunge, Gaumen"],
  ["Wie viele Muskeln braucht man ungefähr, um zu gehen?", "Über 200", "Etwa 10", "Etwa 30", "Genau 2"],
  ["Was misst man mit einem Thermometer im Ohr?", "Körpertemperatur", "Blutdruck", "Puls", "Blutzucker"],
]);

add('sport', [
  ["Wer gewann die Fußball-WM 2018?", "Frankreich", "Kroatien", "Belgien", "Deutschland"],
  ["Wer gewann die Fußball-WM 2010?", "Spanien", "Niederlande", "Deutschland", "Italien"],
  ["Wer gewann die Fußball-WM 2006 in Deutschland?", "Italien", "Frankreich", "Deutschland", "Portugal"],
  ["Wie wird das Sommermärchen 2006 noch genannt?", "Heim-WM in Deutschland", "EM in Österreich", "Olympia in Berlin", "Champions-League-Finale"],
  ["Welcher Spieler hat die meisten WM-Tore aller Zeiten?", "Miroslav Klose", "Ronaldo", "Gerd Müller", "Lionel Messi"],
  ["Wie viele Tore schoss Miroslav Klose bei Weltmeisterschaften?", "16", "15", "14", "18"],
  ["Welche Sportart betreibt Dirk Nowitzki?", "Basketball", "Handball", "Volleyball", "Tennis"],
  ["Bei welchem NBA-Team spielte Dirk Nowitzki?", "Dallas Mavericks", "LA Lakers", "Chicago Bulls", "Boston Celtics"],
  ["Was ist ein „Hattrick“ im Fußball?", "Drei Tore eines Spielers in einem Spiel", "Ein Fallrückzieher", "Ein Eigentor", "Drei Gelbe Karten"],
  ["Wie viele Felder hat ein Schachbrett?", "64", "49", "81", "100"],
  ["Was ist beim Schach ein „Rochade“?", "Ein Doppelzug von König und Turm", "Schachmatt", "Ein Bauerntausch", "Ein Remis"],
  ["Welches Auto fährt der Batmobil-Fan? Spaß – welche Marke baut den „Mustang“-Konkurrenten „Camaro“?", "Chevrolet", "Ford", "Dodge", "Pontiac"],
  ["Welche Automarke hat einen Dreizack im Logo?", "Maserati", "Ferrari", "Alfa Romeo", "Lancia"],
  ["Welche Automarke hat vier verschlungene Ringe?", "Audi", "Opel", "VW", "Toyota"],
  ["Welche Automarke hat einen Blitz im Logo?", "Opel", "Tesla", "Peugeot", "Renault"],
  ["Welche Automarke hat einen Löwen im Logo?", "Peugeot", "Renault", "Citroën", "Lamborghini"],
  ["Welche Automarke hat eine Raute im Logo?", "Renault", "Citroën", "Mitsubishi", "Hyundai"],
  ["Welche Marke baut den „Mini“ heute?", "BMW", "VW", "Mercedes", "Fiat"],
  ["Welche Disziplin gehört NICHT zum Triathlon?", "Rudern", "Schwimmen", "Radfahren", "Laufen"],
  ["Wie viele Disziplinen hat der Zehnkampf?", "10", "7", "5", "12"],
]);
// Korrektur: die Scherz-Formulierung entfernen
Q.mc.sport = Q.mc.sport.map(q => q[0].startsWith('Welches Auto fährt der Batmobil-Fan') ? ["Welche Marke baut den „Camaro“?", "Chevrolet", "Ford", "Dodge", "Pontiac"] : q);

add('social', [
  ["Welche Sängerin landete mit „Flowers“ 2023 einen Welthit?", "Miley Cyrus", "Selena Gomez", "Demi Lovato", "Katy Perry"],
  ["Wie heißt die Doku-Serie über das Leben der Kardashians seit 2022?", "The Kardashians", "Keeping Up 2", "Kim's World", "Family Kardashian"],
  ["Auf welcher Plattform gibt es „Stories“ UND „Reels“?", "Instagram", "X", "LinkedIn", "Reddit"],
  ["Was ist ein „Reaction-Video“?", "Man reagiert auf andere Videos", "Ein Chemie-Experiment", "Ein Sport-Highlight", "Ein Werbespot"],
  ["Wofür steht „LOL“?", "Laughing Out Loud", "Lots Of Love", "Life Of Luxury", "Lazy On Line"],
  ["Was bedeutet „Slay“ im Netz-Slang?", "Etwas richtig gut machen", "Schlafen gehen", "Etwas löschen", "Jemanden blockieren"],
  ["Was ist ein „Hashtag“?", "Ein Schlagwort mit #-Zeichen", "Ein Passwort", "Ein Emoji", "Ein Werbelink"],
  ["Wer moderierte „Wetten, dass..?“ jahrzehntelang (zuletzt mit Michelle Hunziker)?", "Thomas Gottschalk", "Günther Jauch", "Markus Lanz", "Stefan Raab"],
  ["Welcher Entertainer kehrte 2024 mit einem Boxkampf gegen Regina Halmich zurück?", "Stefan Raab", "Joko Winterscheidt", "Oliver Pocher", "Elton"],
  ["Wie heißt der Podcast von Ariana Grande? Spaß – wie heißt Arianas Rolle im Film „Wicked“?", "Glinda", "Elphaba", "Dorothy", "Nessarose"],
  ["Welche Sängerin spielt Elphaba in „Wicked“ (2024)?", "Cynthia Erivo", "Ariana Grande", "Lady Gaga", "Zendaya"],
  ["Wie heißt der YouTuber, der mit „Squid Game in Real Life“ einen Rekord aufstellte?", "MrBeast", "PewDiePie", "Logan Paul", "Markiplier"],
  ["Welche Social-Media-App hat eine Uhr-Taste „Zeit für BeReal“? Gemeint ist: Welche App postet nur einmal am Tag gleichzeitig?", "BeReal", "Snapchat", "Instagram", "Threads"],
  ["Was ist ein „Influencer“?", "Jemand, der online Meinungen & Trends prägt", "Ein Virus", "Ein Computerteil", "Ein Grippe-Typ"],
  ["Welche Serie handelt von Wednesday Addams an der Nevermore Academy?", "Wednesday", "Stranger Things", "Riverdale", "Sabrina"],
  ["Wer spielt Wednesday in der Netflix-Serie?", "Jenna Ortega", "Millie Bobby Brown", "Zendaya", "Sadie Sink"],
  ["Wie heißt die Schauspielerin von Eleven in „Stranger Things“?", "Millie Bobby Brown", "Jenna Ortega", "Sadie Sink", "Natalia Dyer"],
  ["Welcher Rapper ist für „Roller“ und „200 km/h“ bekannt?", "Apache 207", "Capital Bra", "Bonez MC", "Luciano"],
]);
Q.mc.social = Q.mc.social.map(q => q[0].startsWith('Wie heißt der Podcast von Ariana Grande') ? ["Welche Rolle spielt Ariana Grande im Film „Wicked“?", "Glinda", "Elphaba", "Dorothy", "Nessarose"]
  : q[0].startsWith('Welche Social-Media-App hat eine Uhr-Taste') ? ["Bei welcher App posten alle Nutzer einmal täglich gleichzeitig ein Foto?", "BeReal", "Snapchat", "Instagram", "Threads"] : q);

add('technik', [
  ["Wofür steht „URL“?", "Uniform Resource Locator", "Universal Read Link", "User Response Line", "Unique Router Label"],
  ["Was bedeutet „Cloud“ in der IT?", "Daten/Dienste auf Servern im Internet", "Ein Wetterdienst", "Ein USB-Stick", "Ein Grafikfilter"],
  ["Was ist ein „Update“?", "Eine Aktualisierung von Software", "Ein neues Handy", "Ein Backup", "Ein Virus"],
  ["Was ist ein „Backup“?", "Eine Sicherheitskopie von Daten", "Ein Zweithandy", "Ein Ersatzakku", "Ein Fehler"],
  ["Was bedeutet „2FA“?", "Zwei-Faktor-Authentifizierung", "Zweite Firmware-Ausgabe", "Zwei Festplatten-Archive", "2-Fach-Akku"],
  ["Welche Firma baut den Prozessor „M1“?", "Apple", "Intel", "AMD", "Samsung"],
  ["Was ist eine „Powerbank“?", "Ein mobiler Zusatzakku", "Ein Bankkonto", "Ein Netzteil für Steckdosen", "Ein Stromzähler"],
  ["Was macht ein Wasserkocher, wenn das Wasser kocht?", "Er schaltet sich automatisch ab", "Er pfeift immer", "Er kühlt das Wasser", "Er zeigt die Uhrzeit"],
  ["Was gehört NICHT in den Gelben Sack?", "Glasflaschen", "Joghurtbecher", "Konservendosen", "Plastikfolie"],
  ["Wohin gehören alte Batterien?", "In Sammelbehälter im Handel", "In den Restmüll", "In den Gelben Sack", "In die Biotonne"],
  ["Welche Mülltonne ist für Papier?", "Blau", "Gelb", "Braun", "Grau"],
  ["Was ist ein „Toaster“?", "Ein Gerät zum Rösten von Brot", "Ein Trinkspruch-Gerät", "Ein Wasserfilter", "Ein Küchenmesser"],
  ["Was misst ein Hygrometer?", "Luftfeuchtigkeit", "Temperatur", "Luftdruck", "Windstärke"],
  ["Was misst ein Barometer?", "Luftdruck", "Luftfeuchtigkeit", "Lautstärke", "Strom"],
  ["Welche Taste macht auf dem Handy-Screenshot meist: Power +…?", "Leiser", "Lauter", "Home", "Kamera"],
  ["Welches Gerät erfand Alexander Fleming? Spaß – was entdeckte er?", "Penicillin", "Insulin", "Aspirin", "Röntgenstrahlen"],
  ["Wer entdeckte die Röntgenstrahlen?", "Wilhelm Conrad Röntgen", "Albert Einstein", "Max Planck", "Robert Koch"],
  ["Wer entwickelte die Relativitätstheorie?", "Albert Einstein", "Isaac Newton", "Stephen Hawking", "Niels Bohr"],
]);
Q.mc.technik = Q.mc.technik.map(q => q[0].startsWith('Welches Gerät erfand Alexander Fleming') ? ["Was entdeckte Alexander Fleming 1928?", "Penicillin", "Insulin", "Aspirin", "Röntgenstrahlen"]
  : q[0].startsWith('Welche Taste macht auf dem Handy-Screenshot') ? ["Mit welcher Tastenkombination macht man auf vielen Android-Handys einen Screenshot?", "Power + Leiser", "Power + Lauter", "Lauter + Leiser", "Nur Power"] : q);

add('trash', [
  ["Wie heißt die Show, in der Paare Challenges bestehen und im Haus leben – mit Promi-Paaren?", "Das Sommerhaus der Stars", "Promi Big Brother", "Love Island", "Der Bachelor"],
  ["Welche Sängerin wurde durch „Germany's Next Topmodel“ 2016? Quatsch – wer gewann GNTM 2016?", "Kim Hnizdo", "Stefanie Giesinger", "Céline Bethmann", "Lena Gercke"],
  ["Welcher Promi-Koch moderiert „Grill den Henssler“?", "Steffen Henssler", "Tim Mälzer", "Johann Lafer", "Frank Rosin"],
  ["Wer rettet in „Rosins Restaurants“ Lokale?", "Frank Rosin", "Christian Rach", "Tim Mälzer", "Steffen Henssler"],
  ["Wie heißt die Show, in der man Häuser renoviert und „Zuhause im Glück“?", "Zuhause im Glück", "Mieten, kaufen, wohnen", "Shopping Queen", "Wohnen nach Wunsch"],
  ["Welche Show zeigt Hochzeitskleid-Shopping mit „Ja zum Kleid“-Moment?", "Zwischen Tüll und Tränen", "Shopping Queen", "Brautalarm", "Say Yes"],
  ["Was gewinnt man bei „Promi Big Brother“ neben dem Titel?", "Ein Preisgeld", "Ein Auto", "Eine Reise", "Einen Plattenvertrag"],
  ["Welche TV-Brüder betrieben einen Autoteile-Schrottplatz im Westerwald?", "Die Ludolfs", "Die Geissens", "Die Wollnys", "Die Reimanns"],
  ["Welche Familie wanderte nach Hawaii aus (Konny & Manu)?", "Die Reimanns", "Die Geissens", "Die Ludolfs", "Die Wollnys"],
  ["In welcher Show wird nach dem „Supertalent“ gesucht?", "Das Supertalent", "DSDS", "The Voice", "Popstars"],
  ["Welche Jury-Legende sitzt seit Jahren beim „Supertalent“?", "Dieter Bohlen", "Heidi Klum", "Joachim Llambi", "Bruce Darnell"],
  ["Was sagt Bruce Darnell oft?", "„Drama, Baby!“", "„Ich bin raus!“", "„Roooobert!“", "„Läuft bei dir!“"],
  ["Wer moderiert „Ninja Warrior Germany“?", "Jan Köppen & Laura Wontorra", "Daniel Hartwich & Sonja Zietlow", "Joko & Klaas", "Elton & Nazan Eckes"],
  ["In welcher Show stehen 30 Singles hinter Pulten mit Lichtern?", "Take Me Out", "Der Bachelor", "First Dates", "Love Island"],
  ["Wie heißt der Restaurant-Dating-Klassiker auf VOX?", "First Dates", "Das perfekte Dinner", "Kitchen Impossible", "Love Is Blind"],
  ["Was ist bei „Bauer sucht Frau“ die „Hofwoche“?", "Die Kandidatin lebt eine Woche auf dem Hof", "Ein Erntefest", "Eine Kochshow-Woche", "Der Urlaub danach"],
]);
Q.mc.trash = Q.mc.trash.map(q => q[0].startsWith('Welche Sängerin wurde durch') ? ["Wer gewann „Germany's Next Topmodel“ 2014?", "Stefanie Giesinger", "Kim Hnizdo", "Lena Gercke", "Céline Bethmann"] : q);

add('wtf', [
  ["Wie viele Hirne hat ein Blutegel ungefähr (Nervenknoten)?", "32", "1", "5", "100"],
  ["Welches Tier kann bis zu 3 Jahre ohne Wasser auskommen? Gemeint: Welches Tier trinkt so gut wie nie?", "Känguru-Ratte", "Kamel", "Elefant", "Koala"],
  ["Welche Farbe hat ein Flamingo-Ei?", "Weiß", "Rosa", "Blau", "Grün"],
  ["Wie viele Tasten hat eine Standard-Computermaus (klassisch)?", "2 bis 3", "10", "1", "6"],
  ["Was wurde zuerst erfunden: das Feuerzeug oder das Streichholz?", "Das Feuerzeug", "Das Streichholz", "Beide gleichzeitig", "Keins von beiden"],
  ["Woran erkennt man ein Pferd-Alter?", "An den Zähnen", "An den Hufen", "Am Schweif", "An den Ohren"],
  ["Welches Tier hat die meisten Zähne?", "Schnecke", "Hai", "Krokodil", "Delfin"],
  ["Wie heißt die Angst vor Höhe?", "Akrophobie", "Arachnophobie", "Agoraphobie", "Aquaphobie"],
  ["Wie heißt die Angst vor engen Räumen?", "Klaustrophobie", "Akrophobie", "Xenophobie", "Nyktophobie"],
  ["Woraus wird Marzipan gemacht?", "Mandeln & Zucker", "Erdnüssen", "Kartoffeln", "Kokos"],
  ["Welches Land isst pro Kopf am meisten Schokolade?", "Schweiz", "USA", "Belgien", "Frankreich"],
  ["Wie viele Tage braucht der Mond für eine Erdumrundung ungefähr?", "ca. 27 Tage", "ca. 7 Tage", "ca. 365 Tage", "ca. 2 Tage"],
  ["Welcher Planet hat die meisten bekannten Monde (Stand 2025)?", "Saturn", "Jupiter", "Mars", "Erde"],
  ["Was ist ein „Bilderrätsel“ mit Wörtern auch genannt?", "Rebus", "Sudoku", "Anagramm", "Palindrom"],
  ["Was ist ein Palindrom?", "Ein Wort, das vorwärts & rückwärts gleich ist", "Ein Reim", "Ein Zungenbrecher", "Ein Fremdwort"],
  ["Welches Wort ist ein Palindrom?", "Otto", "Anna-Lena", "Hund", "Haus"],
  ["Wie nennt man ein Wort aus umgestellten Buchstaben eines anderen?", "Anagramm", "Palindrom", "Synonym", "Akronym"],
]);
Q.mc.wtf = Q.mc.wtf.map(q => q[0].startsWith('Welches Tier kann bis zu 3 Jahre ohne Wasser') ? ["Welches Wüstentier muss praktisch nie trinken?", "Känguru-Ratte", "Kamel", "Elefant", "Koala"]
  : q[0].startsWith('Woran erkennt man ein Pferd-Alter') ? ["Woran kann man das Alter eines Pferdes schätzen?", "An den Zähnen", "An den Hufen", "Am Schweif", "An den Ohren"] : q);
// Fragen, deren Antwort umstritten ist, wieder entfernen
Q.mc.wtf = Q.mc.wtf.filter(q => !q[0].startsWith('Wie viele Tasten hat eine Standard-Computermaus') && !q[0].startsWith('Welche Farbe hat ein Flamingo-Ei'));

add('frau', [
  ["Was ist ein „Maxikleid“?", "Ein bodenlanges Kleid", "Ein Minikleid", "Ein Hosenanzug", "Ein Bikini"],
  ["Was ist „Kajal“? Gemeint: Wofür ist ein Lipliner?", "Lippenkontur", "Augenbrauen", "Wimpern", "Nägel"],
  ["Was ist ein „Chignon“?", "Ein tief gesteckter Haarknoten", "Ein Schal", "Ein Hut", "Eine Handtasche"],
  ["Welche Designerin ist für Wickelkleider berühmt?", "Diane von Fürstenberg", "Coco Chanel", "Vivienne Westwood", "Jil Sander"],
  ["Welche deutsche Designerin steht für puristische Mode?", "Jil Sander", "Donatella Versace", "Stella McCartney", "Miuccia Prada"],
  ["Welche Sängerin heißt mit Vornamen Adele Laurie Blue?", "Adele", "Dua Lipa", "Lana Del Rey", "Duffy"],
  ["Wer ist die „Queen of Rock 'n' Roll“?", "Tina Turner", "Cher", "Janis Joplin", "Pink"],
  ["Welche Sportlerin ist eine der erfolgreichsten Turnerinnen aller Zeiten?", "Simone Biles", "Serena Williams", "Steffi Graf", "Katarina Witt"],
  ["Welche deutsche Eiskunstläuferin gewann zweimal Olympia-Gold?", "Katarina Witt", "Aljona Savchenko", "Tanja Szewczenko", "Marina Kielmann"],
  ["Welche Physikerin war Bundeskanzlerin?", "Angela Merkel", "Annette Schavan", "Ursula von der Leyen", "Malu Dreyer"],
  ["Was ist eine „Hebamme“?", "Geburtshelferin", "Kinderärztin", "Krankenschwester im OP", "Apothekerin"],
  ["Was ist „Hyaluron“ in Kosmetik?", "Ein feuchtigkeitsbindender Stoff", "Ein Duftstoff", "Ein Farbstoff", "Ein Sonnenschutzfilter"],
  ["Was ist ein „Cat-Eye“-Look?", "Lidstrich, der nach außen geschwungen ist", "Grüne Kontaktlinsen", "Katzenohren-Haarreif", "Ein Nageldesign"],
  ["Welche Märchenfigur verliert einen gläsernen Schuh?", "Aschenputtel", "Schneewittchen", "Dornröschen", "Rapunzel"],
  ["Welche Märchenfigur lässt ihr langes Haar herunter?", "Rapunzel", "Aschenputtel", "Rotkäppchen", "Frau Holle"],
]);
Q.mc.frau = Q.mc.frau.map(q => q[0].startsWith('Was ist „Kajal“? Gemeint') ? ["Wofür benutzt man einen Lipliner?", "Für die Lippenkontur", "Für die Augenbrauen", "Für die Wimpern", "Für die Nägel"] : q);

add('mann', [
  ["Was ist ein „Grillmeister“-Klassiker: Wie lange sollte ein Steak nach dem Grillen ruhen?", "Ein paar Minuten", "Eine Stunde", "Gar nicht", "Über Nacht"],
  ["Was ist ein „Chimney Starter“?", "Ein Anzündkamin für Grillkohle", "Ein Kaminofen", "Ein Feuerlöscher", "Ein Gasgrill"],
  ["Was ist ein Schweißgerät für?", "Metall verbinden", "Holz schneiden", "Steine bohren", "Rohre biegen"],
  ["Was macht ein Dübel?", "Gibt Schrauben in der Wand Halt", "Misst Abstände", "Dichtet Fenster ab", "Schneidet Fliesen"],
  ["Welche Farbe hat in Deutschland meist die Phase (Strom) im Kabel?", "Braun oder Schwarz", "Grün-gelb", "Blau", "Weiß"],
  ["Welche Farbe hat der Schutzleiter im Kabel?", "Grün-gelb", "Blau", "Braun", "Rot"],
  ["Was ist ein „Cut“ beim Barbier?", "Ein Haarschnitt", "Ein Rasierfehler", "Ein Bart-Öl", "Ein Kamm"],
  ["Welche Rasur-Richtung schont die Haut meist?", "Mit dem Strich", "Gegen den Strich", "Kreuz und quer", "Kreisend"],
  ["Was ist ein „Old Fashioned“?", "Ein Whiskey-Cocktail", "Ein Anzugstil", "Ein Bartstil", "Ein Oldtimer"],
  ["Woraus wird Gin hauptsächlich aromatisiert?", "Wacholder", "Anis", "Kirschen", "Kaffee"],
  ["Welcher Schauspieler spielte „Indiana Jones“?", "Harrison Ford", "Tom Hanks", "Kevin Costner", "Mel Gibson"],
  ["In welchem Film spielt Leonardo DiCaprio einen Börsenmakler?", "The Wolf of Wall Street", "Titanic", "Inception", "Catch Me If You Can"],
  ["Welcher Film handelt von einem Fight Club?", "Fight Club", "Snatch", "Rocky", "Gladiator"],
  ["Wie heißt der Held in „Gladiator“?", "Maximus", "Spartacus", "Achilles", "Leonidas"],
  ["Welche Serie handelt von den Shelbys in Birmingham?", "Peaky Blinders", "The Sopranos", "Boardwalk Empire", "Sons of Anarchy"],
]);
Q.mc.mann = Q.mc.mann.map(q => q[0].startsWith('Was ist ein „Grillmeister“-Klassiker') ? ["Wie lange sollte ein Steak nach dem Grillen ruhen?", "Ein paar Minuten", "Eine Stunde", "Gar nicht", "Über Nacht"] : q);

Q.tf = Q.tf.concat([
  ["Frankreich wurde 2018 Fußball-Weltmeister.", true], ["Miroslav Klose ist WM-Rekordtorschütze.", true], ["Dirk Nowitzki spielte für die Chicago Bulls.", false],
  ["Ein Zehnkampf hat 10 Disziplinen.", true], ["Opel hat einen Löwen im Logo.", false], ["Peugeot hat einen Löwen im Logo.", true],
  ["Penicillin wurde von Alexander Fleming entdeckt.", true], ["Papier gehört in die gelbe Tonne.", false], ["Die Oder bildet einen Teil der Grenze zu Polen.", true],
  ["Der Ätna liegt auf Sizilien.", true], ["Lima ist die Hauptstadt von Peru.", true], ["Die Birke hat eine weiße Rinde.", true],
  ["Eine Biene hat zwei Flügel.", false], ["Der linke Lungenflügel ist kleiner als der rechte.", true], ["Hypertonie bedeutet niedriger Blutdruck.", false],
  ["Otto ist ein Palindrom.", true], ["Marzipan wird aus Mandeln gemacht.", true], ["Rapunzel verliert einen gläsernen Schuh.", false],
  ["Gin wird mit Wacholder aromatisiert.", true], ["Harrison Ford spielte Indiana Jones.", true],
]);

Q.est = Q.est.concat([
  ["Wie viele Tore schoss Miroslav Klose bei Weltmeisterschaften?", 16, "Tore"], ["Wie schwer ist ein erwachsenes Gehirn ungefähr?", 1350, "g"],
  ["Wie viele Tage braucht der Mond für eine Erdumrundung?", 27.3, "Tage"], ["Wie viele Felder hat ein Schachbrett?", 64, "Felder"],
  ["In welchem Jahr fand das „Sommermärchen“ (WM in Deutschland) statt?", 2006, ""], ["Wie viele Disziplinen hat ein Zehnkampf?", 10, ""],
  ["Wie viele Kilometer ist es von Berlin nach München (Luftlinie)?", 504, "km"], ["Wie viele Einwohner hat Frankfurt am Main (in Tausend)?", 775, "Tsd."],
  ["Wie hoch ist der Vesuv?", 1281, "m"], ["Wie hoch ist der Ätna ungefähr?", 3350, "m"], ["Wie viele Monde hat der Saturn ungefähr (Stand 2025)?", 274, "Monde"],
  ["In welchem Jahr wurde das Penicillin entdeckt?", 1928, ""], ["In welchem Jahr wurden die Röntgenstrahlen entdeckt?", 1895, ""],
  ["Wie viele Kilo Schokolade isst ein Schweizer pro Jahr ungefähr?", 11, "kg"], ["Wie viele Länder grenzen an Deutschland?", 9, "Länder"],
  ["Wie viele Stunden hat eine Woche?", 168, "Stunden"], ["Wie viele Minuten hat ein Tag?", 1440, "Minuten"], ["Wie viele Herzschläge macht ein Herz pro Minute in Ruhe (Durchschnitt)?", 70, "Schläge"],
]);
})();
