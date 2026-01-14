
import asyncio
from src.agents.content_strategist_agent.tools.calendar_tools import add_calendar_entry, set_workspace_id

async def add_entry():
    # consistent workspace ID
    workspace_id = "72f4e5fd-00dc-415a-ac82-c58cba21d05b" 
    set_workspace_id(workspace_id)
    
    print(f"Adding Instagram entry for today (2026-01-14)...")
    
    result = add_calendar_entry.invoke({
        "scheduled_date": "2026-01-14",
        "platform": "instagram",
        "content_type": "inspirational", # fits instagram well
        "title": "Daily Inspiration",
        "content": "Keep pushing forward! #motivation #goals",
        "scheduled_time": "12:00",
        "hashtags": "motivation,goals,inspiration"
    })
    
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(add_entry())
