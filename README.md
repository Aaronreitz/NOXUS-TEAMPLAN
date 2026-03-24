# Noxus Teamplan

Eine Desktop-App zur monatlichen Schichtplanung – gebaut mit HTML, Tailwind CSS und Electron.

## Download

👉 **[Neueste Version herunterladen](https://github.com/Aaronreitz/NOXUS-TEAMPLAN/releases/latest)**

1. `NoxusTeamplan.zip` herunterladen
2. Zip entpacken
3. `Noxus Teamplan.exe` starten – fertig, keine Installation nötig

## Features

- Monatliche Schichtübersicht als Tabelle
- Spalten dynamisch hinzufügen & benennen
- Soll- und Ist-Stunden, Rufbereitschaften, Nachtbereitschaften und Tage pro Spalte
- Nachtbereitschaft (N) trägt automatisch ein X am Folgetag ein
- Excel-Export als Dienstplan mit Kommentarspalte
- Dunkles Noxus-Design

## Entwicklung

Voraussetzungen: [Node.js](https://nodejs.org/) v18+

```bash
npm install
npm start
```

## Build (ZIP)

Erstellt `dist/NoxusTeamplan.zip` zum Verteilen:

```bash
npm run build
```

## Lizenz

[GPL v3](LICENSE) – frei nutzbar und veränderbar, aber Änderungen müssen ebenfalls unter GPL v3 veröffentlicht werden.
