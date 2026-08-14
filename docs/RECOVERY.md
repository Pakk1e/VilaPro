# ParkPro / Vadovsky Tech — Recovery Procedure

## Purpose

This document describes how to recover the ParkPro backend if the PM2 environment loses `COOKIE_SECRET`.

> **The actual secret must never be stored in GitHub, this document, or any other project file.**

## Production Configuration

| Item | Value |
|---|---|
| Backend | `/home/park-pro/VilaPro/backend/server.js` |
| PM2 Application | `parkpro-api` |
| API Port | `5000` |

The production `COOKIE_SECRET` is stored in the PM2 environment.

A private recovery copy is stored on the server at:

```
/home/park-pro/.parkpro-cookie-secret
```

This file must remain private. Expected permissions:

```
-rw-------
```

## Normal Deployment

Normal deployments are performed with:

```bash
cd /home/park-pro/VilaPro
./deploy.sh
```

The deployment script restarts the existing PM2 process:

```bash
pm2 restart parkpro-api
```

It does **not** recreate the API process with a new environment.

## Checking the Current PM2 Secret

To verify that PM2 has a `COOKIE_SECRET`:

```bash
pm2 env 1 | grep -i COOKIE
```

> Do not copy or publish the returned value.

## Recovery if PM2 Loses COOKIE_SECRET

1. **Verify the recovery file**

   ```bash
   ls -l /home/park-pro/.parkpro-cookie-secret
   ```

   The file should be readable only by the `park-pro` user. Expected permissions:

   ```
   -rw-------
   ```

2. **Load the recovery secret**

   ```bash
   export COOKIE_SECRET="$(cat /home/park-pro/.parkpro-cookie-secret)"
   ```

3. **Restart the API with the restored environment**

   ```bash
   pm2 restart parkpro-api --update-env
   ```

4. **Save the PM2 environment**

   ```bash
   pm2 save
   ```

5. **Verify the API**

   ```bash
   pm2 status
   ```

   The `parkpro-api` process should show:

   ```
   online
   ```

6. **Verify `COOKIE_SECRET` is present**

   ```bash
   pm2 env 1 | grep -i COOKIE
   ```

   > Do not paste the secret value into GitHub, chat, tickets, or documentation.

## Application Verification

After recovering the secret:

1. Open the Vadovsky Tech website.
2. Log in with an existing account.
3. Open ParkPro.
4. Open Calendar.
5. Verify existing reservations are available.
6. Verify existing automations are available.

> Existing encrypted credentials depend on the production `COOKIE_SECRET`. Do not generate a new secret unless you intentionally plan to migrate or re-encrypt the affected data.

## Backup of the Recovery Secret

The private recovery copy is stored at:

```
/home/park-pro/.parkpro-cookie-secret
```

- The file must remain private.
- A second recovery copy should also be stored securely **outside** the server, preferably in a password manager.
- The secret must never be committed to Git.

## Git Security

The following must **never** be committed to GitHub:

- `COOKIE_SECRET`
- `/home/park-pro/.parkpro-cookie-secret`
- `backend/.env`
- `backend/parking.db`
- database backups

The project `.gitignore` is intended to prevent these files from being staged accidentally.

## Emergency Recovery

If both the PM2 environment and the local recovery file are lost, restore the production `COOKIE_SECRET` from the secure off-server backup.

> Do not generate a replacement secret unless a deliberate encryption or data migration is being performed.