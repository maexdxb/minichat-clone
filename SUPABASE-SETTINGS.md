# 🔐 Supabase Login Fix für Vercel

Du landest aktuell auf der Render-Seite, weil Supabase aus Sicherheitsgründen nur ihm bekannte URLs für den Login erlaubt. Da wir jetzt Vercel nutzen, müssen wir das in Supabase freischalten.

## Anleitung

1.  Öffne dein [Supabase Dashboard](https://supabase.com/dashboard).
2.  Klicke links auf **Authentication** (das Schloss-Symbol).
3.  Klicke im Untermenü auf **URL Configuration**.
4.  Scrolle zu **Redirect URLs**.
5.  Klicke auf **Add URL** und füge folgende Zeile hinzu:

    ```text
    https://minichat-clone.vercel.app
    ```

    *(Zur Sicherheit kannst du auch `https://minichat-clone.vercel.app/` mit Slash am Ende hinzufügen)*

6.  **Site URL:** Du kannst (musst aber nicht) die "Site URL" oben auch auf deine Vercel-Adresse ändern, damit sie der neue Standard ist.
7.  Klicke auf **Save**.

---

### Warum ist das so?
Dein Code (`auth.js`) ist schlau und sagt Supabase: *"Bitte leite mich nach dem Login genau auf die Seite zurück, wo ich hergekommen bin (Vercel)"*.
Supabase sagt aber: *"Ich kenne Vercel nicht, ich leite dich zur Sicherheit auf die mir bekannte Hauptseite (Render) zurück."*

Sobald du die URL eingetragen hast, führt Supabase den Befehl deines Codes aus und du bleibst auf Vercel! 🚀
