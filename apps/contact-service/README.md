# Contact Service

Minimaler Microservice für Kontakt- und Feedback-Nachrichten.

Aktuell werden Anfragen nicht per E-Mail versendet, sondern als JSON-Zeilen in eine Log-Datei geschrieben, damit nichts verloren geht.

Die Log-Datei nutzt Single-File-Rotation: sobald die Datei größer als 10MB wird, werden die ältesten Bytes entfernt und nur die neuesten Einträge behalten.

## Endpoints

- `POST /mail/feedback` mit Body `{ "rating": 1..5, "actorId"?: string, "displayName"?: string }`
- `POST /mail/contact` mit Body `{ "message": string, "actorId"?: string, "displayName"?: string, "replyTo"?: string }`
- `GET /health`

## Environment-Variablen

- Optional: `ALLOWED_ORIGIN` (Fallback: `*`)
- Optional: `CONTACT_LOG_FILE` (Fallback: `apps/contact-service/data/requests.log`)
- Optional: `CONTACT_LOG_MAX_BYTES` (Fallback: `10485760` = 10MB)
- Optional: `PORT` (Fallback: `3002`)

## Lokal starten

```bash
npm install
npm start
```
