# 🚂 Railway Server Deployment - Schritt für Schritt

## Warum Railway?

✅ **Server läuft 24/7** (auch wenn dein PC aus ist)  
✅ **Kostenlos** für kleine Projekte (5$ Guthaben/Monat)  
✅ **Automatische Updates** bei Git-Push  
✅ **HTTPS** automatisch  
✅ **WebSocket-Support** (wichtig für WebRTC!)

---

## SCHRITT 1: Railway Account erstellen

1. Der Browser sollte bereits offen sein bei: `https://railway.app`
2. Klicke auf **"Login"** (oben rechts)
3. Wähle **"Login with GitHub"**
4. Autorisiere Railway (falls gefragt)

---

## SCHRITT 2: Neues Projekt erstellen

1. Nach dem Login: Klicke auf **"New Project"** oder **"Deploy a new project"**
2. Wähle **"Deploy from GitHub repo"**
3. Du siehst deine GitHub-Repositories
4. Wähle **"maexdxb/minichat-clone"**
5. Klicke auf **"Deploy Now"** oder **"Add variables"**

---

## SCHRITT 3: Root Directory konfigurieren

**WICHTIG:** Railway muss wissen, dass der Server im `server`-Ordner liegt!

1. Klicke auf dein Deployment (das gerade erstellt wurde)
2. Gehe zu **"Settings"** (oben)
3. Scrolle zu **"Root Directory"**
4. Trage ein: `server`
5. Klicke auf **"Update"** oder die Änderung wird automatisch gespeichert

---

## SCHRITT 4: Environment Variables setzen (Optional)

Falls du Supabase verwendest:

1. Gehe zu **"Variables"** (oben)
2. Klicke auf **"+ New Variable"**
3. Füge hinzu:

```
SUPABASE_URL = https://jpvvlmqcqxmreffjhfvm.supabase.co
SUPABASE_ANON_KEY = [Dein Key]
```

---

## SCHRITT 5: Deployment starten

1. Railway deployed automatisch!
2. Warte ~1-2 Minuten
3. Du siehst Logs im **"Deployments"**-Tab

---

## SCHRITT 6: Domain kopieren

1. Gehe zu **"Settings"**
2. Scrolle zu **"Networking"** oder **"Domains"**
3. Klicke auf **"Generate Domain"**
4. Du bekommst eine URL wie:
   ```
   https://minichat-clone-production.up.railway.app
   ```
5. **📋 KOPIERE DIESE URL!** (Du brauchst sie gleich)

---

## SCHRITT 7: Frontend aktualisieren

Jetzt müssen wir dem Frontend sagen, wo der Server ist!

### 7.1 config.js anpassen

Öffne `config.js` und ändere:

**Vorher:**
```javascript
signalingServer: window.location.origin,
```

**Nachher:**
```javascript
signalingServer: 'https://minichat-clone-production.up.railway.app',
```

(Ersetze die URL mit deiner Railway-URL!)

### 7.2 Supabase-Keys aktualisieren

Ändere auch:

**Vorher:**
```javascript
supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
},
```

**Nachher:**
```javascript
supabase: {
    url: 'https://jpvvlmqcqxmreffjhfvm.supabase.co',
    anonKey: 'ek_publishable_...' // Dein echter Key
},
```

---

## SCHRITT 8: Änderungen zu GitHub pushen

```bash
git add config.js
git commit -m "Update signaling server URL to Railway"
git push
```

Vercel deployed automatisch das Frontend neu!

---

## SCHRITT 9: Testen!

1. Warte ~30 Sekunden (Vercel Deployment)
2. Öffne deine Vercel-URL auf **2 Geräten** (PC + Handy)
3. Klicke auf beiden auf **"Suchen"**
4. **Ihr solltet euch jetzt finden!** 🎉

---

## 🔍 Überprüfung

### Server läuft?
Öffne deine Railway-URL im Browser:
```
https://deine-railway-url.up.railway.app
```

Du solltest sehen:
```
Siagechat Signaling Server is running!
```

### Logs ansehen
1. Railway Dashboard → Dein Projekt
2. Klicke auf **"Deployments"**
3. Sieh dir die Logs an

---

## 💰 Kosten

**Railway Free Plan:**
- ✅ 5$ Guthaben/Monat (kostenlos)
- ✅ ~500 Stunden Laufzeit
- ✅ Ausreichend für kleine bis mittlere Projekte

**Für deine App:** Sollte im kostenlosen Rahmen bleiben! 🎉

---

## 🔄 Automatische Updates

Ab jetzt:
1. Du änderst Code
2. Du pushst zu GitHub
3. **Railway** deployed den Server automatisch
4. **Vercel** deployed das Frontend automatisch

**Alles automatisch!** 🚀

---

## ⚠️ Troubleshooting

### Problem: "Application failed to respond"
**Lösung:** 
- Überprüfe, ob **Root Directory** auf `server` gesetzt ist
- Gehe zu Settings → Root Directory → `server`

### Problem: "Port already in use"
**Lösung:** Railway setzt den Port automatisch über `process.env.PORT`
- Überprüfe `server.js`: `const PORT = process.env.PORT || 3000;`

### Problem: "Module not found"
**Lösung:**
- Railway installiert automatisch Dependencies aus `package.json`
- Überprüfe, ob `server/package.json` existiert

### Problem: Nutzer finden sich nicht
**Lösung:**
- Überprüfe `config.js` - ist die Railway-URL richtig?
- Öffne Browser-Konsole (F12) - siehst du Fehler?
- Überprüfe Railway-Logs

---

## 📊 Zusammenfassung

**Was läuft wo:**

| Komponente | Hosting | URL |
|------------|---------|-----|
| Frontend (HTML/CSS/JS) | Vercel | `https://minichat-clone.vercel.app` |
| Signaling Server | Railway | `https://xxx.up.railway.app` |
| Datenbank (Supabase) | Supabase | `https://xxx.supabase.co` |

**Alle 3 laufen 24/7 in der Cloud!** ☁️

---

## 🎯 Nächste Schritte

1. ✅ Railway-Server deployen
2. ✅ Domain kopieren
3. ✅ `config.js` aktualisieren
4. ✅ Zu GitHub pushen
5. ✅ Testen!

**Viel Erfolg!** 🚀

Bei Fragen oder Problemen: Ich helfe dir sofort weiter! 😊
