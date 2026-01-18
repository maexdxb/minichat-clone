# 📤 GitHub Upload - Schritt für Schritt

## TEIL 1: Lokale Vorbereitung (auf deinem Computer)

### Schritt 1: Alle Dateien zum Commit hinzufügen
```bash
git add .
```
**Was macht das?** Fügt alle Dateien zum "Staging Area" hinzu (bereit zum Hochladen)

### Schritt 2: Commit erstellen (Änderungen speichern)
```bash
git commit -m "Initial commit - Minichat App ready for deployment"
```
**Was macht das?** Erstellt einen "Snapshot" deines Codes mit einer Beschreibung

---

## TEIL 2: GitHub Repository erstellen (im Browser)

### Schritt 1: Zu GitHub gehen
1. Öffne deinen Browser
2. Gehe zu [github.com](https://github.com)
3. **Melde dich an** (oder erstelle einen Account, falls du noch keinen hast)

### Schritt 2: Neues Repository erstellen
1. Klicke oben rechts auf das **+** Symbol
2. Wähle **"New repository"**

### Schritt 3: Repository konfigurieren
Fülle das Formular aus:

**Repository name:** `minichat-clone` (oder ein anderer Name)

**Description (optional):** `Random video chat application with WebRTC`

**Visibility:** 
- ✅ **Public** (empfohlen für Vercel Free Plan)
- ⚠️ **Private** (funktioniert auch, aber du brauchst evtl. Vercel Pro)

**WICHTIG - NICHT ankreuzen:**
- ❌ **NICHT** "Add a README file" ankreuzen
- ❌ **NICHT** ".gitignore" hinzufügen
- ❌ **NICHT** "Choose a license" auswählen

**Warum?** Du hast bereits Code - GitHub soll ein leeres Repository erstellen!

### Schritt 4: Repository erstellen
Klicke auf **"Create repository"**

---

## TEIL 3: Code zu GitHub hochladen (zurück im Terminal)

Nach dem Erstellen zeigt GitHub dir eine Seite mit Befehlen. Du brauchst die Befehle unter:
**"…or push an existing repository from the command line"**

### Schritt 1: Remote hinzufügen
Kopiere die URL deines Repositories. Sie sieht so aus:
```
https://github.com/DEIN-USERNAME/minichat-clone.git
```

Führe dann aus:
```bash
git remote add origin https://github.com/DEIN-USERNAME/minichat-clone.git
```

**Wichtig:** Ersetze `DEIN-USERNAME` mit deinem echten GitHub-Benutzernamen!

**Was macht das?** Verbindet dein lokales Projekt mit dem GitHub-Repository

### Schritt 2: Branch umbenennen (falls nötig)
```bash
git branch -M main
```
**Was macht das?** Benennt deinen Branch von "master" zu "main" um (GitHub-Standard)

### Schritt 3: Code hochladen
```bash
git push -u origin main
```

**Was passiert jetzt?**
- GitHub fragt nach deinem **Benutzernamen**
- Dann nach deinem **Passwort** ODER **Personal Access Token**

⚠️ **WICHTIG:** GitHub akzeptiert seit 2021 keine Passwörter mehr beim Push!
Du brauchst ein **Personal Access Token** (siehe unten)

---

## TEIL 4: Personal Access Token erstellen (falls nötig)

Wenn `git push` nach einem Passwort fragt:

### Schritt 1: Token erstellen
1. Gehe zu GitHub → Klicke auf dein Profilbild (oben rechts)
2. **Settings** → **Developer settings** (ganz unten links)
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token** → **Generate new token (classic)**

### Schritt 2: Token konfigurieren
**Note:** `Vercel Deployment Token`

**Expiration:** `90 days` (oder länger)

**Select scopes:** 
- ✅ Hake **repo** an (alle Unterpunkte werden automatisch ausgewählt)

Klicke auf **Generate token**

### Schritt 3: Token kopieren
⚠️ **WICHTIG:** Kopiere den Token SOFORT! Du siehst ihn nur einmal!

Er sieht so aus: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Schritt 4: Token beim Push verwenden
Wenn `git push` nach einem Passwort fragt:
- **Username:** Dein GitHub-Benutzername
- **Password:** Füge den Token ein (NICHT dein echtes Passwort!)

---

## TEIL 5: Überprüfung

### Erfolgreich hochgeladen? ✅
Wenn alles geklappt hat, siehst du:
```
Enumerating objects: 25, done.
Counting objects: 100% (25/25), done.
...
To https://github.com/DEIN-USERNAME/minichat-clone.git
 * [new branch]      main -> main
```

### Im Browser überprüfen
1. Gehe zu `https://github.com/DEIN-USERNAME/minichat-clone`
2. Du solltest alle deine Dateien sehen! 🎉

---

## Zukünftige Updates hochladen

Wenn du später Änderungen machst:

```bash
# 1. Änderungen hinzufügen
git add .

# 2. Commit erstellen
git commit -m "Beschreibung deiner Änderungen"

# 3. Hochladen
git push
```

Das war's! Viel einfacher als beim ersten Mal 😊

---

## Troubleshooting

### Problem: "remote origin already exists"
**Lösung:**
```bash
git remote remove origin
git remote add origin https://github.com/DEIN-USERNAME/minichat-clone.git
```

### Problem: "Permission denied"
**Lösung:** Du brauchst ein Personal Access Token (siehe TEIL 4)

### Problem: "Updates were rejected"
**Lösung:**
```bash
git pull origin main --rebase
git push origin main
```

### Problem: "fatal: not a git repository"
**Lösung:**
```bash
git init
git add .
git commit -m "Initial commit"
# Dann weiter mit TEIL 3
```

---

## Zusammenfassung - Die 3 wichtigsten Befehle

```bash
# 1. Änderungen vorbereiten
git add .

# 2. Änderungen speichern
git commit -m "Deine Nachricht"

# 3. Zu GitHub hochladen
git push
```

**Das war's!** 🚀

---

## Nächster Schritt

Sobald dein Code auf GitHub ist, kannst du mit **Vercel** weitermachen!
→ Siehe `VERCEL-DEPLOYMENT.md`
