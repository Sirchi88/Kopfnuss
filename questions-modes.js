// KOPFNUSS – Inhalte für Gedankenleser, Bluffmeister, Emoji-Übersetzer, Kritzel-Kopf, Diskussion & Verliebt-Modus
(() => {
const Q = window.QUESTIONS;

// Gedankenleser: [Frage über {X} (für den Leser), dieselbe Frage in Du-Form (für {X}), Optionen]
Q.mind = [
  ["Welches Auto würde sich {X} nach einem Lottogewinn kaufen?", "Welches Auto würdest du dir nach einem Lottogewinn kaufen?", ["Porsche", "Ferrari", "Lamborghini", "Keins davon"]],
  ["Was würde {X} mit einer Million Euro als Erstes machen?", "Was würdest du mit einer Million Euro als Erstes machen?", ["Weltreise", "Haus kaufen", "Anlegen", "Alles verprassen"]],
  ["Was bestellt {X} beim Lieferdienst am ehesten?", "Was bestellst du beim Lieferdienst am ehesten?", ["Pizza", "Burger", "Sushi", "Asiatisch"]],
  ["Welche Superkraft hätte {X} am liebsten?", "Welche Superkraft hättest du am liebsten?", ["Fliegen", "Unsichtbar sein", "Gedanken lesen", "Zeitreisen"]],
  ["Wohin würde {X} sofort verreisen?", "Wohin würdest du sofort verreisen?", ["Malediven", "New York", "Japan", "Island"]],
  ["Was macht {X} morgens als Allererstes?", "Was machst du morgens als Allererstes?", ["Handy checken", "Kaffee", "Liegen bleiben", "Ab ins Bad"]],
  ["Welches Haustier hätte {X} am liebsten?", "Welches Haustier hättest du am liebsten?", ["Hund", "Katze", "Alpaka", "Gar keins"]],
  ["Welche Dschungelprüfung würde {X} am ehesten machen?", "Welche Dschungelprüfung würdest du am ehesten machen?", ["Kakerlaken essen", "Schlangengrube", "Unter Wasser", "Keine – sofort raus!"]],
  ["Was würde {X} in die Zombie-Apokalypse mitnehmen?", "Was würdest du in die Zombie-Apokalypse mitnehmen?", ["Ein Messer", "Schokolade", "Powerbank", "Klopapier"]],
  ["Welche Eissorte nimmt {X}?", "Welche Eissorte nimmst du?", ["Schoko", "Vanille", "Erdbeer", "Stracciatella"]],
  ["Welchen Job hätte {X} gern mal für einen Tag?", "Welchen Job hättest du gern mal für einen Tag?", ["Pilot*in", "Influencer*in", "Sternekoch/-köchin", "Bundeskanzler*in"]],
  ["Wie würde {X} spontan 100 € ausgeben?", "Wie würdest du spontan 100 € ausgeben?", ["Essen gehen", "Klamotten", "Sparen", "Technik"]],
  ["Was nervt {X} am meisten?", "Was nervt dich am meisten?", ["Langsames WLAN", "Schmatzen", "Unpünktlichkeit", "Montage"]],
  ["Welche Art Serie würde {X} sofort einschalten?", "Welche Art Serie würdest du sofort einschalten?", ["Krimi", "Comedy", "Reality-TV", "Fantasy"]],
  ["Wie trinkt {X} am liebsten Kaffee?", "Wie trinkst du am liebsten Kaffee?", ["Schwarz", "Mit Milch", "Cappuccino/Latte", "Gar nicht"]],
  ["Was wäre {X}s Henkersmahlzeit?", "Was wäre deine Henkersmahlzeit?", ["Pizza", "Burger", "Sushi", "Mamas Essen"]],
  ["In welcher Reality-Show würde {X} am ehesten landen?", "In welcher Reality-Show würdest du am ehesten landen?", ["Dschungelcamp", "Love Island", "Bauer sucht Frau", "Das perfekte Dinner"]],
  ["Welches Konzert würde {X} sofort besuchen?", "Welches Konzert würdest du sofort besuchen?", ["Rap", "Pop-Superstar", "Schlager", "Rock"]],
  ["Was würde {X} auf eine einsame Insel mitnehmen?", "Was würdest du auf eine einsame Insel mitnehmen?", ["Handy", "Messer", "Lieblingsmensch", "Ein Buch"]],
  ["Wie lange braucht {X} morgens im Bad?", "Wie lange brauchst du morgens im Bad?", ["5 Minuten", "15 Minuten", "30 Minuten", "Eine Ewigkeit"]],
  ["Welches Tier wäre {X}?", "Welches Tier wärst du?", ["Katze", "Faultier", "Hund", "Eichhörnchen"]],
  ["Was ist {X}s Lieblings-Snack beim Serienschauen?", "Was ist dein Lieblings-Snack beim Serienschauen?", ["Chips", "Schoki", "Popcorn", "Gummibärchen"]],
  ["Was macht {X}, wenn eine Spinne im Zimmer ist?", "Was machst du, wenn eine Spinne im Zimmer ist?", ["Kreischen", "Draufhauen", "Rausbringen", "Jemanden rufen"]],
  ["Wen würde {X} am liebsten mal treffen?", "Wen würdest du am liebsten mal treffen?", ["Einen Fußballstar", "Einen Hollywoodstar", "Einen YouTuber", "Einen Musiker"]],
  ["Was würde {X} tun, wenn {X} einen Tag unsichtbar wäre?", "Was würdest du tun, wenn du einen Tag unsichtbar wärst?", ["Leute erschrecken", "Gratis reisen", "Schlafen", "Spionieren"]],
  ["Welche Farbe trägt {X} am liebsten?", "Welche Farbe trägst du am liebsten?", ["Schwarz", "Weiß", "Bunt", "Blau"]],
  ["Wofür würde {X} nachts um 3 aufstehen?", "Wofür würdest du nachts um 3 aufstehen?", ["Pizza", "Sonnenaufgang", "Konzertkarten", "Für gar nichts!"]],
  ["Welche Sportart würde {X} am ehesten ausprobieren?", "Welche Sportart würdest du am ehesten ausprobieren?", ["Fallschirmspringen", "Yoga", "Boxen", "Golf"]],
  ["Wie feiert {X} am liebsten Geburtstag?", "Wie feierst du am liebsten Geburtstag?", ["Große Party", "Essen gehen", "Kurzurlaub", "Gar nicht"]],
  ["Was würde {X} als Kanzler*in als Erstes verbieten?", "Was würdest du als Kanzler*in als Erstes verbieten?", ["Montage", "Wecker", "Schlechtes WLAN", "Rosenkohl"]],
  ["Was würde {X} nach einem Lottogewinn mit dem Job machen?", "Was würdest du nach einem Lottogewinn mit deinem Job machen?", ["Sofort kündigen", "Weiterarbeiten", "Teilzeit", "Eigene Firma gründen"]],
  ["Was bestellt {X} in einer Bar?", "Was bestellst du in einer Bar?", ["Bier", "Wein", "Cocktail", "Wasser"]],
  ["Welche Uhrzeit ist für {X} die schlimmste?", "Welche Uhrzeit ist für dich die schlimmste?", ["5 Uhr morgens", "14 Uhr Mittagstief", "Montag 8 Uhr", "Mitternacht"]],
  ["Wofür gibt {X} beim Shoppen zu viel aus?", "Wofür gibst du beim Shoppen zu viel aus?", ["Schuhe", "Technik", "Snacks", "Deko"]],
  ["Was würde {X} zuerst retten, wenn es brennt?", "Was würdest du zuerst retten, wenn es brennt?", ["Handy", "Fotos", "Haustier", "Laptop"]],
  ["Welche Musik läuft bei {X} im Auto?", "Welche Musik läuft bei dir im Auto?", ["Rap", "Pop", "Schlager", "Rock"]],
  ["Wie schnell ist {X} nach einem Streit wieder gut?", "Wie schnell bist du nach einem Streit wieder gut?", ["Sofort", "Nach 1 Stunde", "Am nächsten Tag", "Nach dem Essen"]],
  ["Was wäre {X}s perfekter Sonntag?", "Was wäre dein perfekter Sonntag?", ["Ausschlafen", "Ausflug", "Netflix-Marathon", "Familie besuchen"]],
  ["Welche Disney-Figur wäre {X}?", "Welche Disney-Figur wärst du?", ["Simba", "Arielle", "Olaf", "Stitch"]],
  ["Welches Geräusch nervt {X} am meisten?", "Welches Geräusch nervt dich am meisten?", ["Schmatzen", "Schnarchen", "Wecker", "Kreide auf Tafel"]],
  ["Was macht {X} als Erstes im Urlaub?", "Was machst du als Erstes im Urlaub?", ["Ab an den Pool", "Essen gehen", "Erkunden", "Schlafen"]],
  ["Was würde {X} nie im Leben essen?", "Was würdest du nie im Leben essen?", ["Insekten", "Leber", "Austern", "Rosenkohl"]],
  ["Welche Rolle hat {X} auf Partys?", "Welche Rolle hast du auf Partys?", ["DJ", "Tanzfläche", "Am Buffet", "Geht früh heim"]],
  ["Welcher Superheld wäre {X}?", "Welcher Superheld wärst du?", ["Batman", "Wonder Woman", "Spider-Man", "Hulk"]],
  ["Was ist {X}s größte Stärke?", "Was ist deine größte Stärke?", ["Humor", "Geduld", "Ehrgeiz", "Großes Herz"]],
];
// alte Du-Fragen weiterverwenden
for (const g of Q.guess || []) Q.mind.push([`Was antwortet {X} auf: „${g[0]}“`, g[0], g[1]]);

// Bluffmeister: [Frage, echte Antwort, Täuschung 1, Täuschung 2]
Q.bluff = [
  ["Warum haben Flamingos rosa Federn?", "Wegen der Farbstoffe in ihrer Nahrung", "Weil sie sich im roten Schlamm wälzen", "Weil ihr Blut durch die Haut scheint"],
  ["Warum haben Zebras Streifen?", "Die Streifen halten wohl Stechfliegen ab", "Damit Löwen schwindelig werden", "Zum Kühlen bei Mondlicht"],
  ["Woher hat der Hamburger seinen Namen?", "Von der Stadt Hamburg", "Von einem Koch namens Ham Burger", "Vom englischen „ham“ (Schinken)"],
  ["Warum sind Tomaten rot?", "Wegen des Farbstoffs Lycopin", "Weil sie viel Eisen speichern", "Wegen eines Sonnenbrands"],
  ["Wie heißt die Rinne zwischen Nase und Oberlippe fachlich?", "Philtrum", "Nasolabium", "Rhinoplex"],
  ["Woher kommt das Wort „Muskel“?", "Vom lateinischen Wort für „Mäuschen“", "Vom Wort „Muschel“", "Von einem griechischen Ringer"],
  ["Was war Coca-Cola ursprünglich?", "Ein Mittel gegen Kopfweh & Müdigkeit aus der Apotheke", "Ein Reinigungsmittel für Münzen", "Ein Kindergetränk aus Mexiko"],
  ["Wofür wurde Listerine ursprünglich verkauft?", "Als Desinfektionsmittel bei Operationen", "Als Haarwasser", "Als Hustensaft für Pferde"],
  ["Warum schmeckt Orangensaft nach dem Zähneputzen so eklig?", "Ein Stoff in der Zahnpasta blockiert die Süß-Rezeptoren", "Fluor reagiert mit Vitamin C zu Säure", "Die Minze betäubt die Zunge komplett"],
  ["Wie lange schläft eine Giraffe pro Tag?", "Nur etwa 30 Minuten bis 2 Stunden", "12 Stunden – im Stehen", "Gar nicht, sie döst nur"],
  ["Woraus wird die Gelatine in Gummibärchen meist gemacht?", "Aus Schweineschwarte", "Aus Algen", "Aus Kartoffelstärke"],
  ["Woher kommt der Name „Kiwi“?", "Von einem Vogel aus Neuseeland", "Maori für „haarige Kugel“", "Chinesisch für „Stachelbeere“"],
  ["Wonach ist Bluetooth benannt?", "Nach dem Wikingerkönig Harald Blauzahn", "Nach dem blauen Zahn des Erfinders", "Nach dem ersten blauen Headset"],
  ["Wodurch wurde der Klettverschluss inspiriert?", "Durch Kletten im Hundefell", "Durch Geckofüße", "Durch Raumanzüge der NASA"],
  ["Warum hat Emmentaler Löcher?", "Durch Gase von Bakterien bei der Reifung", "Weil Mäuse in der Käserei naschen", "Sie werden mit Stäben reingestochen"],
  ["Wie heißt die Angst vor Clowns?", "Coulrophobie", "Clownophobie", "Harlekinose"],
  ["Welche Farbe hat der Schweiß von Nilpferden?", "Rötlich – man nennt ihn „Blutschweiß“", "Hellblau", "Neongrün"],
  ["Warum sind Bananen krumm?", "Sie wachsen zum Licht nach oben", "Sie werden beim Transport gebogen", "Wegen ihres schweren Kerns"],
  ["Woher kommt der Notruf „Mayday“?", "Vom französischen „m'aidez“ (helft mir)", "Abkürzung für „Maximum Danger Day“", "Benannt nach dem 1. Mai"],
  ["Woher kommt das Wort „OK“?", "Scherzhafte Abkürzung von „oll korrect“", "Abkürzung für „ohne Komplikationen“", "Ein alter Funk-Code der Marine"],
  ["Woher kommt das „Kater“ im Muskelkater?", "Wohl vom Wort „Katarrh“ (Entzündung)", "Man bewegt sich wie eine steife Katze", "Nach einem Arzt namens Dr. Kater"],
  ["Wofür steht HARIBO?", "Hans Riegel Bonn", "Harte Riesen-Bonbons", "Hamburger Ritter-Bonbons"],
  ["Woher hat Adidas seinen Namen?", "Vom Gründer Adi Dassler", "„All Day I Dream About Sport“", "Vom „Adler-Distanz-Schuh“"],
  ["Warum leuchten Katzenaugen im Dunkeln?", "Eine spiegelnde Schicht hinter der Netzhaut", "Sie produzieren eigenes Licht", "Phosphor in der Tränenflüssigkeit"],
  ["Wie nennt man eine Gruppe Eulen auf Englisch?", "A parliament", "A wisdom", "A hoot"],
  ["Welche Farbe hatten Karotten ursprünglich oft?", "Lila", "Blau", "Schwarz-weiß gestreift"],
  ["Wofür wurden High Heels ursprünglich erfunden?", "Damit persische Reiter im Steigbügel Halt haben", "Damit kleine Könige größer wirken", "Gegen den Schlamm in Paris"],
  ["Worum stritten Pringles in Großbritannien vor Gericht?", "Ob sie überhaupt Kartoffelchips sind", "Um die Form der Dose", "Um den Schnurrbart im Logo"],
  ["Warum sind Schulbusse in den USA gelb?", "Gelb fällt besonders gut auf – auch im Augenwinkel", "Gelbe Farbe war am billigsten", "Wegen eines Gesetzes von Abraham Lincoln"],
  ["Wie lange dauerte der „Hundertjährige Krieg“?", "116 Jahre", "100 Jahre", "99 Jahre"],
  ["Was bedeutet „Smartphone-Daumen“ medizinisch?", "Eine Sehnenreizung durch zu viel Tippen", "Ein dickerer Daumen durch Training", "Ein Daumen, der Displays erwärmt"],
  ["Warum haben Golfbälle Dellen?", "Sie fliegen dadurch weiter", "Damit sie nicht wegrollen", "Damit sie leichter sind"],
  ["Was ist eine „Schnapszahl“?", "Eine Zahl aus lauter gleichen Ziffern", "Der Alkoholgehalt in Prozent", "Die Zahl der Schnäpse pro Runde"],
  ["Warum haben Jeans kleine Nieten an den Taschen?", "Damit die Taschen bei Goldgräbern nicht reißen", "Als Deko-Idee von Elvis", "Gegen Taschendiebe"],
  ["Wofür war die kleine Tasche in der Jeans-Fronttasche gedacht?", "Für Taschenuhren", "Für Kaugummi", "Für Kondome"],
  ["Woher kommt der Begriff „Bug“ für Computerfehler?", "Eine echte Motte steckte in einem Computer", "Abkürzung für „Big Unknown Glitch“", "Vom Geräusch kaputter Lüfter"],
  ["Warum ist der Himmel blau?", "Blaues Licht wird in der Luft am stärksten gestreut", "Er spiegelt das Meer", "Wegen des Ozons, das blau leuchtet"],
  ["Was ist „Petrichor“?", "Der Geruch von Regen auf trockener Erde", "Angst vor Steinen", "Ein griechischer Käse"],
];

// Emoji-Übersetzer: [Begriff, Typ]
Q.emoji = [
  ["Der König der Löwen", "Film"], ["Titanic", "Film"], ["Harry Potter", "Film"], ["Findet Nemo", "Film"], ["Star Wars", "Film"],
  ["Der Herr der Ringe", "Film"], ["Die Eiskönigin", "Film"], ["Spider-Man", "Film"], ["Jurassic Park", "Film"], ["Der weiße Hai", "Film"],
  ["Shrek", "Film"], ["Fluch der Karibik", "Film"], ["Barbie", "Film"], ["Toy Story", "Film"], ["Zurück in die Zukunft", "Film"],
  ["Ghostbusters", "Film"], ["E.T.", "Film"], ["Ice Age", "Film"], ["Cars", "Film"], ["Ratatouille", "Film"], ["Oben", "Film"],
  ["Avatar", "Film"], ["Batman", "Film"], ["Kevin – Allein zu Haus", "Film"], ["Die Schöne und das Biest", "Film"], ["Arielle, die Meerjungfrau", "Film"],
  ["Schneewittchen", "Film"], ["Fast & Furious", "Film"], ["Pinocchio", "Film"], ["Madagascar", "Film"],
  ["Ich verstehe nur Bahnhof", "Redewendung"], ["Tomaten auf den Augen haben", "Redewendung"], ["Da steppt der Bär", "Redewendung"],
  ["Schwein gehabt", "Redewendung"], ["Den Nagel auf den Kopf treffen", "Redewendung"], ["Die Katze im Sack kaufen", "Redewendung"],
  ["Ein Brett vorm Kopf haben", "Redewendung"], ["Auf Wolke sieben schweben", "Redewendung"], ["Mit dem falschen Fuß aufstehen", "Redewendung"],
  ["Das ist nicht mein Bier", "Redewendung"], ["Hummeln im Hintern haben", "Redewendung"], ["Alles in Butter", "Redewendung"],
  ["Jemandem einen Bären aufbinden", "Redewendung"], ["Die Kuh vom Eis holen", "Redewendung"], ["Zwei Fliegen mit einer Klappe schlagen", "Redewendung"],
  ["Das Haar in der Suppe suchen", "Redewendung"], ["Mit Kanonen auf Spatzen schießen", "Redewendung"], ["Ins Gras beißen", "Redewendung"],
  ["Montagmorgen", "Situation"], ["Das erste Date", "Situation"], ["Kater nach der Party", "Situation"], ["Stau auf der Autobahn", "Situation"],
  ["Urlaub am Strand", "Situation"], ["Weihnachten bei Oma", "Situation"], ["Beim Zahnarzt", "Situation"], ["Eine Hochzeit", "Situation"],
  ["Neujahrsvorsatz Fitnessstudio", "Situation"], ["Grillabend", "Situation"], ["Umzug", "Situation"], ["Regen im Urlaub", "Situation"],
  ["Verschlafen", "Situation"], ["Pizza um Mitternacht", "Situation"], ["Geburtstagsparty", "Situation"], ["Diät ab Montag", "Situation"],
  ["Skiurlaub", "Situation"], ["Handy-Akku bei 1 %", "Situation"], ["Spinne im Schlafzimmer", "Situation"], ["Oktoberfest", "Situation"],
];

// Kritzel-Kopf: Begriffe zum Zeichnen
Q.draw = [
  "Ein Pinguin im Urlaub", "Eine wütende Banane", "Oma auf dem Skateboard", "Ein Hai mit Sonnenbrille", "Ein fliegendes Schwein",
  "Ein Kaktus, der kuschelt", "Ein Schneemann in der Sauna", "Ein Hund im Anzug", "Eine Kuh auf dem Mond", "Ein Dino beim Zahnarzt",
  "Ein Einhorn im Stau", "Eine Giraffe mit Schal", "Ein Toaster mit Gefühlen", "Eine Pizza mit Beinen", "Ein Geist beim Yoga",
  "Ein Roboter beim Kochen", "Ein Elefant im Badeanzug", "Ein Hamster im Fitnessstudio", "Ein Vulkan, der niest", "Eine Schnecke mit Turbo",
  "Ein Igel mit Föhn", "Ein Alien beim Einkaufen", "Eine Katze als Königin", "Ein Burger mit Krone", "Ein weinender Kühlschrank",
  "Ein Baum mit Sonnenbrand", "Ein Fisch auf dem Fahrrad", "Ein Krokodil mit Zahnspange", "Ein Pirat mit Gummiente", "Ein Bär im Whirlpool",
  "Haus", "Fahrrad", "Sonne", "Brille", "Herz", "Schiff", "Gitarre", "Zahnbürste", "Regenschirm", "Kaffeetasse", "Rakete",
  "Leuchtturm", "Schneemann", "Krone", "Pilz", "Luftballon", "Schnecke", "Eis am Stiel", "Wolke mit Blitz", "Tannenbaum",
];

// Diskussionsfragen nach Pärchen-/Freundes-Runden
Q.talk = [
  "Erzählt euch ein konkretes Beispiel dafür! 😅", "Wann war das zuletzt so?", "Wer hat hier eigentlich recht? Diskutiert! 😏",
  "Was würde eure Familie dazu sagen?", "Ändern – oder genau so perfekt?", "Was ist die lustigste Geschichte dazu?",
  "Hättet ihr das voneinander gedacht?", "Was sagt das über euch aus? 😄", "Wer gibt zuerst zu, dass es stimmt?",
];
Q.talkLove = ["Was liebt ihr genau daran aneinander? 💞", "Wann ist dir das beim anderen zum ersten Mal aufgefallen?", "Würdet ihr das heute Abend mal ausprobieren? 😏"];

// Verliebt-Modus: etwas heißere Fragen (nur wenn „Verliebt“ aktiv ist)
Q.spicy = {
  who: [
    "… hat die wildere Fantasie im Schlafzimmer?", "… würde eher mitten am Tag verführen?", "… trägt öfter heimlich sexy Unterwäsche?",
    "… ist der/die bessere Verführer*in?", "… würde eher ein Rollenspiel vorschlagen?", "… wird bei schlüpfrigen Witzen schneller rot?",
    "… würde eher an einem verbotenen Ort knutschen?", "… schickt eher ein heißes Foto?", "… ist morgens die größere Kuschel-Rakete? 😏",
    "… würde eher in Unterwäsche die Tür aufmachen?", "… flüstert öfter Dinge ins Ohr, die man nicht laut sagt?", "… springt eher spontan mit unter die Dusche?",
    "… hat das bessere Massage-Händchen?", "… macht beim Ausziehen mehr Show?", "… würde eher heimlich in der Umkleidekabine knutschen?",
  ],
  mind: [
    ["Was findet {X} an dir am verführerischsten?", "Was findest du an deinem Schatz am verführerischsten?", ["Der Blick", "Die Lippen", "Die Stimme", "Der Po"]],
    ["Wo würde {X} am liebsten mal heimlich knutschen?", "Wo würdest du am liebsten mal heimlich knutschen?", ["Im Kino", "Im Fahrstuhl", "Nachts am Strand", "Im Auto"]],
    ["Was würde {X} beim romantischen Abend zuerst ausziehen?", "Was würdest du beim romantischen Abend zuerst ausziehen?", ["Die Schuhe", "Die Socken", "Das Oberteil", "Alles auf einmal 😏"]],
    ["Wann ist für {X} die beste Kuschelzeit?", "Wann ist für dich die beste Kuschelzeit?", ["Morgens", "Mittags", "Abends", "Nachts"]],
    ["Was macht {X} am meisten an?", "Was macht dich am meisten an?", ["Gutes Essen", "Komplimente", "Selbstbewusstsein", "Gutes Parfum"]],
    ["Welches Outfit findet {X} an dir am heißesten?", "Welches Outfit findest du an deinem Schatz am heißesten?", ["Schick", "Sportlich", "Unterwäsche", "Gar nichts 😏"]],
    ["Wie würde {X} den perfekten Abend zu zweit beenden?", "Wie würdest du den perfekten Abend zu zweit beenden?", ["Kuscheln & Film", "Massage", "Schaumbad", "Ihr wisst schon 😏"]],
    ["Was würde {X} eher mal ausprobieren?", "Was würdest du eher mal ausprobieren?", ["Rollenspiel", "Einen neuen Ort", "Kerzen & Massageöl", "Lieber alles wie immer"]],
    ["Welche Musik würde {X} für eine heiße Nacht auflegen?", "Welche Musik würdest du für eine heiße Nacht auflegen?", ["Kuschelrock", "R&B", "Gar keine", "Schlager 😂"]],
    ["Wo küsst {X} dich am liebsten?", "Wo küsst du deinen Schatz am liebsten?", ["Auf den Mund", "Auf den Hals", "Auf die Stirn", "Überall"]],
  ],
  free: [
    "Erfinde einen sexy Namen für eure Bettdecke.", "Was flüsterst du {P} ins Ohr, um sie/ihn rumzukriegen?",
    "Der unsexieste Satz, den man im Schlafzimmer sagen kann?", "Beschreibe den perfekten Verführungsabend in 5 Wörtern.",
    "Welcher Song läuft bei euch, wenn's heiß wird?", "Ein Kosename, der nur im Schlafzimmer erlaubt ist.",
    "Was steht auf {P}s Unterwäsche, wenn sie sprechen könnte?", "Erfinde einen Cocktail namens „Heiße Nacht“ – was ist drin?",
  ],
};
})();
