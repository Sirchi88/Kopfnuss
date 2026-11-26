// KOPFNUSS – Fragen-Paket 5: aus geprüften Faktenlisten erzeugt (Falschantworten aus derselben Liste)
(() => {
const Q = window.QUESTIONS;
const R = n => Math.floor(Math.random() * n);
const sh = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rows = s => s.trim().split('\n').map(l => l.split('|').map(x => x.trim())).filter(r => r.length > 1 && r[0]);
const seen = {};
for (const k in Q.mc) seen[k] = new Set(Q.mc[k].map(q => q[0].toLowerCase()));
// cat: Kategorie, list: Zeilen, ask: Frage-Text, a: Spalte der Antwort, group: optional Spalte für "gleiche Gruppe" bei Falschantworten
const FIX = [[/^Was ist (Pumps|Espadrilles|Kitten Heels|Peeptoes|Mules)\?/, 'Was sind $1?'], [/man (Multimeter|Cuttermesser)\?/, 'man ein $1?'], [/gehört die (Arterien|Venen|Bronchien|Lymphknoten)\?/, 'gehören die $1?'], ['ein Retinol?', 'Retinol?'], ['ein Picanha?', 'Picanha?']];
function gen(cat, list, ask, a = 1, group = -1) {
  Q.mc[cat] = Q.mc[cat] || []; seen[cat] = seen[cat] || new Set();
  const all = [...new Set(list.map(r => r[a]))];
  for (const r of list) {
    const text = FIX.reduce((t, [x, y]) => t.replace(x, y), ask(r)), ans = r[a];
    if (!text || seen[cat].has(text.toLowerCase())) continue;
    let pool = group >= 0 ? [...new Set(list.filter(x => x[group] === r[group]).map(x => x[a]))] : all;
    pool = pool.filter(x => x !== ans);
    if (pool.length < 3) pool = all.filter(x => x !== ans);
    if (pool.length < 3) continue;
    Q.mc[cat].push([text, ans, ...sh(pool).slice(0, 3)]);
    seen[cat].add(text.toLowerCase());
  }
}

/* ================= WELT & REISEN ================= */
const CITY = rows(`
Barcelona|Spanien
Sevilla|Spanien
Valencia|Spanien
Granada|Spanien
Málaga|Spanien
Porto|Portugal
Faro|Portugal
Mailand|Italien
Neapel|Italien
Florenz|Italien
Venedig|Italien
Turin|Italien
Verona|Italien
Bologna|Italien
Palermo|Italien
Marseille|Frankreich
Lyon|Frankreich
Nizza|Frankreich
Bordeaux|Frankreich
Straßburg|Frankreich
Genf|Schweiz
Zürich|Schweiz
Basel|Schweiz
Luzern|Schweiz
Salzburg|Österreich
Innsbruck|Österreich
Graz|Österreich
Linz|Österreich
Krakau|Polen
Danzig|Polen
Breslau|Polen
Brünn|Tschechien
Pilsen|Tschechien
Antwerpen|Belgien
Brügge|Belgien
Gent|Belgien
Rotterdam|Niederlande
Utrecht|Niederlande
Den Haag|Niederlande
Göteborg|Schweden
Malmö|Schweden
Bergen|Norwegen
Aarhus|Dänemark
Manchester|Vereinigtes Königreich
Liverpool|Vereinigtes Königreich
Glasgow|Vereinigtes Königreich
Cork|Irland
Thessaloniki|Griechenland
Izmir|Türkei
Antalya|Türkei
Split|Kroatien
Dubrovnik|Kroatien
Sankt Petersburg|Russland
Odessa|Ukraine
Marrakesch|Marokko
Casablanca|Marokko
Alexandria|Ägypten
Luxor|Ägypten
Kapstadt|Südafrika
Johannesburg|Südafrika
Mumbai|Indien
Bangalore|Indien
Kalkutta|Indien
Shanghai|China
Hongkong|China
Osaka|Japan
Kyoto|Japan
Busan|Südkorea
Phuket|Thailand
Chiang Mai|Thailand
Bali|Indonesien
Ho-Chi-Minh-Stadt|Vietnam
Sydney|Australien
Melbourne|Australien
Auckland|Neuseeland
Toronto|Kanada
Vancouver|Kanada
Montreal|Kanada
Chicago|USA
Miami|USA
Las Vegas|USA
San Francisco|USA
Seattle|USA
Cancún|Mexiko
Acapulco|Mexiko
Rio de Janeiro|Brasilien
São Paulo|Brasilien
Cusco|Peru
Medellín|Kolumbien
Havanna|Kuba
Punta Cana|Dominikanische Republik
Mekka|Saudi-Arabien
`);
gen('welt', CITY, r => `In welchem Land liegt ${r[0]}?`);

const SIGHT = rows(`
der Eiffelturm|Paris
der Louvre|Paris
der Arc de Triomphe|Paris
die Basilika Sacré-Cœur|Paris
der Trevi-Brunnen|Rom
die Alhambra|Granada
der Tower of London|London
die Westminster Abbey|London
das Brandenburger Tor|Berlin
der Reichstag|Berlin
die Frauenkirche|Dresden
der Zwinger|Dresden
das Holstentor|Lübeck
die Elbphilharmonie|Hamburg
das Hofbräuhaus|München
der Stephansdom|Wien
das Schloss Schönbrunn|Wien
der Prater|Wien
die Blaue Moschee|Istanbul
das Manneken Pis|Brüssel
die Kleine Meerjungfrau|Kopenhagen
das Empire State Building|New York
der Central Park|New York
der Hollywood-Schriftzug|Los Angeles
das Weiße Haus|Washington, D.C.
der CN Tower|Toronto
der Zuckerhut|Rio de Janeiro
die Verbotene Stadt|Peking
die Petronas Towers|Kuala Lumpur
das Marina Bay Sands|Singapur
der Tokyo Skytree|Tokio
der Kreml|Moskau
die Kettenbrücke|Budapest
die Rialtobrücke|Venedig
der Markusplatz|Venedig
die Ponte Vecchio|Florenz
die Mailänder Scala|Mailand
der Hollywood Walk of Fame|Los Angeles
die Space Needle|Seattle
das Alamo|San Antonio
der Gateway Arch|St. Louis
das Kolosseum|Rom
der Burj al Arab|Dubai
die Sixtinische Kapelle|Vatikanstadt
der Times Square|New York
das Guggenheim-Museum (mit Titanfassade)|Bilbao
die Christus-Erlöser-Statue|Rio de Janeiro
das Matterhorn-Dorf Zermatt mit Blick aufs Matterhorn|Schweiz
`).filter(r => !/Zermatt/.test(r[0]));
gen('welt', SIGHT, r => `In welcher Stadt findet man ${r[0]}?`);

const DISH = rows(`
Tapas|Spanien
Gazpacho|Spanien
Risotto|Italien
Tiramisu|Italien
Lasagne|Italien
Ratatouille|Frankreich
Crème brûlée|Frankreich
Bouillabaisse|Frankreich
Fish and Chips|Vereinigtes Königreich
Gulasch|Ungarn
Borschtsch|Ukraine
Moussaka|Griechenland
Gyros|Griechenland
Tzatziki|Griechenland
Baklava|Türkei
Sushi|Japan
Ramen|Japan
Tempura|Japan
Kimchi|Südkorea
Bibimbap|Südkorea
Pho|Vietnam
Pad Thai|Thailand
Butter Chicken|Indien
Tandoori-Hähnchen|Indien
Peking-Ente|China
Dim Sum|China
Tacos|Mexiko
Guacamole|Mexiko
Ceviche|Peru
Feijoada|Brasilien
Asado|Argentinien
Poutine|Kanada
Köttbullar|Schweden
Käsefondue|Schweiz
Rösti|Schweiz
Wiener Schnitzel|Österreich
Kaiserschmarrn|Österreich
Sachertorte|Österreich
Couscous|Marokko
Pierogi|Polen
Haggis|Vereinigtes Königreich
`);
gen('welt', DISH, r => `Aus welchem Land stammt das Gericht „${r[0]}“?`);

const MONEY = rows(`
China|Yuan (Renminbi)
Indien|Rupie
Russland|Rubel
USA|US-Dollar
Australien|Australischer Dollar
Mexiko|Peso
Brasilien|Real
Südafrika|Rand
Türkei|Lira
Polen|Złoty
Tschechien|Tschechische Krone
Dänemark|Dänische Krone
Schweden|Schwedische Krone
Norwegen|Norwegische Krone
Ungarn|Forint
Südkorea|Won
Thailand|Baht
Israel|Schekel
Saudi-Arabien|Riyal
Vereinigte Arabische Emirate|Dirham
Ägypten|Ägyptisches Pfund
Vietnam|Đồng
Indonesien|Rupiah
Kroatien|Euro
Rumänien|Leu
Island|Isländische Krone
Kanada|Kanadischer Dollar
Japan|Yen
`);
gen('welt', MONEY, r => `Mit welcher Währung bezahlt man in ${r[0] === 'USA' ? 'den USA' : r[0] === 'Vereinigte Arabische Emirate' ? 'den Vereinigten Arabischen Emiraten' : r[0]}?`);

const LANG = rows(`
Mexiko|Spanisch
Argentinien|Spanisch
Chile|Spanisch
Kuba|Spanisch
Österreich|Deutsch
Liechtenstein|Deutsch
Ägypten|Arabisch
Iran|Persisch
Israel|Hebräisch
Niederlande|Niederländisch
Dänemark|Dänisch
Ungarn|Ungarisch
Griechenland|Griechisch
Polen|Polnisch
Japan|Japanisch
Angola|Portugiesisch
Mosambik|Portugiesisch
Senegal|Französisch
Island|Isländisch
Brasilien|Portugiesisch
Türkei|Türkisch
Norwegen|Norwegisch
`);
const IN = { Iran: 'im Iran', Niederlande: 'in den Niederlanden', 'Türkei': 'in der Türkei', Senegal: 'im Senegal' };
gen('welt', LANG, r => `Welche Sprache ist Amtssprache ${IN[r[0]] || 'in ' + r[0]}?`);

/* ================= ERDKUNDE ================= */
const CAP = rows(`
Albanien|Tirana|Europa
Andorra|Andorra la Vella|Europa
Belarus|Minsk|Europa
Belgien|Brüssel|Europa
Bosnien und Herzegowina|Sarajevo|Europa
Bulgarien|Sofia|Europa
Dänemark|Kopenhagen|Europa
Estland|Tallinn|Europa
Finnland|Helsinki|Europa
Frankreich|Paris|Europa
Griechenland|Athen|Europa
Irland|Dublin|Europa
Island|Reykjavík|Europa
Italien|Rom|Europa
Kosovo|Pristina|Europa
Kroatien|Zagreb|Europa
Lettland|Riga|Europa
Liechtenstein|Vaduz|Europa
Litauen|Vilnius|Europa
Malta|Valletta|Europa
Moldau|Chișinău|Europa
Montenegro|Podgorica|Europa
Niederlande|Amsterdam|Europa
Nordmazedonien|Skopje|Europa
Norwegen|Oslo|Europa
Österreich|Wien|Europa
Polen|Warschau|Europa
Portugal|Lissabon|Europa
Rumänien|Bukarest|Europa
Russland|Moskau|Europa
Schweden|Stockholm|Europa
Serbien|Belgrad|Europa
Slowakei|Bratislava|Europa
Slowenien|Ljubljana|Europa
Spanien|Madrid|Europa
Tschechien|Prag|Europa
Ukraine|Kiew|Europa
Ungarn|Budapest|Europa
Vereinigtes Königreich|London|Europa
Zypern|Nikosia|Europa
Ägypten|Kairo|Afrika
Algerien|Algier|Afrika
Angola|Luanda|Afrika
Äthiopien|Addis Abeba|Afrika
Ghana|Accra|Afrika
Marokko|Rabat|Afrika
Mosambik|Maputo|Afrika
Namibia|Windhuk|Afrika
Nigeria|Abuja|Afrika
Senegal|Dakar|Afrika
Simbabwe|Harare|Afrika
Tunesien|Tunis|Afrika
Uganda|Kampala|Afrika
Sambia|Lusaka|Afrika
Libyen|Tripolis|Afrika
Sudan|Khartum|Afrika
Kamerun|Jaunde|Afrika
Madagaskar|Antananarivo|Afrika
Ruanda|Kigali|Afrika
Botswana|Gaborone|Afrika
Mali|Bamako|Afrika
Afghanistan|Kabul|Asien
Bangladesch|Dhaka|Asien
China|Peking|Asien
Irak|Bagdad|Asien
Iran|Teheran|Asien
Japan|Tokio|Asien
Jordanien|Amman|Asien
Kasachstan|Astana|Asien
Katar|Doha|Asien
Laos|Vientiane|Asien
Libanon|Beirut|Asien
Malaysia|Kuala Lumpur|Asien
Mongolei|Ulaanbaatar|Asien
Myanmar|Naypyidaw|Asien
Nepal|Kathmandu|Asien
Nordkorea|Pjöngjang|Asien
Pakistan|Islamabad|Asien
Philippinen|Manila|Asien
Saudi-Arabien|Riad|Asien
Syrien|Damaskus|Asien
Taiwan|Taipeh|Asien
Thailand|Bangkok|Asien
Usbekistan|Taschkent|Asien
Vereinigte Arabische Emirate|Abu Dhabi|Asien
Georgien|Tiflis|Asien
Armenien|Jerewan|Asien
Aserbaidschan|Baku|Asien
Kambodscha|Phnom Penh|Asien
Bhutan|Thimphu|Asien
Oman|Maskat|Asien
Chile|Santiago de Chile|Amerika
Ecuador|Quito|Amerika
Kolumbien|Bogotá|Amerika
Kuba|Havanna|Amerika
Panama|Panama-Stadt|Amerika
Paraguay|Asunción|Amerika
Uruguay|Montevideo|Amerika
Venezuela|Caracas|Amerika
Jamaika|Kingston|Amerika
Costa Rica|San José|Amerika
Guatemala|Guatemala-Stadt|Amerika
Honduras|Tegucigalpa|Amerika
Nicaragua|Managua|Amerika
Dominikanische Republik|Santo Domingo|Amerika
Haiti|Port-au-Prince|Amerika
Fidschi|Suva|Ozeanien
Papua-Neuguinea|Port Moresby|Ozeanien
`);
const art = c => ({ 'Vereinigtes Königreich': 'des Vereinigten Königreichs', 'Vereinigte Arabische Emirate': 'der Vereinigten Arabischen Emirate', 'Dominikanische Republik': 'der Dominikanischen Republik', 'Philippinen': 'der Philippinen', 'Niederlande': 'der Niederlande', 'Mongolei': 'der Mongolei', 'Slowakei': 'der Slowakei', 'Ukraine': 'der Ukraine', 'Schweiz': 'der Schweiz', 'Türkei': 'der Türkei', 'Elfenbeinküste': 'der Elfenbeinküste', 'Irak': 'des Irak', 'Iran': 'des Iran', 'Libanon': 'des Libanon', 'Sudan': 'des Sudan', 'Kosovo': 'des Kosovo', 'Tschechien': 'von Tschechien' }[c] || 'von ' + c);
gen('erdkunde', CAP, r => `Was ist die Hauptstadt ${art(r[0])}?`, 1, 2);
const CONT = rows(`
Äthiopien|Afrika
Ghana|Afrika
Namibia|Afrika
Madagaskar|Afrika
Mali|Afrika
Botswana|Afrika
Tunesien|Afrika
Ruanda|Afrika
Bangladesch|Asien
Laos|Asien
Nepal|Asien
Kasachstan|Asien
Mongolei|Asien
Usbekistan|Asien
Bhutan|Asien
Kambodscha|Asien
Jordanien|Asien
Oman|Asien
Ecuador|Südamerika
Paraguay|Südamerika
Uruguay|Südamerika
Bolivien|Südamerika
Venezuela|Südamerika
Kolumbien|Südamerika
Guyana|Südamerika
Suriname|Südamerika
Jamaika|Nordamerika
Costa Rica|Nordamerika
Honduras|Nordamerika
Nicaragua|Nordamerika
Panama|Nordamerika
Kuba|Nordamerika
Haiti|Nordamerika
Fidschi|Ozeanien
Samoa|Ozeanien
Tonga|Ozeanien
Vanuatu|Ozeanien
Papua-Neuguinea|Ozeanien
Estland|Europa
Lettland|Europa
Litauen|Europa
Slowenien|Europa
Montenegro|Europa
Moldau|Europa
Belarus|Europa
Albanien|Europa
`);
gen('erdkunde', CONT, r => `Auf welchem Kontinent liegt ${r[0]}?`);
const BL = rows(`
Nürnberg|Bayern
Augsburg|Bayern
Regensburg|Bayern
Würzburg|Bayern
Ingolstadt|Bayern
Bamberg|Bayern
Passau|Bayern
Karlsruhe|Baden-Württemberg
Mannheim|Baden-Württemberg
Freiburg im Breisgau|Baden-Württemberg
Heidelberg|Baden-Württemberg
Ulm|Baden-Württemberg
Tübingen|Baden-Württemberg
Konstanz|Baden-Württemberg
Frankfurt am Main|Hessen
Kassel|Hessen
Darmstadt|Hessen
Marburg|Hessen
Fulda|Hessen
Köln|Nordrhein-Westfalen
Dortmund|Nordrhein-Westfalen
Essen|Nordrhein-Westfalen
Bonn|Nordrhein-Westfalen
Münster|Nordrhein-Westfalen
Aachen|Nordrhein-Westfalen
Bielefeld|Nordrhein-Westfalen
Duisburg|Nordrhein-Westfalen
Wuppertal|Nordrhein-Westfalen
Gelsenkirchen|Nordrhein-Westfalen
Braunschweig|Niedersachsen
Osnabrück|Niedersachsen
Oldenburg|Niedersachsen
Göttingen|Niedersachsen
Wolfsburg|Niedersachsen
Lüneburg|Niedersachsen
Hildesheim|Niedersachsen
Lübeck|Schleswig-Holstein
Flensburg|Schleswig-Holstein
Neumünster|Schleswig-Holstein
Rostock|Mecklenburg-Vorpommern
Stralsund|Mecklenburg-Vorpommern
Greifswald|Mecklenburg-Vorpommern
Wismar|Mecklenburg-Vorpommern
Leipzig|Sachsen
Chemnitz|Sachsen
Zwickau|Sachsen
Görlitz|Sachsen
Meißen|Sachsen
Halle (Saale)|Sachsen-Anhalt
Dessau-Roßlau|Sachsen-Anhalt
Lutherstadt Wittenberg|Sachsen-Anhalt
Quedlinburg|Sachsen-Anhalt
Jena|Thüringen
Weimar|Thüringen
Gera|Thüringen
Eisenach|Thüringen
Cottbus|Brandenburg
Frankfurt (Oder)|Brandenburg
Brandenburg an der Havel|Brandenburg
Koblenz|Rheinland-Pfalz
Trier|Rheinland-Pfalz
Kaiserslautern|Rheinland-Pfalz
Ludwigshafen|Rheinland-Pfalz
Speyer|Rheinland-Pfalz
Saarlouis|Saarland
Bremerhaven|Bremen
`);
gen('erdkunde', BL, r => `In welchem Bundesland liegt ${r[0]}?`);

/* ================= TIERE & GARTEN ================= */
const CLS = rows(`
Delfin|Säugetier
Fledermaus|Säugetier
Wal|Säugetier
Igel|Säugetier
Maulwurf|Säugetier
Seehund|Säugetier
Schnabeltier|Säugetier
Känguru|Säugetier
Faultier|Säugetier
Nilpferd|Säugetier
Pinguin|Vogel
Strauß|Vogel
Kiwi|Vogel
Kolibri|Vogel
Eule|Vogel
Flamingo|Vogel
Specht|Vogel
Papagei|Vogel
Krokodil|Reptil
Schildkröte|Reptil
Eidechse|Reptil
Chamäleon|Reptil
Gecko|Reptil
Blindschleiche|Reptil
Kreuzotter|Reptil
Komodowaran|Reptil
Frosch|Amphibie
Kröte|Amphibie
Salamander|Amphibie
Molch|Amphibie
Axolotl|Amphibie
Hai|Fisch
Seepferdchen|Fisch
Aal|Fisch
Forelle|Fisch
Rochen|Fisch
Clownfisch|Fisch
Hering|Fisch
Marienkäfer|Insekt
Libelle|Insekt
Ameise|Insekt
Hummel|Insekt
Grashüpfer|Insekt
Glühwürmchen|Insekt
Termite|Insekt
Skorpion|Spinnentier
Zecke|Spinnentier
Milbe|Spinnentier
Weberknecht|Spinnentier
Vogelspinne|Spinnentier
Schnecke|Weichtier
Tintenfisch|Weichtier
Muschel|Weichtier
Krake|Weichtier
`);
gen('natur', CLS, r => `Zu welcher Tiergruppe gehört ${/^(Igel|Strauß|Wal|Hai|Aal|Delfin|Gecko|Molch|Frosch|Salamander|Axolotl|Flamingo|Papagei|Pinguin|Kolibri|Specht|Kiwi|Maulwurf|Seehund|Hering|Rochen|Clownfisch|Skorpion|Krake|Tintenfisch|Weberknecht|Grashüpfer|Marienkäfer|Seepferdchen|Gecko|Komodowaran|Faultier|Schnabeltier|Känguru|Nilpferd|Krokodil|Chamäleon)$/.test(r[0]) ? 'der' : 'die'} ${r[0]}?`.replace('die Seepferdchen', 'das Seepferdchen').replace('der Faultier', 'das Faultier').replace('der Schnabeltier', 'das Schnabeltier').replace('der Känguru', 'das Känguru').replace('der Nilpferd', 'das Nilpferd').replace('der Krokodil', 'das Krokodil').replace('der Chamäleon', 'das Chamäleon').replace('der Seepferdchen', 'das Seepferdchen').replace('die Glühwürmchen', 'das Glühwürmchen').replace('der Axolotl', 'der Axolotl'));
const YOUNG = rows(`
Kuh|Kalb
Pferd|Fohlen
Schwein|Ferkel
Schaf|Lamm
Hund|Welpe
Ziege|Zicklein
Huhn|Küken
Reh|Kitz
Wildschwein|Frischling
Frosch|Kaulquappe
Bär|Bärenjunges
Katze|Kätzchen
Gans|Gössel
Ente|Entenküken
Hase|Junghase
Elefant|Elefantenkalb
Löwe|Löwenjunges
Schmetterling|Raupe
Fuchs|Welpe
`);
gen('natur', YOUNG.filter(r => !/Junges|junghase|Entenküken|Elefantenkalb/i.test(r[1])), r => `Wie nennt man das Jungtier vom ${r[0] === 'Ziege' ? 'der Ziege'.slice(4) : r[0]}?`.replace('vom Kuh', 'der Kuh').replace('vom Ziege', 'der Ziege').replace('vom Gans', 'der Gans').replace('vom Katze', 'der Katze').replace('vom Ente', 'der Ente'));
const MALE = rows(`
Huhn|Hahn
Rind|Stier
Pferd|Hengst
Hausschwein|Eber
Ziege|Bock
Schaf|Widder
Hund|Rüde
Katze|Kater
Ente|Erpel
Gans|Ganter
Wildschwein|Keiler
Kaninchen|Rammler
Reh|Rehbock
Truthuhn|Truthahn
Biene|Drohne
`);
gen('natur', MALE, r => `Wie heißt das männliche Tier ${['Ziege', 'Katze', 'Ente', 'Gans', 'Biene'].includes(r[0]) ? 'bei der ' + r[0] : 'beim ' + r[0]}?`);
const EAT = rows(`
Spargel|Spross
Kartoffel|Knolle
Karotte|Wurzel
Rhabarber|Blattstiel
Blumenkohl|Blütenstand
Brokkoli|Blütenstand
Spinat|Blatt
Kopfsalat|Blatt
Erbse|Samen
Radieschen|Wurzelknolle
Artischocke|Blütenknospe
Kohlrabi|Sprossknolle
Rote Bete|Wurzelknolle
Ingwer|Wurzelstock
Lauch|Blattscheiden
`);
gen('natur', EAT, r => `Welcher Pflanzenteil wird beim ${r[0]} gegessen?`.replace('beim Kartoffel', 'bei der Kartoffel').replace('beim Karotte', 'bei der Karotte').replace('beim Erbse', 'bei der Erbse').replace('beim Artischocke', 'bei der Artischocke').replace('beim Rote Bete', 'bei der Roten Bete'));
const HOME = rows(`
Fuchs|Bau
Adler|Horst
Eichhörnchen|Kobel
Biber|Biberburg
Honigbiene|Bienenstock
Dachs|Bau mit Kessel
Maulwurf|Gangsystem unter der Erde
Wespe|Papiernest
Ameise|Ameisenhaufen
Storch|Nest auf Dächern & Masten
`);
gen('natur', HOME, r => `Wie heißt bzw. wie sieht die Behausung von ${r[0] === 'Honigbiene' ? 'Honigbienen' : r[0] === 'Ameise' ? 'Ameisen' : r[0] === 'Wespe' ? 'Wespen' : r[0] + 'en'.replace(/en$/, '')} aus?`.replace(' von Fuchs', ' vom Fuchs').replace(' von Adler', ' vom Adler').replace(' von Eichhörnchen', ' vom Eichhörnchen').replace(' von Biber', ' vom Biber').replace(' von Dachs', ' vom Dachs').replace(' von Maulwurf', ' vom Maulwurf').replace(' von Storch', ' vom Storch'));
const SOUND = rows(`
Hund|bellt
Katze|miaut
Pferd|wiehert
Kuh|muht
Esel|iaht
Schaf|blökt
Ziege|meckert
Schwein|grunzt
Hahn|kräht
Löwe|brüllt
Wolf|heult
Frosch|quakt
Ente|schnattert
Taube|gurrt
Hirsch|röhrt
Elefant|trompetet
Schlange|zischt
Biene|summt
Grille|zirpt
`);
gen('natur', SOUND, r => `Welchen Laut macht ${['Katze', 'Kuh', 'Ziege', 'Ente', 'Taube', 'Schlange', 'Biene', 'Grille'].includes(r[0]) ? 'die' : r[0] === 'Pferd' || r[0] === 'Schaf' || r[0] === 'Schwein' ? 'das' : 'der'} ${r[0]}? Er/sie …`.replace(' Er/sie …', ''));
const DIET = rows(`
Kuh|Pflanzenfresser
Pferd|Pflanzenfresser
Giraffe|Pflanzenfresser
Elefant|Pflanzenfresser
Koala|Pflanzenfresser
Panda|Pflanzenfresser
Kaninchen|Pflanzenfresser
Nashorn|Pflanzenfresser
Zebra|Pflanzenfresser
Löwe|Fleischfresser
Tiger|Fleischfresser
Wolf|Fleischfresser
Hai|Fleischfresser
Adler|Fleischfresser
Eisbär|Fleischfresser
Krokodil|Fleischfresser
Gepard|Fleischfresser
Schwein|Allesfresser
Braunbär|Allesfresser
Waschbär|Allesfresser
Ratte|Allesfresser
Krähe|Allesfresser
Wildschwein|Allesfresser
Mensch|Allesfresser
`);
gen('natur', DIET, r => `Ist ${['Giraffe', 'Kuh', 'Ratte', 'Krähe'].includes(r[0]) ? 'die' : ['Pferd', 'Kaninchen', 'Nashorn', 'Zebra', 'Krokodil', 'Schwein', 'Wildschwein'].includes(r[0]) ? 'das' : 'der'} ${r[0]} Pflanzen-, Fleisch- oder Allesfresser?`);

/* ================= KÖRPER & GESUNDHEIT ================= */
const ITIS = rows(`
Otitis|Ohrenentzündung
Gastritis|Magenschleimhautentzündung
Bronchitis|Entzündung der Bronchien
Arthritis|Gelenkentzündung
Dermatitis|Hautentzündung
Konjunktivitis|Bindehautentzündung
Tonsillitis|Mandelentzündung
Sinusitis|Nasennebenhöhlenentzündung
Hepatitis|Leberentzündung
Appendizitis|Blinddarmentzündung
Gingivitis|Zahnfleischentzündung
Laryngitis|Kehlkopfentzündung
Pharyngitis|Rachenentzündung
Zystitis|Blasenentzündung
Meningitis|Hirnhautentzündung
Tendinitis|Sehnenentzündung
Rhinitis|Schnupfen (Nasenschleimhautentzündung)
Pneumonie|Lungenentzündung
Myokarditis|Herzmuskelentzündung
Nephritis|Nierenentzündung
Migräne|Anfallsartiger starker Kopfschmerz
Tinnitus|Ohrgeräusche
Insomnie|Schlafstörung
Anämie|Blutarmut
Hypertonie|Bluthochdruck
Hypotonie|Niedriger Blutdruck
Diabetes|Zuckerkrankheit
Osteoporose|Knochenschwund
Skoliose|Seitliche Verkrümmung der Wirbelsäule
Myopie|Kurzsichtigkeit
Hyperopie|Weitsichtigkeit
Arrhythmie|Herzrhythmusstörung
Dysphagie|Schluckstörung
Halitosis|Mundgeruch
Alopezie|Haarausfall
`);
gen('koerper', ITIS, r => `Was bedeutet der Fachbegriff „${r[0]}“?`);
const DOC = rows(`
Dermatologe|Haut
Kardiologe|Herz
Neurologe|Nervensystem
Orthopäde|Knochen & Gelenke
Urologe|Harnwege & Niere
Gynäkologe|Frauenheilkunde
HNO-Arzt|Hals, Nase & Ohren
Augenarzt (Ophthalmologe)|Augen
Pädiater|Kinder
Onkologe|Krebs
Gastroenterologe|Magen & Darm
Nephrologe|Nieren
Pneumologe|Lunge
Endokrinologe|Hormone
Radiologe|Röntgen & Bildgebung
Anästhesist|Narkose
Psychiater|Seele & Psyche
Hämatologe|Blut
Rheumatologe|Rheuma
Allergologe|Allergien
Zahnarzt|Zähne
Geriater|Ältere Menschen
`);
gen('koerper', DOC, r => `Wofür ist ein ${r[0]} zuständig?`);
gen('koerper', DOC, r => `Welcher Facharzt kümmert sich um: ${r[1]}?`, 0);
const BONE = rows(`
Femur|Oberschenkelknochen
Tibia|Schienbein
Fibula|Wadenbein
Humerus|Oberarmknochen
Radius|Speiche
Ulna|Elle
Patella|Kniescheibe
Clavicula|Schlüsselbein
Scapula|Schulterblatt
Sternum|Brustbein
Mandibula|Unterkiefer
Cranium|Schädel
Pelvis|Becken
Calcaneus|Fersenbein
Costa|Rippe
Vertebra|Wirbel
Os coccygis|Steißbein
Phalanx|Finger- bzw. Zehenglied
`);
gen('koerper', BONE, r => `Welcher Knochen heißt lateinisch „${r[0]}“?`);
gen('koerper', BONE, r => `Welcher lateinische Name gehört zu: ${r[1]}?`, 0);
const SYS = rows(`
Herz|Herz-Kreislauf-System
Arterien|Herz-Kreislauf-System
Venen|Herz-Kreislauf-System
Lunge|Atmungssystem
Luftröhre|Atmungssystem
Bronchien|Atmungssystem
Magen|Verdauungssystem
Dünndarm|Verdauungssystem
Leber|Verdauungssystem
Speiseröhre|Verdauungssystem
Niere|Harnsystem
Harnblase|Harnsystem
Harnleiter|Harnsystem
Gehirn|Nervensystem
Rückenmark|Nervensystem
Schilddrüse|Hormonsystem
Hypophyse|Hormonsystem
Nebenniere|Hormonsystem
Milz|Immunsystem
Lymphknoten|Immunsystem
Thymus|Immunsystem
`);
gen('koerper', SYS, r => `Zu welchem Organsystem gehört ${['Lunge', 'Luftröhre', 'Leber', 'Speiseröhre', 'Niere', 'Harnblase', 'Schilddrüse', 'Hypophyse', 'Nebenniere', 'Milz'].includes(r[0]) ? 'die' : ['Arterien', 'Venen', 'Bronchien', 'Lymphknoten'].includes(r[0]) ? 'die' : ['Herz', 'Gehirn', 'Rückenmark'].includes(r[0]) ? 'das' : 'der'} ${r[0]}?`);
const PRE = rows(`
Kardio-|Herz
Gastro-|Magen
Derma-|Haut
Neuro-|Nerven
Hepa-|Leber
Nephro-|Niere
Pulmo-|Lunge
Osteo-|Knochen
Ophthalmo-|Auge
Oto-|Ohr
Rhino-|Nase
Hämo-|Blut
Myo-|Muskel
Dento-|Zahn
Zerebro-|Gehirn
`);
gen('koerper', PRE, r => `Wofür steht die medizinische Vorsilbe „${r[0]}“?`);
const DEF = rows(`
Skorbut|Vitamin C
Rachitis|Vitamin D
Beriberi|Vitamin B1
Nachtblindheit|Vitamin A
Pellagra|Vitamin B3 (Niacin)
Perniziöse Anämie|Vitamin B12
`);
gen('koerper', DEF, r => `Ein Mangel an welchem Vitamin verursacht ${r[0]}?`);
const CNT = rows(`
Zähne beim Erwachsenen (mit Weisheitszähnen)|32
Rippen|24
Halswirbel|7
Lungenflügel|2
Nieren|2
Chromosomen (pro Körperzelle)|46
Gehörknöchelchen pro Ohr|3
Milchzähne bei Kindern|20
`);
gen('koerper', CNT, r => `Wie viele ${r[0]} hat ein Mensch?`);

/* ================= SPORT & MOTOR ================= */
const WM = rows(`
1930|Uruguay|Uruguay
1934|Italien|Italien
1938|Italien|Frankreich
1950|Uruguay|Brasilien
1954|Deutschland|Schweiz
1958|Brasilien|Schweden
1962|Brasilien|Chile
1966|England|England
1970|Brasilien|Mexiko
1974|Deutschland|Deutschland
1978|Argentinien|Argentinien
1982|Italien|Spanien
1986|Argentinien|Mexiko
1990|Deutschland|Italien
1994|Brasilien|USA
1998|Frankreich|Frankreich
2002|Brasilien|Südkorea & Japan
2006|Italien|Deutschland
2010|Spanien|Südafrika
2014|Deutschland|Brasilien
2018|Frankreich|Russland
2022|Argentinien|Katar
`);
gen('sport', WM, r => `Wer wurde ${r[0]} Fußball-Weltmeister?`);
gen('sport', WM, r => `Wo fand die Fußball-WM ${r[0]} statt?`, 2);
const EM = rows(`
1960|Sowjetunion
1964|Spanien
1968|Italien
1972|Deutschland
1976|Tschechoslowakei
1980|Deutschland
1984|Frankreich
1988|Niederlande
1992|Dänemark
1996|Deutschland
2000|Frankreich
2004|Griechenland
2008|Spanien
2012|Spanien
2016|Portugal
2021|Italien
2024|Spanien
`);
gen('sport', EM, r => `Wer wurde ${r[0] === '2021' ? '2021 (EM 2020)' : r[0]} Fußball-Europameister?`);
const OLY = rows(`
1896|Athen
1900|Paris
1908|London
1912|Stockholm
1920|Antwerpen
1924|Paris
1928|Amsterdam
1932|Los Angeles
1936|Berlin
1948|London
1952|Helsinki
1956|Melbourne
1960|Rom
1964|Tokio
1968|Mexiko-Stadt
1972|München
1976|Montreal
1980|Moskau
1984|Los Angeles
1988|Seoul
1992|Barcelona
1996|Atlanta
2000|Sydney
2004|Athen
2008|Peking
2012|London
2016|Rio de Janeiro
2021|Tokio
2024|Paris
`);
gen('sport', OLY, r => `Wo fanden die Olympischen Sommerspiele ${r[0]} statt?`);
const WIN = rows(`
1924|Chamonix
1928|St. Moritz
1932|Lake Placid
1936|Garmisch-Partenkirchen
1948|St. Moritz
1952|Oslo
1956|Cortina d'Ampezzo
1964|Innsbruck
1968|Grenoble
1972|Sapporo
1976|Innsbruck
1980|Lake Placid
1984|Sarajevo
1988|Calgary
1992|Albertville
1994|Lillehammer
1998|Nagano
2002|Salt Lake City
2006|Turin
2010|Vancouver
2014|Sotschi
2018|Pyeongchang
2022|Peking
2026|Mailand & Cortina d'Ampezzo
`);
gen('sport', WIN, r => `Wo fanden die Olympischen Winterspiele ${r[0]} statt?`);
const F1 = rows(`
1990|Ayrton Senna
1991|Ayrton Senna
1992|Nigel Mansell
1993|Alain Prost
1994|Michael Schumacher
1995|Michael Schumacher
1996|Damon Hill
1997|Jacques Villeneuve
1998|Mika Häkkinen
1999|Mika Häkkinen
2000|Michael Schumacher
2001|Michael Schumacher
2002|Michael Schumacher
2003|Michael Schumacher
2004|Michael Schumacher
2005|Fernando Alonso
2006|Fernando Alonso
2007|Kimi Räikkönen
2008|Lewis Hamilton
2009|Jenson Button
2010|Sebastian Vettel
2011|Sebastian Vettel
2012|Sebastian Vettel
2013|Sebastian Vettel
2014|Lewis Hamilton
2015|Lewis Hamilton
2016|Nico Rosberg
2017|Lewis Hamilton
2018|Lewis Hamilton
2019|Lewis Hamilton
2020|Lewis Hamilton
2021|Max Verstappen
2022|Max Verstappen
2023|Max Verstappen
2024|Max Verstappen
`);
gen('sport', F1, r => `Wer wurde ${r[0]} Formel-1-Weltmeister?`);
const CL = rows(`
2000|Real Madrid
2001|FC Bayern München
2002|Real Madrid
2003|AC Mailand
2004|FC Porto
2005|FC Liverpool
2006|FC Barcelona
2007|AC Mailand
2008|Manchester United
2009|FC Barcelona
2010|Inter Mailand
2011|FC Barcelona
2012|FC Chelsea
2013|FC Bayern München
2014|Real Madrid
2015|FC Barcelona
2016|Real Madrid
2017|Real Madrid
2018|Real Madrid
2019|FC Liverpool
2020|FC Bayern München
2021|FC Chelsea
2022|Real Madrid
2023|Manchester City
2024|Real Madrid
2025|Paris Saint-Germain
`);
gen('sport', CL, r => `Wer gewann ${r[0]} die Champions League?`);
const CAR = rows(`
BMW|Deutschland
Opel|Deutschland
Ford|USA
Chevrolet|USA
Tesla|USA
Jeep|USA
Cadillac|USA
Dodge|USA
Toyota|Japan
Honda|Japan
Nissan|Japan
Mazda|Japan
Subaru|Japan
Suzuki|Japan
Mitsubishi|Japan
Lexus|Japan
Hyundai|Südkorea
Fiat|Italien
Lamborghini|Italien
Maserati|Italien
Alfa Romeo|Italien
Renault|Frankreich
Peugeot|Frankreich
Citroën|Frankreich
Saab|Schweden
Jaguar|Großbritannien
Land Rover|Großbritannien
Aston Martin|Großbritannien
Rolls-Royce|Großbritannien
Bentley|Großbritannien
McLaren|Großbritannien
BYD|China
`);
gen('sport', CAR, r => `Aus welchem Land stammt die Automarke ${r[0]} ursprünglich?`);

/* ================= SOCIAL & STARS ================= */
const SONG = rows(`
Shape of You|Ed Sheeran
Perfect|Ed Sheeran
Bad Habits|Ed Sheeran
Blinding Lights|The Weeknd
Rolling in the Deep|Adele
Someone Like You|Adele
Hello|Adele
Uptown Funk|Mark Ronson & Bruno Mars
Despacito|Luis Fonsi
Gangnam Style|Psy
Happy|Pharrell Williams
Shake It Off|Taylor Swift
Anti-Hero|Taylor Swift
Cruel Summer|Taylor Swift
Bad Romance|Lady Gaga
Poker Face|Lady Gaga
Umbrella|Rihanna
Diamonds|Rihanna
Single Ladies|Beyoncé
Halo|Beyoncé
Thriller|Michael Jackson
Billie Jean|Michael Jackson
Like a Prayer|Madonna
…Baby One More Time|Britney Spears
Toxic|Britney Spears
Wannabe|Spice Girls
I Will Always Love You|Whitney Houston
Bohemian Rhapsody|Queen
We Will Rock You|Queen
Imagine|John Lennon
Hey Jude|The Beatles
Yesterday|The Beatles
Smells Like Teen Spirit|Nirvana
Wonderwall|Oasis
Africa|Toto
Take On Me|a-ha
Dancing Queen|ABBA
Waterloo|ABBA
Livin' la Vida Loca|Ricky Martin
Hips Don't Lie|Shakira
Waka Waka|Shakira
Levitating|Dua Lipa
Don't Start Now|Dua Lipa
Wrecking Ball|Miley Cyrus
drivers license|Olivia Rodrigo
As It Was|Harry Styles
Watermelon Sugar|Harry Styles
Baby|Justin Bieber
Sorry|Justin Bieber
Firework|Katy Perry
Roar|Katy Perry
Call Me Maybe|Carly Rae Jepsen
Viva la Vida|Coldplay
Yellow|Coldplay
In the End|Linkin Park
Numb|Linkin Park
Mr. Brightside|The Killers
Seven Nation Army|The White Stripes
Highway to Hell|AC/DC
Sweet Child o' Mine|Guns N' Roses
Lose Yourself|Eminem
Without Me|Eminem
Old Town Road|Lil Nas X
Rockstar|Post Malone
Havana|Camila Cabello
thank u, next|Ariana Grande
7 rings|Ariana Grande
Espresso|Sabrina Carpenter
Get Lucky|Daft Punk
Chandelier|Sia
Cheap Thrills|Sia
Wake Me Up|Avicii
Levels|Avicii
Believer|Imagine Dragons
Radioactive|Imagine Dragons
Counting Stars|OneRepublic
Somebody That I Used to Know|Gotye
Dance Monkey|Tones and I
Purple Rain|Prince
Satisfaction|The Rolling Stones
Atemlos durch die Nacht|Helene Fischer
99 Luftballons|Nena
Major Tom (völlig losgelöst)|Peter Schilling
Skandal im Sperrbezirk|Spider Murphy Gang
Ein Kompliment|Sportfreunde Stiller
Applaus, Applaus|Sportfreunde Stiller
Tage wie diese|Die Toten Hosen
Männer|Herbert Grönemeyer
Mensch|Herbert Grönemeyer
Flugzeuge im Bauch|Herbert Grönemeyer
Haus am See|Peter Fox
Schwarz zu Blau|Peter Fox
Lieblingsmensch|Namika
Auf uns|Andreas Bourani
Durch den Monsun|Tokio Hotel
Symphonie|Silbermond
Junge|Die Ärzte
Schrei nach Liebe|Die Ärzte
Hulapalu|Andreas Gabalier
Verdammt, ich lieb' dich|Matthias Reim
Roller|Apache 207
Komet|Udo Lindenberg & Apache 207
Sonderzug nach Pankow|Udo Lindenberg
Rock Me Amadeus|Falco
Der Kommissar|Falco
Griechischer Wein|Udo Jürgens
Ich war noch niemals in New York|Udo Jürgens
Ein bisschen Frieden|Nicole
Satellite|Lena
Du hast|Rammstein
Sonne|Rammstein
Nur noch kurz die Welt retten|Tim Bendzko
Chöre|Mark Forster
194 Länder|Mark Forster
Alles nur geklaut|Die Prinzen
Cordula Grün|Josh.
Layla|DJ Robin & Schürze
Wie schön du bist|Sarah Connor
Vincent|Sarah Connor
`);
gen('social', SONG, r => `Wer singt „${r[0]}“?`);
const ROLE = rows(`
Rachel Green in „Friends“|Jennifer Aniston
Monica Geller in „Friends“|Courteney Cox
Phoebe Buffay in „Friends“|Lisa Kudrow
Joey Tribbiani in „Friends“|Matt LeBlanc
Chandler Bing in „Friends“|Matthew Perry
Ross Geller in „Friends“|David Schwimmer
Walter White in „Breaking Bad“|Bryan Cranston
Jesse Pinkman in „Breaking Bad“|Aaron Paul
Daenerys Targaryen in „Game of Thrones“|Emilia Clarke
Jon Snow in „Game of Thrones“|Kit Harington
Tyrion Lannister in „Game of Thrones“|Peter Dinklage
Harry Potter|Daniel Radcliffe
Hermine Granger|Emma Watson
Ron Weasley|Rupert Grint
Jack in „Titanic“|Leonardo DiCaprio
Rose in „Titanic“|Kate Winslet
Jack Sparrow|Johnny Depp
Sheldon Cooper in „The Big Bang Theory“|Jim Parsons
Thomas Shelby in „Peaky Blinders“|Cillian Murphy
Eleven in „Stranger Things“|Millie Bobby Brown
Wednesday Addams in „Wednesday“ (Netflix)|Jenna Ortega
Barbie im Film von 2023|Margot Robbie
Ken im „Barbie“-Film|Ryan Gosling
Carrie Bradshaw in „Sex and the City“|Sarah Jessica Parker
Katniss Everdeen in „Die Tribute von Panem“|Jennifer Lawrence
Bella Swan in „Twilight“|Kristen Stewart
Edward Cullen in „Twilight“|Robert Pattinson
`);
gen('social', ROLE, r => `Wer spielt ${r[0]}?`);

/* ================= TECHNIK & ALLTAG ================= */
const EL = rows(`
Fe|Eisen
Au|Gold
Ag|Silber
Cu|Kupfer
Pb|Blei
Sn|Zinn
Hg|Quecksilber
Na|Natrium
K|Kalium
Ca|Calcium
Mg|Magnesium
Al|Aluminium
Zn|Zink
Ni|Nickel
Co|Cobalt
Cr|Chrom
Mn|Mangan
Ti|Titan
W|Wolfram
Pt|Platin
U|Uran
H|Wasserstoff
He|Helium
Li|Lithium
C|Kohlenstoff
N|Stickstoff
O|Sauerstoff
F|Fluor
Ne|Neon
Si|Silicium
P|Phosphor
S|Schwefel
Cl|Chlor
Ar|Argon
I|Iod
Ra|Radium
Pu|Plutonium
`);
gen('technik', EL, r => `Für welches chemische Element steht das Symbol „${r[0]}“?`);
gen('technik', EL, r => `Welches chemische Symbol hat ${r[1]}?`, 0);
const SI = rows(`
Länge|Meter
Masse|Kilogramm
Zeit|Sekunde
elektrische Stromstärke|Ampere
Temperatur (SI)|Kelvin
Stoffmenge|Mol
Lichtstärke|Candela
Kraft|Newton
Energie|Joule
Leistung|Watt
elektrische Spannung|Volt
elektrischer Widerstand|Ohm
Frequenz|Hertz
Druck|Pascal
elektrische Ladung|Coulomb
`);
gen('technik', SI, r => `In welcher Einheit misst man ${r[0]}?`);
const INV = rows(`
den Buchdruck mit beweglichen Lettern|Johannes Gutenberg
die Laufmaschine (Vorläufer des Fahrrads)|Karl Drais
den Blitzableiter|Benjamin Franklin
das lenkbare Starrluftschiff|Ferdinand Graf von Zeppelin
die Nietenjeans|Levi Strauss
das Dynamit|Alfred Nobel
das Motorflugzeug (erster Motorflug 1903)|Gebrüder Wright
das Radio (drahtlose Telegrafie)|Guglielmo Marconi
das MP3-Format (maßgeblich)|Karlheinz Brandenburg
den Teddybären (Plüschbär aus Giengen)|Margarete Steiff
das Aspirin (Synthese bei Bayer)|Felix Hoffmann
die Dampfmaschine (entscheidend verbessert)|James Watt
die Rechenmaschine mit Staffelwalze|Gottfried Wilhelm Leibniz
den Viertaktmotor (Ottomotor)|Nikolaus August Otto
die Schreibmaschine (erste praxistaugliche)|Christopher Latham Sholes
die Polioimpfung (Totimpfstoff)|Jonas Salk
`);
gen('technik', INV, r => `Wer erfand ${r[0]}?`);
const ABK = rows(`
HTML|Hypertext Markup Language
CPU|Central Processing Unit
GPU|Graphics Processing Unit
LAN|Local Area Network
VPN|Virtual Private Network
DNS|Domain Name System
HTTP|Hypertext Transfer Protocol
PIN|Persönliche Identifikationsnummer
SIM|Subscriber Identity Module
IBAN|International Bank Account Number
ISBN|Internationale Standardbuchnummer
JPEG|Joint Photographic Experts Group
GIF|Graphics Interchange Format
PNG|Portable Network Graphics
QR-Code|Quick-Response-Code
OLED|Organische Leuchtdiode
HDMI|High-Definition Multimedia Interface
VR|Virtual Reality
AR|Augmented Reality
IoT|Internet of Things
FAQ|Frequently Asked Questions
CC (E-Mail)|Carbon Copy
BCC (E-Mail)|Blind Carbon Copy
PS (im Brief)|Postskriptum
LTE|Long Term Evolution
DSL|Digital Subscriber Line
ROM|Read-Only Memory
BIOS|Basic Input/Output System
DVD|Digital Versatile Disc
TÜV|Technischer Überwachungsverein
ADAC|Allgemeiner Deutscher Automobil-Club
DIN|Deutsches Institut für Normung
PKW|Personenkraftwagen
LKW|Lastkraftwagen
ICE|Intercity-Express
GmbH|Gesellschaft mit beschränkter Haftung
MwSt.|Mehrwertsteuer
`);
gen('technik', ABK, r => `Wofür steht die Abkürzung „${r[0]}“?`);
const TOOLK = rows(`
Schneebesen|Sahne & Eiweiß aufschlagen
Knoblauchpresse|Knoblauch zerdrücken
Sparschäler|Gemüse dünn schälen
Mörser|Gewürze zerstoßen
Nudelholz|Teig ausrollen
Spätzlepresse|Spätzleteig in Wasser drücken
Eierschneider|Eier in Scheiben schneiden
Salatschleuder|Salat trocknen
Zestenreißer|Schale von Zitrusfrüchten abziehen
Fleischthermometer|Kerntemperatur messen
Trichter|Flüssigkeiten umfüllen
Pfannenwender|Bratgut wenden
`);
gen('technik', TOOLK, r => `Wofür benutzt man ${/^(Schneebesen|Mörser|Sparschäler|Zestenreißer|Eierschneider|Trichter|Pfannenwender)$/.test(r[0]) ? 'einen' : r[0] === 'Nudelholz' || r[0] === 'Fleischthermometer' ? 'ein' : 'eine'} ${r[0]}?`);
const EXT = rows(`
.docx|Word-Dokument
.xlsx|Excel-Tabelle
.pptx|PowerPoint-Präsentation
.pdf|PDF-Dokument
.mp4|Video
.mp3|Audio/Musik
.zip|Komprimiertes Archiv
.exe|Windows-Programm
.jpg|Bild/Foto
.txt|Reine Textdatei
.csv|Tabelle mit Komma-getrennten Werten
.apk|Android-App
`);
gen('technik', EXT, r => `Was steckt typischerweise in einer Datei mit der Endung „${r[0]}“?`);
const KEYS = rows(`
Strg + A|Alles markieren
Strg + S|Speichern
Strg + P|Drucken
Strg + F|Suchen
Strg + X|Ausschneiden
Strg + V|Einfügen
Alt + F4|Fenster/Programm schließen
Strg + N|Neues Dokument/Fenster
Strg + Z|Rückgängig
Strg + Y|Wiederholen
`);
gen('technik', KEYS, r => `Was bewirkt unter Windows die Tastenkombination „${r[0]}“?`);

/* ================= TRASH-TV ================= */
const DSCH = rows(`
2004|Costa Cordalis
2008|Ross Antony
2009|Ingrid van Bergen
2011|Peer Kusmagk
2012|Brigitte Nielsen
2013|Joey Heindle
2014|Melanie Müller
2015|Maren Gilzer
2016|Menderes Bağcı
2017|Marc Terenzi
2018|Jenny Frankhauser
2019|Evelyn Burdecki
2020|Prince Damien
2022|Filip Pavlović
2023|Djamila Rowe
2024|Lucy Diakovska
2025|Lilly Becker
`);
gen('trash', DSCH.filter(r => r[0] !== '2004'), r => `Wer gewann ${r[0]} das Dschungelcamp?`);
gen('trash', DSCH, r => `In welchem Jahr wurde ${r[1]} Dschungelkönig${/Brigitte|Melanie|Maren|Jenny|Evelyn|Djamila|Lucy|Lilly|Ingrid/.test(r[1]) ? 'in' : ''}?`, 0);
const GNTM = rows(`
2006|Lena Gercke
2007|Barbara Meier
2008|Jennifer Hof
2009|Sara Nuru
2010|Alisar Ailabouni
2011|Jana Beller
2012|Luisa Hartema
2013|Lovelyn Enebechi
2014|Stefanie Giesinger
2015|Vanessa Fuchs
2016|Kim Hnizdo
2017|Céline Bethmann
2018|Toni Dreher-Adenuga
2019|Simone Kowalski
2020|Jacky Wruck
2021|Alex Mariah Peter
2022|Lou-Anne Gleißenebner-Teskey
2023|Vivien Blotzki
`);
gen('trash', GNTM, r => `Wer gewann ${r[0]} „Germany's Next Topmodel“?`);
gen('trash', GNTM, r => `In welchem Jahr gewann ${r[1]} „Germany's Next Topmodel“?`, 0);
const DSDS = rows(`
2003|Alexander Klaws
2004|Elli Erl
2006|Tobias Regner
2007|Mark Medlock
2008|Thomas Godoj
2009|Daniel Schuhmacher
2010|Mehrzad Marashi
2011|Pietro Lombardi
2012|Luca Hänni
2013|Beatrice Egli
2014|Aneta Sablik
2015|Severino Seeger
2016|Prince Damien
2017|Alphonso Williams
2018|Marie Wegener
2019|Davin Herbrüggen
2020|Ramon Roselly
2021|Jan-Marten Block
2022|Harry Laffontien
`);
gen('trash', DSDS, r => `Wer gewann ${r[0]} „Deutschland sucht den Superstar“?`);
gen('trash', DSDS, r => `In welchem Jahr gewann ${r[1]} DSDS?`, 0);
const SENDER = rows(`
Ich bin ein Star – Holt mich hier raus!|RTL
Der Bachelor|RTL
Die Bachelorette|RTL
Bauer sucht Frau|RTL
Let's Dance|RTL
Deutschland sucht den Superstar|RTL
Das Supertalent|RTL
Das Sommerhaus der Stars|RTL
Ninja Warrior Germany|RTL
Wer wird Millionär?|RTL
Germany's Next Topmodel|ProSieben
The Masked Singer|ProSieben
Joko & Klaas gegen ProSieben|ProSieben
Schlag den Raab|ProSieben
TV total|ProSieben
Promi Big Brother|Sat.1
Love Island|RTL ZWEI
Berlin – Tag & Nacht|RTL ZWEI
Köln 50667|RTL ZWEI
Die Geissens|RTL ZWEI
Die Wollnys|RTL ZWEI
Frauentausch|RTL ZWEI
Hartz und herzlich|RTL ZWEI
Naked Attraction|RTL ZWEI
Kampf der Realitystars|RTL ZWEI
Das perfekte Dinner|VOX
Shopping Queen|VOX
Goodbye Deutschland!|VOX
Die Höhle der Löwen|VOX
Sing meinen Song|VOX
First Dates|VOX
Kitchen Impossible|VOX
Grill den Henssler|VOX
Bares für Rares|ZDF
Wetten, dass..?|ZDF
Das Traumschiff|ZDF
Tatort|Das Erste
Lindenstraße|Das Erste
`);
gen('trash', SENDER, r => `Auf welchem Sender lief bzw. läuft „${r[0]}“?`);

/* ================= WOHER WEISST DU DAS?! ================= */
const PHOB = rows(`
Arachnophobie|Spinnen
Akrophobie|Höhe
Klaustrophobie|Enge Räume
Agoraphobie|Weite Plätze & Menschenmengen
Aviophobie|Fliegen
Hydrophobie|Wasser
Nyktophobie|Dunkelheit
Kynophobie|Hunde
Ailurophobie|Katzen
Ophidiophobie|Schlangen
Hämatophobie|Blut
Trypanophobie|Spritzen
Glossophobie|Öffentliches Reden
Mysophobie|Keime & Schmutz
Nomophobie|Ohne Handy zu sein
Triskaidekaphobie|Die Zahl 13
Brontophobie|Donner
Dentophobie|Zahnarzt
Philophobie|Sich zu verlieben
Ergophobie|Arbeit
Arachibutyrophobie|Erdnussbutter, die am Gaumen klebt
Hexakosioihexekontahexaphobie|Die Zahl 666
Gamophobie|Heiraten
Ombrophobie|Regen
Emetophobie|Erbrechen
`);
gen('wtf', PHOB, r => `Wovor hat jemand mit ${r[0]} Angst?`);
gen('wtf', PHOB, r => `Wie heißt die Angst vor: ${r[1]}?`, 0);
const GROUP = rows(`
Löwen|a pride
Krähen|a murder
Fische|a school
Delfine|a pod
Gänse (am Boden)|a gaggle
Wölfe|a pack
Affen|a troop
Giraffen|a tower
Zebras|a dazzle
Nilpferde|a bloat
Stachelschweine|a prickle
Frettchen|a business
Quallen|a smack
Kängurus|a mob
Eulen|a parliament
Nashörner|a crash
Flamingos|a flamboyance
`);
gen('wtf', GROUP, r => `Wie nennt man eine Gruppe ${r[0]} auf Englisch?`);
const SUPER = rows(`
das schnellste Tier der Welt (im Sturzflug)|Wanderfalke
der kleinste Vogel der Welt|Bienenelfe
die größte Raubkatze der Welt|Sibirischer Tiger
die größte Echse der Welt|Komodowaran
das größte Reptil der Welt|Leistenkrokodil
die größte Spinne der Welt|Goliath-Vogelspinne
der größte Affe der Welt|Gorilla
das höchste Tier der Welt|Giraffe
das größte Landtier der Welt|Afrikanischer Elefant
das Tier mit dem größten Auge|Koloss-Kalmar
das schnellste Landtier|Gepard
das größte Nagetier der Welt|Wasserschwein (Capybara)
`);
gen('wtf', SUPER, r => `Was ist ${r[0]}?`);
const SPACE = rows(`
der heißeste Planet unseres Sonnensystems|Venus
der „Rote Planet“|Mars
der größte Planet unseres Sonnensystems|Jupiter
der kleinste Planet unseres Sonnensystems|Merkur
der erste Mensch auf dem Mond|Neil Armstrong
der erste Mensch im Weltall|Juri Gagarin
das erste Tier in einer Erdumlaufbahn|Die Hündin Laika
der Himmelskörper, der 2006 zum Zwergplaneten herabgestuft wurde|Pluto
der Planet, der sich „liegend“ (stark gekippt) um die Sonne dreht|Uranus
der äußerste Planet unseres Sonnensystems|Neptun
der erste Deutsche im Weltall|Sigmund Jähn
`);
gen('wtf', SPACE, r => `Wer oder was ist ${r[0]}?`);
const FOOD = rows(`
Kopi Luwak|Kaffee aus Bohnen, die Schleichkatzen gefressen & ausgeschieden haben
Surströmming|Vergorener Hering aus Schweden
Casu Marzu|Sardischer Käse mit lebenden Maden
Balut|Angebrütetes, gekochtes Entenei
Natto|Fermentierte, fädenziehende Sojabohnen aus Japan
Hákarl|Fermentierter Hai aus Island
Escamoles|Ameisenlarven aus Mexiko
Vegemite|Salziger Hefe-Brotaufstrich aus Australien
Lutefisk|In Lauge eingelegter Stockfisch aus Norwegen
Haggis|Schafsmagen gefüllt mit Innereien
`);
gen('wtf', FOOD, r => `Was ist „${r[0]}“?`);
const ODD = rows(`
Okapi|Ein Waldgiraffen-Verwandter mit Zebrastreifen-Beinen
Narwal|Ein Wal mit einem langen Stoßzahn
Pangolin|Ein Schuppentier
Bärtierchen|Ein Mini-Tier, das sogar das Weltall überlebt
Fingertier (Aye-Aye)|Ein Lemur mit extra langem Mittelfinger
Quokka|Ein „lächelndes“ Beuteltier aus Australien
Nacktmull|Ein fast haarloses, unterirdisch lebendes Nagetier
Kakapo|Ein flugunfähiger, nachtaktiver Papagei
Ameisenigel|Ein eierlegendes Säugetier mit Stacheln
Erdferkel|Ein Termitenfresser mit Schweinenase aus Afrika
Koboldmaki|Ein Primat mit riesigen Augen
Kugelfisch|Ein Fisch, der sich aufblasen kann
Blobfisch|Ein Tiefseefisch, der an Land wie ein Gelee-Klumpen aussieht
Seegurke|Ein Stachelhäuter am Meeresboden
Mantarochen|Der größte Rochen der Welt
`);
gen('wtf', ODD, r => `Was ist ein ${r[0]}?`);
gen('wtf', ODD, r => `Welches Tier ist das: ${r[1]}?`, 0);
const DEWORD = rows(`
Kindergarten|Wird im Englischen für die Vorschule benutzt
Gesundheit|Sagen manche Amerikaner nach dem Niesen
Schadenfreude|Freude über das Pech anderer – auch im Englischen
Doppelgänger|Englisches Wort für einen Menschen, der dir täuschend ähnlich sieht
Wanderlust|Englisches Wort für Fernweh/Reiselust
Zeitgeist|Englisches Wort für den Geist der Zeit
Rucksack|Im Englischen ebenfalls ein Wort für Rucksack
Kitsch|Englisches Wort für geschmacklosen Krempel
`);
gen('wtf', DEWORD, r => `Welches deutsche Wort passt: ${r[1]}?`, 0);

/* ================= ALLES RUND UM DIE FRAU ================= */
const WOMEN = rows(`
Marie Curie|Erforschung der Radioaktivität
Frida Kahlo|Farbenfrohe Selbstporträts
Coco Chanel|Revolutionäre Damenmode
Amelia Earhart|Rekordfliegerin über den Atlantik
Rosa Parks|Bürgerrechtsbewegung in den USA
Malala Yousafzai|Einsatz für Bildung von Mädchen
Mutter Teresa|Hilfe für Arme in Kalkutta
Florence Nightingale|Begründerin der modernen Krankenpflege
Anne Frank|Tagebuch aus dem Versteck
Sophie Scholl|Widerstand der „Weißen Rose“
Astrid Lindgren|Pippi Langstrumpf & Michel
Agatha Christie|Kriminalromane mit Hercule Poirot
Greta Thunberg|Klimaschutz-Proteste
Oprah Winfrey|Legendäre Talkshow
Magdalena Neuner|Biathlon-Weltmeisterin
Franziska van Almsick|Schwimmerin & Weltrekordlerin
Birgit Prinz|Fußball-Weltmeisterin
Kaiserin Sisi|Kaiserin von Österreich
Marlene Dietrich|Filmstar („Der blaue Engel“)
Romy Schneider|Spielte „Sissi“ im Film
Audrey Hepburn|„Frühstück bei Tiffany“
Claudia Schiffer|Topmodel aus Rheinberg
Simone Biles|Erfolgreichste Turnerin
Jane Austen|„Stolz und Vorurteil“
Virginia Woolf|Moderne Literatur („Orlando“)
Kleopatra|Letzte Pharaonin Ägyptens
Ada Lovelace|Erstes Computerprogramm
Hedy Lamarr|Erfindung der Frequenzsprung-Technik
`);
gen('frau', WOMEN, r => `Wofür ist ${r[0]} vor allem bekannt?`);
gen('frau', WOMEN, r => `Wer ist bekannt für: ${r[1]}?`, 0);
const FASH = rows(`
Culotte|Weite, wadenlange Hose
Bolero|Kurzes Jäckchen
Pumps|Geschlossener Schuh mit Absatz
Espadrilles|Stoffschuhe mit Bastsohle
Kitten Heels|Schuhe mit niedrigem, schmalem Absatz
Trenchcoat|Mantel mit Gürtel & Schulterklappen
Cardigan|Strickjacke
Haute Couture|Exklusive Maßanfertigung
Prêt-à-porter|Mode von der Stange
Jumpsuit|Einteiliger Overall
Crop Top|Bauchfreies Oberteil
Neckholder|Oberteil, das im Nacken gebunden wird
Bandeau|Trägerloses Oberteil
Peeptoes|Schuhe mit Öffnung an den Zehen
Mules|Hinten offene Schuhe
Empire-Linie|Kleid mit hoher Taille unter der Brust
Midikleid|Wadenlanges Kleid
Plissee|Stoff mit feinen Falten
Tüll|Feiner Netzstoff
Chiffon|Hauchdünner, durchscheinender Stoff
Kaschmir|Feine Wolle der Kaschmirziege
Satin|Glänzender, glatter Stoff
`);
gen('frau', FASH, r => `Was ist ${/^(Pumps|Espadrilles|Kitten Heels|Peeptoes|Mules|Haute Couture|Prêt-à-porter)$/.test(r[0]) ? '' : /^(Bolero|Trenchcoat|Cardigan|Jumpsuit|Crop Top|Neckholder|Bandeau|Midikleid|Tüll|Chiffon|Kaschmir|Satin|Plissee)$/.test(r[0]) ? (r[0] === 'Plissee' ? 'ein ' : 'ein ') : 'eine '}${r[0]}?`.replace('ein Tüll', 'Tüll').replace('ein Chiffon', 'Chiffon').replace('ein Kaschmir', 'Kaschmir').replace('ein Satin', 'Satin').replace('eine Empire-Linie', 'die Empire-Linie'));
gen('frau', FASH, r => `Wie nennt man: ${r[1]}?`, 0);
const BEAUTY = rows(`
Primer|Grundierung, damit Make-up besser hält
Concealer|Abdeckstift für Augenringe & Makel
Foundation|Flüssiges Make-up als Grundlage
Rouge|Wangenrot
Bronzer|Puder für einen gebräunten Teint
Setting Spray|Fixierspray für das Make-up
Peeling|Entfernt abgestorbene Hautschüppchen
Serum|Hochkonzentrierte Wirkstoffpflege
Toner|Gesichtswasser
Retinol|Vitamin-A-Wirkstoff gegen Falten
LSF/SPF|Lichtschutzfaktor
BB Cream|Getönte Pflegecreme („Blemish Balm“)
Ombré|Haarfarbe mit Farbverlauf
Extensions|Haarverlängerung
Wimpernlifting|Dauerhafte Wimpernwelle
Gel-Nägel|Mit Gel modellierte, gehärtete Nägel
`);
gen('frau', BEAUTY, r => `Was ist ${['Peeling', 'Serum', 'Rouge', 'Setting Spray', 'Retinol', 'Wimpernlifting', 'Ombré'].includes(r[0]) ? 'ein' : r[0] === 'LSF/SPF' ? 'der' : r[0] === 'Extensions' || r[0] === 'Gel-Nägel' ? '' : r[0] === 'Foundation' || r[0] === 'BB Cream' ? 'eine' : 'ein'} ${r[0]}?`.replace('Was ist  ', 'Was sind ').replace(/  /g, ' '));
gen('frau', BEAUTY, r => `Wie heißt das: ${r[1]}?`, 0);

/* ================= ALLES RUND UM DEN MANN ================= */
const MOVIE = rows(`
„Stirb langsam“ (John McClane)|Bruce Willis
„Rambo“|Sylvester Stallone
„Mission: Impossible“ (Ethan Hunt)|Tom Cruise
„Top Gun“ (Maverick)|Tom Cruise
„Gladiator“ (Maximus)|Russell Crowe
„Braveheart“ (William Wallace)|Mel Gibson
„Lethal Weapon“ (Martin Riggs)|Mel Gibson
„Fast & Furious“ (Dominic Toretto)|Vin Diesel
„The Transporter“ (Frank Martin)|Jason Statham
„96 Hours“ (Bryan Mills)|Liam Neeson
„Matrix“ (Neo)|Keanu Reeves
„Speed“ (Jack Traven)|Keanu Reeves
„Thor“|Chris Hemsworth
„Captain America“|Chris Evans
„Wolverine“|Hugh Jackman
„Deadpool“|Ryan Reynolds
„The Dark Knight“ (Batman)|Christian Bale
„Joker“ (2019)|Joaquin Phoenix
„Forrest Gump“|Tom Hanks
„Fight Club“ (Tyler Durden)|Brad Pitt
„Der Pate“ (Vito Corleone)|Marlon Brando
„Scarface“ (Tony Montana)|Al Pacino
„Taxi Driver“ (Travis Bickle)|Robert De Niro
„Bad Boys“ (Mike Lowrey)|Will Smith
„Men in Black“ (Agent J)|Will Smith
„Rush Hour“ (Inspector Lee)|Jackie Chan
„Der Mann mit der Todeskralle“|Bruce Lee
„Kickboxer“|Jean-Claude Van Damme
„Walker, Texas Ranger“|Chuck Norris
„Baywatch“ (Mitch Buchannon, Serie)|David Hasselhoff
„Knight Rider“ (Michael Knight)|David Hasselhoff
„MacGyver“ (Original-Serie)|Richard Dean Anderson
„Oppenheimer“|Cillian Murphy
„Mad Max: Fury Road“|Tom Hardy
„Venom“|Tom Hardy
„The Wolf of Wall Street“|Leonardo DiCaprio
„Commando“ (John Matrix)|Arnold Schwarzenegger
„Dirty Dancing“ (Johnny Castle)|Patrick Swayze
„Indiana Jones“|Harrison Ford
„Rocky“|Sylvester Stallone
`);
gen('mann', MOVIE, r => `Wer spielt die Hauptrolle in ${r[0]}?`);
const TOOL = rows(`
Zollstock|Längen messen
Cuttermesser|Teppich, Pappe & Folie schneiden
Spachtel|Fugen & Löcher verspachteln
Kreissäge|Gerade Schnitte in Holz & Platten
Hobel|Holzoberflächen glätten & abtragen
Feile|Metall- oder Holzkanten glätten
Schraubstock|Werkstücke fest einspannen
Lötkolben|Lot schmelzen, z. B. für Elektronik
Multimeter|Spannung & Strom messen
Seitenschneider|Drähte durchtrennen
Rohrzange|Rohre greifen & drehen
Maulschlüssel|Sechskant-Muttern drehen
Ratsche|Schrauben schnell festziehen ohne Umsetzen
Wagenheber|Auto anheben
Kompressor|Druckluft erzeugen
Schlagbohrmaschine|Löcher in Mauerwerk bohren
Meißel|Stein oder Holz abtragen
Tacker|Klammern einschlagen
Heißklebepistole|Heißkleber auftragen
Winkelschleifer|Metall trennen & schleifen
Stichsäge|Kurven aussägen
Schleifpapier|Oberflächen glatt schleifen
Kelle|Mörtel auftragen
`);
gen('mann', TOOL, r => `Wofür benutzt man ${/^(Zollstock|Spachtel|Hobel|Schraubstock|Lötkolben|Seitenschneider|Maulschlüssel|Wagenheber|Kompressor|Meißel|Tacker|Winkelschleifer)$/.test(r[0]) ? 'einen' : r[0] === 'Multimeter' || r[0] === 'Cuttermesser' || r[0] === 'Schleifpapier' ? '' : 'eine'} ${r[0]}?`.replace('benutzt man  ', 'benutzt man '));
gen('mann', TOOL, r => `Welches Werkzeug nimmt man für: ${r[1]}?`, 0);
const DRINK = rows(`
Tequila|Agave
Wodka|Getreide oder Kartoffeln
Cognac|Wein (Weinbrand aus Frankreich)
Grappa|Traubentrester
Ouzo|Anis
Sake|Reis
Absinth|Wermutkraut
Bourbon|Mais
Calvados|Äpfel
Kirschwasser|Kirschen
Cachaça|Zuckerrohrsaft
`);
gen('mann', DRINK, r => `Woraus wird ${r[0]} hauptsächlich gemacht?`);
const COCK = rows(`
Mojito|Rum
Caipirinha|Cachaça
Margarita|Tequila
Cuba Libre|Rum
Moscow Mule|Wodka
Gin Tonic|Gin
Piña Colada|Rum
Negroni|Gin
Martini (klassisch)|Gin
Aperol Spritz|Aperol & Prosecco
White Russian|Wodka
Mai Tai|Rum
`);
gen('mann', COCK, r => `Welcher Hauptalkohol steckt in einem ${r[0]}?`.replace('in einem Margarita', 'in einer Margarita').replace('in einem Caipirinha', 'in einer Caipirinha').replace('in einem Piña Colada', 'in einer Piña Colada'));
const BEER = rows(`
Bockbier|Starkes, malzbetontes Bier
Stout|Sehr dunkles Bier wie Guinness
IPA|Stark gehopftes „India Pale Ale“
Helles|Mildes, helles bayerisches Bier
Russ|Weißbier mit Zitronenlimo
Märzen|Kräftiges Festbier, z. B. zum Oktoberfest
`);
gen('mann', BEER, r => `Was ist ein ${r[0]}?`.replace('ein Helles', 'ein Helles'));
const CUT = rows(`
Rib-Eye|Steak aus der Hochrippe mit Fettauge
Filet|Das zarteste Stück aus der Lende
T-Bone|Steak mit T-Knochen, Filet & Roastbeef
Flank Steak|Steak aus dem Bauchlappen
Brisket|Rinderbrust, ideal zum langen Smoken
Spareribs|Rippchen vom Schwein
Tafelspitz|Klassisches Stück aus der Rinderhüfte zum Kochen
Picanha|Rinderhüfte mit Fettdeckel (Brasilien)
`);
gen('mann', CUT, r => `Was ist ${r[0] === 'Spareribs' ? '' : r[0] === 'Brisket' ? '' : 'ein '}${r[0]}?`.replace('Was ist Spareribs', 'Was sind Spareribs'));
const NICK = rows(`
Der Titan|Oliver Kahn
Loddar|Lothar Matthäus
Tante Käthe|Rudi Völler
Schweini|Bastian Schweinsteiger
Poldi|Lukas Podolski
CR7|Cristiano Ronaldo
La Pulga (der Floh)|Lionel Messi
Kalle|Karl-Heinz Rummenigge
Icke|Thomas Häßler
Der Bomber der Nation|Gerd Müller
Der Kaiser|Franz Beckenbauer
`);
gen('mann', NICK, r => `Welcher Fußballer hat den Spitznamen „${r[0]}“?`);
const PART = rows(`
Lichtmaschine|Erzeugt Strom während der Fahrt
Zündkerze|Zündet das Benzin-Luft-Gemisch
Katalysator|Reinigt die Abgase
Turbolader|Presst mehr Luft in den Motor für mehr Leistung
Differential|Lässt die Räder in Kurven unterschiedlich schnell drehen
Stoßdämpfer|Dämpft Federbewegungen
Partikelfilter|Filtert Ruß aus Dieselabgasen
AdBlue|Harnstofflösung zur Abgasreinigung bei Diesel
Nockenwelle|Steuert das Öffnen der Ventile
Anlasser|Startet den Motor
Kupplung|Trennt Motor & Getriebe beim Schalten
Keilriemen|Treibt Nebenaggregate wie die Lichtmaschine an
`);
gen('mann', PART, r => `Was macht ${['Lichtmaschine', 'Zündkerze', 'Nockenwelle', 'Kupplung'].includes(r[0]) ? 'die' : r[0] === 'Differential' || r[0] === 'AdBlue' ? 'das' : 'der'} ${r[0]} im Auto?`);

/* ================= ERWEITERUNG ================= */
const HOMEC = rows(`
Känguru|Australien
Koala|Australien
Wombat|Australien
Tasmanischer Teufel|Australien
Schnabeltier|Australien
Lama|Südamerika
Alpaka|Südamerika
Faultier|Südamerika
Jaguar|Südamerika
Capybara|Südamerika
Großer Panda|Asien
Orang-Utan|Asien
Komodowaran|Asien
Yak|Asien
Bengal-Tiger|Asien
Roter Panda|Asien
Zebra|Afrika
Giraffe|Afrika
Flusspferd|Afrika
Gorilla|Afrika
Okapi|Afrika
Erdmännchen|Afrika
Lemur|Afrika
Bison|Nordamerika
Waschbär|Nordamerika
Weißkopfseeadler|Nordamerika
Stinktier|Nordamerika
Präriehund|Nordamerika
Kaiserpinguin|Antarktis
`);
gen('natur', HOMEC, r => `Auf welchem Kontinent ist dieses Tier ursprünglich zu Hause: ${r[0]}?`);
const FAM = rows(`
Tomate|Nachtschattengewächse
Kartoffel|Nachtschattengewächse
Paprika|Nachtschattengewächse
Aubergine|Nachtschattengewächse
Gurke|Kürbisgewächse
Zucchini|Kürbisgewächse
Wassermelone|Kürbisgewächse
Kürbis|Kürbisgewächse
Brokkoli|Kreuzblütler
Kohlrabi|Kreuzblütler
Radieschen|Kreuzblütler
Rucola|Kreuzblütler
Senf|Kreuzblütler
Erbse|Hülsenfrüchtler
Bohne|Hülsenfrüchtler
Linse|Hülsenfrüchtler
Erdnuss|Hülsenfrüchtler
Kichererbse|Hülsenfrüchtler
Karotte|Doldenblütler
Petersilie|Doldenblütler
Sellerie|Doldenblütler
Fenchel|Doldenblütler
Dill|Doldenblütler
Apfel|Rosengewächse
Birne|Rosengewächse
Kirsche|Rosengewächse
Erdbeere|Rosengewächse
Pflaume|Rosengewächse
Himbeere|Rosengewächse
Sonnenblume|Korbblütler
Löwenzahn|Korbblütler
Kamille|Korbblütler
Kopfsalat|Korbblütler
`);
gen('natur', FAM, r => `Zu welcher Pflanzenfamilie gehört: ${r[0]}?`);
const SPICE = rows(`
Zimt|Rinde
Vanille|Schotenfrucht einer Orchidee
Safran|Blütennarben
Gewürznelke|Getrocknete Blütenknospen
Muskatnuss|Samen
Kapern|Blütenknospen
Kurkuma|Wurzelstock
Pfeffer|Früchte (Beeren)
Lorbeer|Blätter
Kakao|Samen (Bohnen)
`);
gen('natur', SPICE, r => `Welcher Pflanzenteil wird bei diesem Gewürz/Genussmittel verwendet: ${r[0]}?`);
const LEGS = rows(`
Spinne|8
Ameise|6
Marienkäfer|6
Hummer|10
Krabbe|10
Skorpion|8
Zecke (erwachsen)|8
Strauß|2
Libelle|6
Garnele|10
`);
gen('natur', LEGS, r => `Wie viele Beine hat: ${r[0]}?`);
const TREE = rows(`
Eicheln|Eiche
Bucheckern|Buche
Rosskastanien|Rosskastanie
Hagebutten|Rose
Haselnüsse|Haselstrauch
Walnüsse|Walnussbaum
Hängende Zapfen|Fichte
Nadeln & aufrechte Zapfen|Tanne
Propeller-Flügelnüsse|Ahorn
Holunderbeeren|Holunder
`);
gen('natur', TREE, r => `An welchem Baum bzw. Strauch wachsen: ${r[0]}?`);
const ITIS2 = rows(`
Karies|Zahnfäule
Hämatom|Bluterguss
Thrombose|Blutgerinnsel in einem Gefäß
Fraktur|Knochenbruch
Luxation|Ausrenkung eines Gelenks
Distorsion|Verstauchung
Kontusion|Prellung
Ödem|Wasseransammlung im Gewebe
Abszess|Eiteransammlung
Tachykardie|Herzrasen
Bradykardie|Zu langsamer Herzschlag
Apnoe|Atemstillstand
Synkope|Kurze Ohnmacht
Vertigo|Schwindel
Pruritus|Juckreiz
Adipositas|Starkes Übergewicht
Obstipation|Verstopfung
Diarrhö|Durchfall
Nausea|Übelkeit
Zephalgie|Kopfschmerz
Myalgie|Muskelschmerz
Infarkt|Absterben von Gewebe durch fehlende Durchblutung
`);
gen('koerper', ITIS2, r => `Was bedeutet der Fachbegriff „${r[0]}“?`);
const ORG = rows(`
Insulin bildet|Bauchspeicheldrüse
Galle produziert|Leber
Gallenflüssigkeit speichert|Gallenblase
Blut filtert und Urin bildet|Niere
rote Blutkörperchen bildet|Knochenmark
Melatonin ausschüttet|Zirbeldrüse
Adrenalin ausschüttet|Nebenniere
Wachstumshormon bildet|Hypophyse
für den Gleichgewichtssinn zuständig ist|Innenohr
den Großteil der Nährstoffe aufnimmt|Dünndarm
dem Stuhl vor allem Wasser entzieht|Dickdarm
alte rote Blutkörperchen abbaut|Milz
`);
gen('koerper', ORG, r => `Welches Organ ist es, das ${r[0]}?`);
const REC = rows(`
der größte Muskel|Großer Gesäßmuskel
der kleinste Knochen|Steigbügel
der längste Knochen|Oberschenkelknochen
das größte Organ|Haut
das größte innere Organ|Leber
der kleinste Muskel|Steigbügelmuskel
`);
gen('koerper', REC, r => `Was ist ${r[0]} des menschlichen Körpers?`);
const NUT = rows(`
Vitamin K|Blutgerinnung
Vitamin D|Calciumaufnahme & Knochen
Vitamin A|Sehen (besonders bei Dämmerung)
Eisen|Sauerstofftransport im Blut
Jod|Schilddrüsenhormone
Calcium|Knochen & Zähne
Magnesium|Muskeln & Nerven
Vitamin B12|Blutbildung & Nerven
Fluorid|Zahnschmelz
`);
gen('koerper', NUT, r => `Wofür ist ${r[0]} im Körper besonders wichtig?`);

const SONG2 = rows(`
Flowers|Miley Cyrus
Bad Guy|Billie Eilish
Ocean Eyes|Billie Eilish
Stay|The Kid LAROI & Justin Bieber
Peaches|Justin Bieber
Señorita|Shawn Mendes & Camila Cabello
Stitches|Shawn Mendes
Thinking Out Loud|Ed Sheeran
Photograph|Ed Sheeran
All of Me|John Legend
Just the Way You Are|Bruno Mars
Grenade|Bruno Mars
Locked Out of Heaven|Bruno Mars
Die With a Smile|Lady Gaga & Bruno Mars
Shallow|Lady Gaga & Bradley Cooper
Rolling Stone|Bob Dylan
Let It Be|The Beatles
Billie Jean|Michael Jackson
Beat It|Michael Jackson
Smooth Criminal|Michael Jackson
Material Girl|Madonna
Vogue|Madonna
Crazy in Love|Beyoncé
Halo|Beyoncé
Love Story|Taylor Swift
Blank Space|Taylor Swift
Hotline Bling|Drake
God's Plan|Drake
In da Club|50 Cent
Gold Digger|Kanye West
Empire State of Mind|Jay-Z & Alicia Keys
Fallin'|Alicia Keys
No One|Alicia Keys
Umbrella|Rihanna
We Found Love|Rihanna
Only Girl (In the World)|Rihanna
Starboy|The Weeknd
Save Your Tears|The Weeknd
Can't Feel My Face|The Weeknd
Stressed Out|Twenty One Pilots
Seven Nation Army|The White Stripes
Somebody to Love|Queen
Don't Stop Me Now|Queen
Another One Bites the Dust|Queen
Livin' on a Prayer|Bon Jovi
It's My Life|Bon Jovi
Highway to Hell|AC/DC
Thunderstruck|AC/DC
Back in Black|AC/DC
Nothing Else Matters|Metallica
Enter Sandman|Metallica
Zombie|The Cranberries
Losing My Religion|R.E.M.
Creep|Radiohead
Californication|Red Hot Chili Peppers
Under the Bridge|Red Hot Chili Peppers
Hotel California|Eagles
Stairway to Heaven|Led Zeppelin
Rolling in the Deep|Adele
Easy On Me|Adele
Shivers|Ed Sheeran
Unwritten|Natasha Bedingfield
Complicated|Avril Lavigne
Sk8er Boi|Avril Lavigne
Since U Been Gone|Kelly Clarkson
I Kissed a Girl|Katy Perry
Teenage Dream|Katy Perry
Titanium|David Guetta feat. Sia
Lean On|Major Lazer & DJ Snake
Animals|Martin Garrix
Faded|Alan Walker
Summer|Calvin Harris
Wake Me Up|Avicii
Hey Brother|Avicii
Bilder im Kopf|Sido
Astronaut|Sido feat. Andreas Bourani
Bonnie & Clyde|Sido? 
Zukunft Pink|Peter Fox feat. Inéz
Ohne dich|Münchener Freiheit
Wind of Change|Scorpions
Rock You Like a Hurricane|Scorpions
Atemlos|Helene Fischer
Wolke 7|Max Herre feat. Philipp Poisel
Ich & Ich – Vom selben Stern|Ich + Ich
So soll es bleiben|Ich + Ich
Pflaster|Ich + Ich
Leichtes Gepäck|Silbermond
Irgendwas bleibt|Silbermond
Zu spät|Die Ärzte
Westerland|Die Ärzte
Hier kommt Alex|Die Toten Hosen
Bochum|Herbert Grönemeyer
Halt dich an mir fest|Revolverheld
Ich lass für dich das Licht an|Revolverheld
Wenn sie tanzt|Max Giesinger
80 Millionen|Max Giesinger
Au Revoir|Mark Forster feat. Sido
Bauch und Kopf|Mark Forster
Atlantis|Cro? 
Easy|Cro
Einmal um die Welt|Cro
Traum|Cro
Bauch Beine Po|Shirin David
Ich darf das|Shirin David
Wie ein Alpha|Kollegah? 
Ohne mein Team|Bonez MC & RAF Camora
500 PS|Bonez MC & RAF Camora
Palmen aus Plastik|Bonez MC & RAF Camora
Kokain|Bonez MC & RAF Camora? 
Bad Liar|Imagine Dragons
Thunder|Imagine Dragons
Demons|Imagine Dragons
Rather Be|Clean Bandit feat. Jess Glynne
Royals|Lorde
Somewhere Only We Know|Keane
Chasing Cars|Snow Patrol
Fix You|Coldplay
Paradise|Coldplay
Hymn for the Weekend|Coldplay
`).filter(r => !r[1].includes('?') && !r[0].includes('–'));
gen('social', SONG2, r => `Wer singt „${r[0]}“?`);

const OWNER = rows(`
WhatsApp|Meta
Instagram|Meta
Facebook|Meta
YouTube|Google
Android|Google
Chrome (Browser)|Google
Gmail|Google
Windows|Microsoft
Xbox|Microsoft
LinkedIn|Microsoft
Outlook|Microsoft
PlayStation|Sony
iPhone|Apple
Safari (Browser)|Apple
AirPods|Apple
Galaxy (Smartphones)|Samsung
Alexa|Amazon
Kindle|Amazon
Twitch|Amazon
Prime Video|Amazon
ChatGPT|OpenAI
Claude|Anthropic
Nintendo Switch|Nintendo
TikTok|ByteDance
`);
gen('technik', OWNER, r => `Zu welchem Unternehmen gehört ${r[0]}?`);
const FOUND = rows(`
Apple|Steve Jobs & Steve Wozniak
Microsoft|Bill Gates & Paul Allen
Facebook|Mark Zuckerberg
Amazon|Jeff Bezos
Google|Larry Page & Sergey Brin
Adidas|Adolf „Adi“ Dassler
Puma|Rudolf Dassler
Porsche|Ferdinand Porsche
Haribo|Hans Riegel
Aldi|Karl & Theo Albrecht
IKEA|Ingvar Kamprad
SpaceX|Elon Musk
Daimler-Motoren-Gesellschaft|Gottlieb Daimler
Bosch|Robert Bosch
`);
gen('technik', FOUND, r => `Wer gründete ${r[0]}?`);

const LD = rows(`
2006|Wayne Carpendale
2007|Susan Sideropoulos
2010|Sophia Thomalla
2011|Maite Kelly
2012|Magdalena Brzeska
2013|Manuel Cortez
2014|Alexander Klaws
2015|Hans Sarpei
2016|Victoria Swarovski
2017|Gil Ofarim
2018|Ingolf Lück
2019|Pascal Hens
2020|Lili Paul-Roncalli
2021|Rúrik Gíslason
2022|René Casselly
2023|Anna Ermakova
2024|Gabriel Kelly
`);
gen('trash', LD, r => `Wer gewann ${r[0]} „Let's Dance“?`);
gen('trash', LD, r => `In welchem Jahr gewann ${r[1]} „Let's Dance“?`, 0);
const HOST = rows(`
Bauer sucht Frau|Inka Bause
Shopping Queen|Guido Maria Kretschmer
Wer wird Millionär?|Günther Jauch
Germany's Next Topmodel|Heidi Klum
Bares für Rares|Horst Lichter
Wetten, dass..? (klassisch)|Thomas Gottschalk
Schlag den Raab|Stefan Raab
Grill den Henssler|Steffen Henssler
Kitchen Impossible|Tim Mälzer
The Masked Singer|Matthias Opdenhövel
Das Supertalent (Jury-Chef)|Dieter Bohlen
Die Geissens (Hauptfiguren)|Robert & Carmen Geiss
Das Traumschiff (Kapitän, ab 2019)|Florian Silbereisen
`);
gen('trash', HOST, r => `Wer ist das Gesicht von „${r[0]}“?`);
const MOTIV = rows(`
Die letzte Rose|Der Bachelor
Dschungelprüfungen|Ich bin ein Star – Holt mich hier raus!
Ein Shopping-Budget & ein Motto|Shopping Queen
Kochen bei Fremden & Punkte vergeben|Das perfekte Dinner
Hofwoche & Scheunenfest|Bauer sucht Frau
Telefonjoker & 50:50|Wer wird Millionär?
Händlerraum & Expertise|Bares für Rares
Recall & Auslandsrecall|Deutschland sucht den Superstar
„Ich habe heute leider kein Foto für dich“|Germany's Next Topmodel
Promis unter Kostümen erraten|The Masked Singer
Promis tanzen mit Profis|Let's Dance
Gründer pitchen vor Investoren|Die Höhle der Löwen
Promi-Paare in einem Haus in Bocholt|Das Sommerhaus der Stars
Singles in einer Villa, Pärchen bilden|Love Island
Deutsche wandern aus|Goodbye Deutschland!
Zwei Mütter tauschen die Familie|Frauentausch
Kandidaten bewerten sich nackt|Naked Attraction
`);
gen('trash', MOTIV, r => `Welche Show erkennt man an: ${r[0]}?`);

const LAT = rows(`
Carpe diem|Nutze den Tag
Veni, vidi, vici|Ich kam, sah und siegte
In vino veritas|Im Wein liegt die Wahrheit
Alea iacta est|Der Würfel ist gefallen
Cogito, ergo sum|Ich denke, also bin ich
Et tu, Brute?|Auch du, Brutus?
Mens sana in corpore sano|Ein gesunder Geist in einem gesunden Körper
Errare humanum est|Irren ist menschlich
Tempus fugit|Die Zeit flieht
Memento mori|Bedenke, dass du sterblich bist
Quid pro quo|Dies für das (Gegenleistung)
Per aspera ad astra|Durch Mühsal zu den Sternen
Dum spiro, spero|Solange ich atme, hoffe ich
In flagranti|Auf frischer Tat
Status quo|Der bestehende Zustand
Persona non grata|Unerwünschte Person
Pro bono|Unentgeltlich, zum Wohl der Allgemeinheit
Ora et labora|Bete und arbeite
Panem et circenses|Brot und Spiele
Nomen est omen|Der Name ist ein Zeichen
Divide et impera|Teile und herrsche
Sapere aude|Hab Mut, dich deines eigenen Verstandes zu bedienen
`);
gen('wtf', LAT, r => `Was bedeutet „${r[0]}“?`);
gen('wtf', LAT, r => `Wie heißt „${r[1]}“ auf Latein?`, 0);
const WORD = rows(`
Petrichor|Geruch von Regen auf trockener Erde
Ohrwurm|Melodie, die im Kopf hängen bleibt
Backpfeifengesicht|Gesicht, das förmlich zur Ohrfeige einlädt
Torschlusspanik|Angst, etwas Wichtiges zu verpassen
Fremdschämen|Sich für andere peinlich berührt fühlen
Treppenwitz|Gute Antwort, die einem zu spät einfällt
Drachenfutter|Geschenk, um den Partner zu besänftigen
Kummerspeck|Gewicht durch Frustessen
Verschlimmbessern|Etwas beim Verbessern schlimmer machen
Schnapsidee|Unsinnige, spontane Idee
Lampenfieber|Aufregung vor einem Auftritt
Hüftgold|Kleine Pölsterchen an der Hüfte
Sitzfleisch|Ausdauer beim Sitzenbleiben
Warmduscher|Jemand, der Unangenehmes scheut
Weltschmerz|Traurigkeit über den Zustand der Welt
Kopfkino|Fantasie, die Bilder im Kopf erzeugt
Philtrum|Rinne zwischen Nase und Oberlippe
Glabella|Stelle zwischen den Augenbrauen
Lunula|Weißer Halbmond am Fingernagel
Uvula|Gaumenzäpfchen
Aglet|Plastikspitze am Schnürsenkel
Grawlix|Zeichenfolge wie @#$% statt eines Fluchs
`);
gen('wtf', WORD, r => `Was bedeutet „${r[0]}“?`);

const WOMEN2 = rows(`
Angela Merkel|Erste deutsche Bundeskanzlerin
Valentina Tereschkowa|Erste Frau im Weltall
Ursula von der Leyen|Erste Präsidentin der EU-Kommission
Margaret Thatcher|Erste Premierministerin Großbritanniens
Steffi Graf|Golden Slam im Tennis 1988
Serena Williams|23 Grand-Slam-Titel im Einzel
Katarina Witt|Eiskunstlauf-Olympiasiegerin der DDR
Mary Shelley|Schrieb „Frankenstein“
J. K. Rowling|Schrieb „Harry Potter“
Jane Goodall|Erforschte Schimpansen
Rosalind Franklin|Röntgenbilder der DNA-Struktur
Lise Meitner|Physikalische Erklärung der Kernspaltung
Bertha Benz|Erste lange Autofahrt der Geschichte
Clara Zetkin|Initiatorin des Internationalen Frauentags
Hildegard von Bingen|Mittelalterliche Heilkunde & Klostermedizin
Königin Elisabeth II.|Längste Regentschaft eines britischen Monarchen
`);
gen('frau', WOMEN2.concat(WOMEN), r => `Wofür ist ${r[0]} vor allem bekannt?`);
gen('frau', WOMEN2.concat(WOMEN), r => `Wer ist bekannt für: ${r[1]}?`, 0);
const LABEL = rows(`
Gucci|Italien
Prada|Italien
Versace|Italien
Armani|Italien
Dolce & Gabbana|Italien
Chanel|Frankreich
Dior|Frankreich
Louis Vuitton|Frankreich
Hermès|Frankreich
Yves Saint Laurent|Frankreich
Burberry|Großbritannien
Vivienne Westwood|Großbritannien
Calvin Klein|USA
Ralph Lauren|USA
Tommy Hilfiger|USA
Michael Kors|USA
Hugo Boss|Deutschland
Jil Sander|Deutschland
Escada|Deutschland
Zara|Spanien
Mango|Spanien
H&M|Schweden
Uniqlo|Japan
`);
gen('frau', LABEL, r => `Aus welchem Land stammt das Modelabel ${r[0]}?`);
const NICKW = rows(`
Queen B|Beyoncé
RiRi|Rihanna
J.Lo|Jennifer Lopez
Queen of Soul|Aretha Franklin
Mother Monster|Lady Gaga
Material Girl|Madonna
Princess of Pop|Britney Spears
Iron Lady|Margaret Thatcher
Queen of Rock 'n' Roll|Tina Turner
Mutti|Angela Merkel
`);
gen('frau', NICKW, r => `Wer trägt den Spitznamen „${r[0]}“?`);
const FANS = rows(`
Swifties|Taylor Swift
Beyhive|Beyoncé
Little Monsters|Lady Gaga
Arianators|Ariana Grande
Barbz|Nicki Minaj
Navy|Rihanna
Selenators|Selena Gomez
`);
gen('frau', FANS, r => `Wessen Fans nennen sich „${r[0]}“?`);

const MODEL = rows(`
Golf|VW
Passat|VW
Polo|VW
Corsa|Opel
Astra|Opel
Mustang|Ford
Fiesta|Ford
Focus|Ford
911|Porsche
Cayenne|Porsche
Civic|Honda
Corolla|Toyota
Yaris|Toyota
Clio|Renault
Twingo|Renault
Panda|Fiat
Punto|Fiat
Octavia|Škoda
Fabia|Škoda
Leon|Seat
Ibiza|Seat
Qashqai|Nissan
Model 3|Tesla
Countach|Lamborghini
Huracán|Lamborghini
Testarossa|Ferrari
A4|Audi
TT|Audi
M3|BMW
Z4|BMW
`);
gen('mann', MODEL, r => `Von welcher Marke stammt das Automodell „${r[0]}“?`);
const CLUB = rows(`
Die Knappen|FC Schalke 04
Die Geißböcke|1. FC Köln
Die Fohlen|Borussia Mönchengladbach
Die Werkself|Bayer 04 Leverkusen
Die Schwarzgelben|Borussia Dortmund
Die Rothosen|Hamburger SV
Die Roten Teufel|1. FC Kaiserslautern
Die Eisernen|1. FC Union Berlin
Die Wölfe|VfL Wolfsburg
Die Adler|Eintracht Frankfurt
Die Kiezkicker|FC St. Pauli
Die Alte Dame|Hertha BSC
Die Lilien|SV Darmstadt 98
Der Club|1. FC Nürnberg
Die Zebras|MSV Duisburg
Die Löwen|TSV 1860 München
Die Nullfünfer|1. FSV Mainz 05
`);
gen('mann', CLUB, r => `Welcher Verein hat den Spitznamen „${r[0]}“?`);
const STAD = rows(`
Allianz Arena|FC Bayern München
Signal Iduna Park|Borussia Dortmund
Veltins-Arena|FC Schalke 04
Millerntor-Stadion|FC St. Pauli
Stadion An der Alten Försterei|1. FC Union Berlin
Weserstadion|Werder Bremen
Volksparkstadion|Hamburger SV
Fritz-Walter-Stadion|1. FC Kaiserslautern
BayArena|Bayer 04 Leverkusen
Borussia-Park|Borussia Mönchengladbach
RheinEnergieStadion|1. FC Köln
Anfield|FC Liverpool
Old Trafford|Manchester United
Camp Nou|FC Barcelona
Santiago Bernabéu|Real Madrid
`);
gen('mann', STAD, r => `Welcher Verein spielt im Stadion „${r[0]}“?`);

})();
