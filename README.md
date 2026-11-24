# 🧠 KOPFNUSS – Das Quiz-Duell zu zweit

Ein schnelles, buntes Quiz-Brettspiel fürs Handy, inspiriert von Party-Quizspielen wie *Outsmarted*.
Zwei Handys, ein Code, los geht's. Kein Server, keine Anmeldung.

## So spielt ihr
1. Beide öffnen die App-Adresse (siehe unten) am Handy und tragen Name, Avatar und Farbe ein.
2. Einer tippt auf **Spiel erstellen**. Es erscheint ein 4-stelliger Code.
3. Der andere tippt auf **Mit Code beitreten** und gibt den Code ein.
4. Der Host wählt die Spiellänge (Quickie / Normal / Marathon) und startet.

**Allein reinschnuppern:** Mit „🤖 Übungsspiel gegen den Computer“ spielst du gegen Robo. Übungsspiele zählen nicht in die Statistik.

**Tipp:** Über „Teilen“ → „Zum Home-Bildschirm“ wird KOPFNUSS wie eine echte App gestartet.
Lasst den Bildschirm während des Spiels an. Der Host sollte die App nicht in den Hintergrund schicken.

## Spielprinzip
- **Figur basteln:** Wähle Körper (Mann/Frau), ein beliebiges Emoji als Kopf und eine Farbe.
- **Taktisch würfeln:** Du würfelst mit 2 Würfeln und wählst, welchen du nimmst und ob du vor- oder rückwärts läufst. Bei einem Pasch darfst du auch doppelt so weit gehen. Die möglichen Ziele leuchten auf dem 3D-Brett.
- **Immer im Duell:** Jede Frage beantwortet ihr **beide gleichzeitig**. Richtig und schnell bringt bis zu 200 Punkte.
- **🗺️ Großes Brett (9×11):** Außen ein Ring, vier Wege führen nach innen in den **🏛️ Tresorraum**. An Kreuzungen wählst du selbst die Richtung.
- **🔑 Schlüssel sammeln:** Kategorie-Felder im Ring sind Schlüssel-Fragen. Pro Kategorie brauchst du **3 Schlüssel**.
- **🔐 Tresore:** Erst mit 3 Schlüsseln einer Kategorie darfst du in den Tresorraum. Dort reichen 2 von 3 richtigen Fragen, das bringt 👑 und +300.
- **Keine Wiederholungen:** Die App merkt sich gespielte Fragen über Spiele hinweg. Eine Frage kommt erst wieder, wenn alle anderen ihres Stapels durch sind. Insgesamt sind es über 1.700 Fragen und Aufgaben.
- **Sonderfelder**
  - ⚡ **Blitzrunde:** Wahr/Falsch mit je 5 Sekunden
  - 🎯 **Schätz-Duell:** Wer näher dran ist, gewinnt
  - 💘 **Pärchen-Runde:** „Wer von euch beiden …?“ oder „Was sagt dein Schatz?“
  - 🤪 **Quatsch-Runde:** Freie Antwort, der andere bewertet
  - 🎰 **Glücksrad**
- **Finale:** Die letzte Runde zählt doppelt.
- **Neue Modi:**
  - 🧠 **Gedankenleser:** 2 Runden, die Rollen werden getauscht
  - 🃏 **Bluffmeister**
  - 😜 **Emoji-Übersetzer**
  - ✏️ **Kritzel-Kopf**
  - ❓ **Überraschungsfeld**
- **Spannung:**
  - Serien-Bonus bei Übereinstimmungen
  - Handicap: Wer führt, hat weniger Zeit
  - Comeback-Risikorunde ab 400 Punkten Rückstand
- **Verliebt / Freunde:** Verliebt bringt zusätzliche, heißere Fragen. Bei Freunde werden alle Romantik-Fragen aussortiert.
- **Freischalten:** Hüte, Brillen und Effekte für deine Figur gibt es durch gespielte Spiele und Siege.
- **Statistik:** Auf der Startseite stehen deine Bilanz, Trefferquote, Stärken pro Kategorie und das Duell-Ergebnis gegen deinen Schatz.

**Kategorien** (11): 🌍 Welt & Reisen · 🗺️ Erdkunde · 🌿 Tiere & Garten · 🫀 Körper & Gesundheit · 🏎️ Sport & Motor · 📱 Social & Stars · 💡 Technik & Alltag · 📺 Trash-TV · 🤯 Woher weißt du das?! · 💃 Alles rund um die Frau · 🧔 Alles rund um den Mann

**Modi:**
- **Alles muss rein:** alle Kategorien
- **Caro-Modus:** ohne Sport & Technik
- **Individuell:** selbst auswählen, mindestens 3

## Online stellen (GitHub Pages)
1. Im Repo auf GitHub: **Settings → Pages**
2. *Source*: „Deploy from a branch“. Wählt den Branch mit diesen Dateien und den Ordner `/ (root)`.
3. Nach ca. 1 Minute läuft die App unter `https://<benutzername>.github.io/<repo>/`.

> GitHub Pages ist bei privaten Repos nur mit GitHub Pro verfügbar. Alternativ macht ihr das Repo öffentlich.
> Oder ihr zieht den Ordner per Drag & Drop auf https://app.netlify.com/drop.

## Technik
- Reines HTML/CSS/JS ohne Build-Schritt. Die Fragen stehen in `questions*.js` (über 1.700 Stück) und lassen sich leicht erweitern.
- **Verbindung (dreifach abgesichert):** Die Handys verbinden sich gleichzeitig über zwei öffentliche MQTT-Nachrichten-Server (EMQX & HiveMQ, per WebSocket) und direkt per WebRTC ([PeerJS](https://peerjs.com)). Es reicht, wenn einer dieser Wege durchkommt. Doppelte Nachrichten werden aussortiert. Bibliotheken: `mqtt.min.js` und `peerjs.min.js` (beide MIT-Lizenz).
- Das Handy des Hosts steuert das Spiel, das andere zeigt nur den Zustand an.
- Testmodus am PC: `index.html?local` in zwei Tabs öffnen. Die Verbindung läuft dann über den Browser statt übers Internet.
