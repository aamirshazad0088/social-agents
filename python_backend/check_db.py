
import os
import asyncio
from dotenv import load_dotenv

# Load env vars from ..\python_backend\.env but we are running from migrations folder maybe?
# Let's just adjust path or assume env vars are loaded if running with uv/dotenv
from src.services.supabase_service import get_supabase_admin_client

async def check_entries():
    try:
        supabase = get_supabase_admin_client()
        # Query for all entries
        result = supabase.table("content_calendar_entries").select("*").execute()
        
        print("\n=== CALENDAR ENTRIES ===")
        print(f"Total entries found: {len(result.data)}")
        
        if result.data:
            print("\nFirst 5 entries:")
            for entry in result.data[:5]:
                print(f"- [{entry.get('scheduled_date')}] {entry.get('title')} (ID: {entry.get('id')})")
                print(f"  Platform: {entry.get('platform')}, Workspace: {entry.get('workspace_id')}")
        else:
            print("No entries found in table 'content_calendar_entries'.")
            
    except Exception as e:
        print(f"Error checking entries: {e}")

if __name__ == "__main__":
    asyncio.run(check_entries())
