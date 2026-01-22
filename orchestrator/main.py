import sqlite3
import requests
import time
import os
import re
from bs4 import BeautifulSoup # type: ignore
from datetime import datetime

# --- CONFIG ---
BASE_URL = "https://clients.villapro.eu"
GARAGE_SLUG = "sk_ba_panoramacity2"
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'parking.db')

def get_villa_session():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    })

    try:
        # 1. Get credentials
        creds = requests.get("http://127.0.0.1:5000/api/internal/creds").json()

        # 2. PRE-FLIGHT
        login_url = f"{BASE_URL}/login/"
        session.get(login_url, timeout=10)
        csrftoken = session.cookies.get('csrftoken')
        
        # 3. LOGIN
        login_data = {
            "csrfmiddlewaretoken": csrftoken,
            "username": creds['email'],
            "password": creds['password'],
            "next": f"/en/reserv_single/{GARAGE_SLUG}/"
        }
        
        login_headers = {"Referer": login_url}
        post_res = session.post(login_url, data=login_data, headers=login_headers)

        if "Sign in" in post_res.text and "username" in post_res.text:
            print("❌ Login failed: Credentials rejected.")
            return None, None

        # 4. SCRAPE TICKET & ASSETS
        garage_res = session.get(f"{BASE_URL}/en/reserv_single/{GARAGE_SLUG}/")
        html = garage_res.text
        
        t_match = re.search(r"ticket_id\s*[:=]\s*['\"]?(\d+)['\"]?", html)
        ticket_id = t_match.group(1) if t_match else ""
        
        if not ticket_id:
            print("❌ Ticket ID not found.")
            return None, None

        ctx = {
            "csrf": session.cookies.get('csrftoken'),
            "article_id": "273", 
            "ticket_id": ticket_id,
            "misc_url": f"{BASE_URL}/en/reserv_single/misc/{GARAGE_SLUG}/"
        }
        
        print(f"✅ Session Active. Ticket: {ticket_id}")
        return session, ctx

    except Exception as e:
        print(f"❌ Worker Auth Error: {e}")
        return None, None

def sync_villa_month(session, ctx):
    """Uses the REFRESH command to get the precise full_days map."""
    if not session: return

    now = datetime.now()
    try:
        print(f"📡 Requesting REFRESH Map for {now.month}/{now.year}...")
        
        payload = {
            "cmd": "REFRESH",
            "article_id": ctx['article_id'],
            "month": str(now.month),
            "year": str(now.year),
            "csrfmiddlewaretoken": ctx['csrf']
        }
        headers = {
            "Referer": f"{BASE_URL}/en/reserv_single/{GARAGE_SLUG}/",
            "X-Requested-With": "XMLHttpRequest"
        }

        resp = session.post(ctx['misc_url'], data=payload, headers=headers)
        data = resp.json()

        if data.get("status") is True:
            full_days = data.get("full_days", []) # e.g. [20, 21, 23]
            
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("CREATE TABLE IF NOT EXISTS availability (date TEXT PRIMARY KEY, state TEXT)")

            # We update all days in the current month (1-31)
            import calendar
            num_days = calendar.monthrange(now.year, now.month)[1]

            for day in range(1, num_days + 1):
                date_str = f"{now.year}-{now.month:02d}-{day:02d}"
                # If day is in full_days list, it's occupied (Red)
                state = "Full" if day in full_days else "Free"
                cursor.execute("INSERT OR REPLACE INTO availability (date, state) VALUES (?, ?)", (date_str, state))

            conn.commit()
            conn.close()
            print(f"✅ Map Updated. Found {len(full_days)} occupied days.")
        else:
            print(f"⚠️ Refresh command returned False: {data.get('msg')}")

    except Exception as e:
        print(f"❌ Map Sync Error: {e}")

def process_reservation_with_session(session, ctx, task_date, plate, command):
    payload = {
        "cmd": command, 
        "date": task_date, 
        "article_id": ctx['article_id'],
        "ticket_id": ctx['ticket_id'], 
        "car_id": plate, 
        "csrfmiddlewaretoken": ctx['csrf']
    }
    headers = {
        "Referer": f"{BASE_URL}/en/reserv_single/{GARAGE_SLUG}/",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": BASE_URL
    }
    try:
        response = session.post(ctx['misc_url'], data=payload, headers=headers, timeout=10)
        
        if "application/json" in response.headers.get("Content-Type", ""):
            data = response.json()
            if data.get("status") is True:
                return "Success"
            return data.get("msg", "Refused")
        else:
            return "SESSION_EXPIRED"
            
    except Exception as e:
        return f"Network Error: {e}"

def main_loop():
    print("🚀 Sniper Worker Active...")
    last_sync = 0
    cached_session = None
    cached_ctx = None
    
    while True:
        now = time.time()
        
        # 1. SESSION MANAGEMENT (Every 5 mins)
        if not cached_session or (now - last_sync > 300):
            print("🔄 Triggering Scheduled Session & Map Refresh...")
            cached_session, cached_ctx = get_villa_session()
            if cached_session:
                sync_villa_month(cached_session, cached_ctx)
                last_sync = now
            else:
                print("❌ Session refresh failed. Retrying in 30s...")
                time.sleep(30)
                continue

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # 2. PROCESS BOOKINGS
            cursor.execute("SELECT id, date, plate_number, status FROM reservations WHERE status IN ('Pending', 'Full')")
            tasks = cursor.fetchall()
            
            for tid, tdate, plate, status in tasks:
                print(f"🎯 {'SNIPING' if status == 'Full' else 'PROCESSING'}: {tdate}")
                result = process_reservation_with_session(cached_session, cached_ctx, tdate, plate, "ADD")
                
                if result == "SESSION_EXPIRED":
                    cached_session = None
                    break 

                if result == "Success":
                    cursor.execute("UPDATE reservations SET status='Reserved', retry_log='OK' WHERE id=?", (tid,))
                    sync_villa_month(cached_session, cached_ctx) # Refresh map immediately
                elif "již bylo uživatelem rezervováno" in result or "already reserved" in result.lower():
                    # Treat 'Already Reserved' as a successful booking
                    cursor.execute("UPDATE reservations SET status='Reserved', retry_log='Confirmed (Already set)' WHERE id=?", (tid,))
                    print(f"ℹ️ {tdate} was already reserved. Marking as Reserved.")
                    sync_villa_month(cached_session, cached_ctx)
                elif "kapacita" in result.lower() or "full" in result.lower():
                    cursor.execute("UPDATE reservations SET status='Full', retry_log='Waiting...' WHERE id=?", (tid,))
                else:
                    cursor.execute("UPDATE reservations SET retry_log=? WHERE id=?", (result[:50], tid))

            # 3. PROCESS DELETIONS
            cursor.execute("SELECT id, date, plate_number FROM reservations WHERE status='Pending_Delete'")
            deletes = cursor.fetchall()
            for tid, tdate, plate in deletes:
                res = process_reservation_with_session(cached_session, cached_ctx, tdate, plate, "DEL")
                if res == "Success":
                    cursor.execute("DELETE FROM reservations WHERE id=?", (tid,))
                    sync_villa_month(cached_session, cached_ctx) # Refresh map immediately
                else:
                    cursor.execute("UPDATE reservations SET status='Delete_Failed', retry_log=? WHERE id=?", (res[:50], tid))

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"⚠️ Loop Error: {e}")

        time.sleep(10)

if __name__ == "__main__":
    main_loop()