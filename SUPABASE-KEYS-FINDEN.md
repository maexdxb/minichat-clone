# 🔑 Supabase API-Keys finden - Schritt für Schritt

## SCHRITT 1: Bei Supabase einloggen

1. Der Browser sollte bereits offen sein bei: `https://supabase.com/dashboard`
2. Klicke auf **"Continue with GitHub"** (empfohlen)
   - ODER logge dich mit deiner Email ein
3. Autorisiere Supabase (falls gefragt)

---

## SCHRITT 2: Dein Projekt auswählen

Nach dem Login siehst du eine Liste deiner Projekte.

**Hast du bereits ein Projekt?**
- ✅ **JA:** Klicke auf dein Projekt (z.B. "minichat" oder ähnlich)
- ❌ **NEIN:** Klicke auf **"New Project"** und erstelle eins:
  - **Name:** `minichat`
  - **Database Password:** (Wähle ein sicheres Passwort - MERKEN!)
  - **Region:** `Central EU (Frankfurt)`
  - Klicke auf **"Create new project"**
  - ⏱️ Warte ~2 Minuten

---

## SCHRITT 3: API-Keys finden

Sobald du in deinem Projekt bist:

### 3.1 Settings öffnen
1. Schau auf der **linken Seite** (Sidebar)
2. Ganz unten siehst du ein **Zahnrad-Symbol** ⚙️
3. Klicke darauf → **"Settings"**

### 3.2 API-Seite öffnen
1. In den Settings, links im Menü
2. Klicke auf **"API"**

### 3.3 Keys kopieren
Du siehst jetzt zwei wichtige Werte:

**1. Project URL:**
```
https://abcdefghijklmnop.supabase.co
```
📋 Kopiere diese URL!

**2. anon public (API Key):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMjM0NTY3OCwiZXhwIjoxOTI3OTIxNjc4fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
📋 Kopiere diesen Key!

**WICHTIG:** 
- Der Key ist sehr lang (mehrere Zeilen)
- Stelle sicher, dass du den **GANZEN** Key kopierst
- Es ist der Key unter **"anon public"** (NICHT "service_role"!)

---

## SCHRITT 4: Keys auf Vercel eintragen

Jetzt zurück zu Vercel (im anderen Browser-Tab):

### Erstes Feld:
**Key (Name):**
```
VITE_SUPABASE_URL
```

**Value (Wert):**
```
https://abcdefghijklmnop.supabase.co
```
(Deine kopierte Project URL)

### Klicke auf "+ Add More"

### Zweites Feld:
**Key (Name):**
```
VITE_SUPABASE_ANON_KEY
```

**Value (Wert):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(Dein kopierter anon public Key)

---

## SCHRITT 5: Deploy!

1. Klicke auf **"Deploy"** (unten auf Vercel)
2. Warte ~30 Sekunden
3. 🎉 **Fertig!**

---

## 📸 Visuelle Hilfe

### Wo finde ich die Settings?
```
Supabase Dashboard
├── [Dein Projekt Name]
│   ├── Table Editor
│   ├── Authentication
│   ├── Storage
│   ├── ...
│   └── ⚙️ Settings  ← HIER KLICKEN!
```

### Wo finde ich die API-Keys?
```
Settings
├── General
├── Database
├── API  ← HIER KLICKEN!
│   ├── Project URL: https://xxx.supabase.co
│   └── API Keys:
│       ├── anon public: eyJhbG...  ← DIESEN KOPIEREN!
│       └── service_role: eyJhbG... (NICHT diesen!)
├── Auth
└── ...
```

---

## ⚠️ Häufige Fehler

### ❌ Falscher Key kopiert
- **Richtig:** `anon public` Key
- **Falsch:** `service_role` Key (NIEMALS öffentlich verwenden!)

### ❌ Unvollständiger Key
- Der Key ist sehr lang (mehrere Zeilen)
- Kopiere den GANZEN Key bis zum Ende

### ❌ Falsche Variable-Namen
- **Richtig:** `VITE_SUPABASE_URL` (mit VITE_ am Anfang!)
- **Falsch:** `SUPABASE_URL` (ohne VITE_)

---

## 🎯 Zusammenfassung

1. ✅ Bei Supabase einloggen
2. ✅ Projekt auswählen (oder erstellen)
3. ✅ Settings → API öffnen
4. ✅ Project URL kopieren
5. ✅ anon public Key kopieren
6. ✅ Beide auf Vercel eintragen
7. ✅ Deploy klicken

**Das war's!** 🚀

---

## 💡 Brauchst du Hilfe?

Falls du nicht weiterkommst:
- Mach einen Screenshot von dem, was du siehst
- Ich helfe dir sofort weiter!

Viel Erfolg! 😊
