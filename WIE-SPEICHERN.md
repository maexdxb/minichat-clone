# 💾 Projekt Speichern & Wiederherstellen

## ✅ Dein Projekt ist jetzt lokal gespeichert!

**Speicherort:**
```
C:\Users\Max\.gemini\antigravity\scratch\minichat-clone
```

---

## 🔄 Später wieder öffnen:

### 1. Server starten:
```bash
cd C:\Users\Max\.gemini\antigravity\scratch\minichat-clone\server
node server.js
```

### 2. Ngrok starten (für Mobile):
```bash
ngrok http 3000
```

### 3. Browser öffnen:
- **Lokal:** `http://localhost:3000`
- **Mobile:** Ngrok HTTPS URL

---

## ☁️ Auf GitHub hochladen (Empfohlen!):

### Schritt 1: GitHub Account
1. Gehe zu https://github.com
2. Erstelle Account (falls noch nicht vorhanden)
3. Klicke auf "New Repository"
4. Name: `siagechat`
5. Private oder Public wählen
6. **NICHT** "Initialize with README" anklicken
7. "Create repository"

### Schritt 2: Code hochladen
```bash
cd C:\Users\Max\.gemini\antigravity\scratch\minichat-clone

# Verbinde mit GitHub (ersetze USERNAME mit deinem GitHub Username)
git remote add origin https://github.com/USERNAME/siagechat.git

# Pushe den Code
git branch -M main
git push -u origin main
```

### Schritt 3: Fertig! ✅
Dein Code ist jetzt auf GitHub gesichert!

---

## 📥 Von GitHub wiederherstellen:

Auf einem neuen PC:
```bash
# Code herunterladen
git clone https://github.com/USERNAME/siagechat.git
cd siagechat

# Dependencies installieren
cd server
npm install

# Server starten
node server.js
```

---

## 💡 Vorteile von GitHub:

✅ **Backup in der Cloud** - Nie wieder Code verlieren
✅ **Versionskontrolle** - Alle Änderungen nachvollziehbar
✅ **Von überall zugreifen** - Jeder PC, jedes Gerät
✅ **Easy Deployment** - Direkt zu Railway/Vercel deployen
✅ **Zusammenarbeit** - Mit anderen Entwicklern arbeiten

---

## 🚀 Nächste Schritte:

1. ✅ Code auf GitHub pushen (siehe oben)
2. ✅ Später: Deployment auf Railway + Vercel
3. ✅ Custom Domain verbinden

---

## 📝 Wichtige Dateien:

| Datei | Beschreibung |
|-------|--------------|
| `README.md` | Projekt-Dokumentation |
| `.gitignore` | Welche Dateien NICHT hochgeladen werden |
| `server/server.js` | Backend-Server |
| `index.html` | Frontend |
| `config.js` | Konfiguration |

---

## ⚠️ WICHTIG:

**NIEMALS hochladen:**
- ❌ `node_modules/` (wird automatisch ignoriert)
- ❌ `.env` Dateien mit Passwörtern
- ❌ Persönliche Daten

**Alles andere ist sicher!** ✅

---

Erstellt: 18. Januar 2026
