import psycopg2
import json

conn = psycopg2.connect('postgresql://postgres.vbllagoyotlrxsdmnyxu:comsats0099@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres')
cur = conn.cursor()

# Check user role
cur.execute("""
    SELECT id, role, workspace_id, is_active FROM users 
    WHERE id = 'a362acaa-1f76-4bd9-9852-71e52a371d9f'
""")
user = cur.fetchone()
print(f"USER: id={user[0]}, role='{user[1]}', workspace_id={user[2]}, is_active={user[3]}")

# Simulate what the credentials endpoint does
cur.execute("""
    SELECT platform, account_id, account_name, page_id, page_name, is_connected, expires_at 
    FROM social_accounts 
    WHERE workspace_id = '72f4e5fd-00dc-415a-ac82-c58cba21d05b'
""")

rows = cur.fetchall()
connected_credentials = []
for row in rows:
    connected_credentials.append({
        'platform': row[0],
        'account_id': row[1],
        'account_name': row[2],
        'page_id': row[3],
        'page_name': row[4],
        'is_connected': row[5],
        'expires_at': str(row[6]) if row[6] else None
    })

# Simulate the response building
VALID_PLATFORMS = ["twitter", "linkedin", "facebook", "instagram", "tiktok", "youtube", "meta_ads"]

status = {}
for platform in VALID_PLATFORMS:
    cred = next((c for c in connected_credentials if c.get("platform") == platform), None)
    
    if cred and cred.get("is_connected"):
        status[platform] = {
            "connected": True,
            "accountId": cred.get("account_id"),
            "accountName": cred.get("account_name"),
            "pageId": cred.get("page_id"),
            "pageName": cred.get("page_name"),
        }
    else:
        status[platform] = {"connected": False}

print("\nAPI RESPONSE:")
print(json.dumps(status, indent=2))

conn.close()
