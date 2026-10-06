# U-GYM Portal — schede e gestione globale

Questa versione migliora il flusso di costruzione delle schede e rende la palestra opzionale nei contenuti del portale.

## 1. Installazione

```bash
npm install
npm run dev
```

## 2. Firebase

Il progetto è già predisposto per il progetto Firebase `u-gym-52fce` tramite `.firebaserc`.

Crea `.env` nella root del portale con la configurazione della Web App Firebase:

```env
VITE_FIREBASE_API_KEY=LA_TUA_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=u-gym-52fce.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=u-gym-52fce
VITE_FIREBASE_STORAGE_BUCKET=u-gym-52fce.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=24001570944
VITE_FIREBASE_APP_ID=IL_TUO_APP_ID
```

## 3. Regole Firestore

Non esiste una migrazione di "tabelle" da eseguire: Firestore crea le collection/documenti quando vengono scritti.

Per risolvere i permessi di `clients` e `trainers` e consentire al builder di creare/modificare i contenuti, questa versione include `firestore.rules`. Il file limita la sincronizzazione del campo `users/{uid}.trainer_id` agli account amministrativi (`admin` claim oppure ruolo `gym_owner`, `gym_admin` o `trainer_admin`).

Dalla root del portale:

```bash
firebase login
firebase use u-gym-52fce
firebase deploy --only firestore:rules
```

### ATTENZIONE sicurezza

Le regole incluse usano `request.auth != null`: qualunque utente autenticato può modificare le collection del portale. È una soluzione semplice per la fase di sviluppo e test.

Prima della pubblicazione conviene passare a un vero ruolo `portalAdmin`/custom claim, così i clienti del client non potranno modificare i dati del portale.

## Immagini di corsi ed eventi

Nel form di un corso o di un evento puoi caricare un'immagine facoltativa (JPEG, PNG o WebP, massimo 5 MB). Il browser la ridimensiona e comprime prima di salvarla nel campo `image_url` del documento Firestore come data URI (`data:image/jpeg;base64,...`). Non viene usato Firebase Storage e non serve attivarlo o configurare nuove regole.

Le immagini compresse sono limitate a 450 KiB per lasciare spazio agli altri dati nel limite Firestore di 1 MiB per documento. Restano soggette alle quote gratuite Firestore: usa immagini solo quando servono. Il client mobile deve leggere `image_url` e renderizzare anche URI `data:image/jpeg;base64,...` oltre ai normali URL.

Per assegnare un personal trainer a un cliente, crea prima il trainer nella sezione **Trainer**, poi selezionalo nel form del cliente. Il portale aggiorna `clients.trainer_id` e, se esiste il profilo Firebase dell'utente collegato, anche `users/{uid}.trainer_id`, usato dal client per le funzioni PT.

## 4. Nuovo flusso schede

La navigazione principale usa **Costruisci scheda** come punto unico per creare i giorni e collegare gli esercizi.

- `Catalogo esercizi`: crea il singolo esercizio.
- `Costruisci scheda`: crea i giorni e collega gli esercizi già presenti nel catalogo.
- `Giorni scheda` non è più una voce principale del menu.
- Un esercizio senza giorno resta nel catalogo e può essere collegato dal builder.
- Serie, carico, muscolo, GIF e note restano sul documento `exercises`, compatibile con la struttura client esistente.

Il builder collega un esercizio esistente al giorno tramite `scheda_day_id`. Se lo rimuovi dal giorno, torna nel catalogo libero.

## 5. Palestra opzionale / contenuto globale

Nei contenuti che hanno `gym_id`, la selezione è ora facoltativa.

- Palestra selezionata → contenuto associato a quella palestra.
- Nessuna palestra → documento globale, pensato per essere disponibile a tutte le palestre.

Il portale salva un contenuto globale senza `gym_id`.

### Nota importante sul client

Perché un contenuto globale sia effettivamente mostrato dal **client** a tutte le palestre, il client deve implementare il fallback:

1. caricare i contenuti della palestra;
2. aggiungere i contenuti senza `gym_id`;
3. evitare duplicati.

La versione portale non può modificare automaticamente il codice già installato del client. Per promo/notifiche/eventi il client U-Gym che abbiamo preparato ha già una logica di fallback; per le schede/esercizi conviene applicare la stessa logica quando aggiorneremo il client.

## 6. Build

```bash
npm run build
```

Se Vite segnala un errore, invia l'errore completo.

## Aggiornamento Builder schede
Il portale ora usa il modello `schede` -> `scheda_days` -> `scheda_exercises` -> `exercises`. Questo permette più schede, giorni ordinabili e parametri dell'esercizio specifici per ogni scheda. I vecchi record `scheda_days`/`exercises` restano leggibili dal client in modalità compatibilità.

### Firestore
Dopo aver aggiornato il progetto esegui:
```bash
firebase use u-gym-52fce
firebase deploy --only firestore:rules
```
Non esiste una migrazione SQL da eseguire: Firestore crea automaticamente le nuove collection al primo salvataggio. Le nuove collection sono `schede` e `scheda_exercises`.


## Gestione schede v5

Il Builder consente di modificare, duplicare ed eliminare schede e giorni; la duplicazione mantiene anche gli esercizi collegati. Dal catalogo Esercizi e dalle anagrafiche Trainer/Clienti è possibile modificare, duplicare ed eliminare i record. L'eliminazione di un esercizio rimuove anche i relativi collegamenti `scheda_exercises`.
