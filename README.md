# 🧠 KOPFNUSS – Das Quiz-Duell zu zweit

Ein schnelles, buntes Quiz-Brettspiel fürs Handy, inspiriert von Party-Quizspielen wie *Outsmarted*.
Zwei Handys, ein Code, los geht's. Kein Server, keine Anmeldung.

## So spielt ihr
1. Beide öffnen die App-Adresse (siehe unten) am Handy und tragen Name, Avatar und Farbe ein.
2. Einer tippt auf **Spiel erstellen**. Es erscheint ein 4-stelliger Code.
3. Der andere tippt auf **Mit Code beitreten** und gibt den Code ein.
4. Der Host wählt die Spiellänge (Quickie / Normal / Marathon) und startet.

**Tipp:** Über „Teilen“ → „Zum Home-Bildschirm“ wird KOPFNUSS wie eine echte App gestartet.
Lasst den Bildschirm während des Spiels an. Der Host sollte die App nicht in den Hintergrund schicken.

## Spielprinzip
- **Würfeln und laufen:** Ihr würfelt abwechselnd und lauft über 30 Felder.
- **Immer im Duell:** Jede Frage beantwortet ihr **beide gleichzeitig**. Richtig und schnell bringt bis zu 200 Punkte. Niemand wartet.
- **🔑 Schlüssel:** Auf einem Kategorie-Feld bekommt der Spieler am Zug bei richtiger Antwort den Schlüssel dieser Kategorie.
- **🔐 Tresore:** Davon gibt es 6. Ihr müsst 3 Fragen beantworten: mit Schlüssel reichen 2 richtige, ohne müssen alle 3 stimmen. Ein geknackter Tresor bringt 👑 und +300.
- **Sonderfelder**
  - ⚡ **Blitzrunde:** 5× Wahr/Falsch mit je 5 Sekunden.
  - 🎯 **Schätz-Duell:** Wer näher dran ist, gewinnt.
  - 💘 **Pärchen-Runde:** „Wer von euch beiden …?“ oder „Was sagt dein Schatz?“
  - 🤪 **Quatsch-Runde:** Freie Antwort tippen, der andere bewertet mit 😐 / 😄 / 😂.
  - 🎰 **Glücksrad:** Punkte klauen, Platztausch, Teleport, nochmal würfeln …
- **Finale:** In der letzten Runde gibt es doppelte Punkte. Wer alle 6 Kronen holt, gewinnt sofort.

Kategorien: 🌍 Welt & Reisen · 🌿 Tiere & Garten · 🫀 Körper · 🏎️ Sport & Motor · 📱 Social & Stars (YouTube, TikTok, Streamer, Promis) · 💡 Technik & Alltag

## Online stellen (GitHub Pages)
1. Im Repo auf GitHub: **Settings → Pages**
2. *Source*: „Deploy from a branch“. Wählt den Branch mit diesen Dateien und den Ordner `/ (root)`.
3. Nach ca. 1 Minute läuft die App unter `https://<benutzername>.github.io/<repo>/`.

> GitHub Pages ist bei privaten Repos nur mit GitHub Pro verfügbar. Alternativ macht ihr das Repo öffentlich.
> Oder ihr zieht den Ordner per Drag & Drop auf https://app.netlify.com/drop.

## Technik
- Reines HTML/CSS/JS ohne Build-Schritt. Die Fragen stehen in `questions.js` und lassen sich leicht erweitern.
- Die Handys verbinden sich direkt per WebRTC über [PeerJS](https://peerjs.com) (`peerjs.min.js`, MIT-Lizenz). Der Code dient nur als Treffpunkt.
- Das Handy des Hosts steuert das Spiel, das andere zeigt nur den Zustand an.
- Testmodus am PC: `index.html?local` in zwei Tabs öffnen. Die Verbindung läuft dann über den Browser statt übers Internet.
