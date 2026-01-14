
import os
import asyncio
from dotenv import load_dotenv

# Use the actual tools
from src.agents.content_strategist_agent.tools.calendar_tools import add_calendar_entry, set_workspace_id, get_calendar_entries

async def test_tool():
    # 1. Set a workspace ID (using the one from the existing entry to be safe/consistent, or a dummy one)
    # The existing one seen in DB check: 72f4e5fd-00dc-415a-ac82-c58cba21d05b
    workspace_id = "72f4e5fd-00dc-415a-ac82-c58cba21d05b"
    set_workspace_id(workspace_id)
    
    print(f"Testing with Workspace ID: {workspace_id}")
    
    # 2. Try to add an entry for CURRENT week (2026-01-15)
    print("Attempting to add entry via tool...")
    result = add_calendar_entry.invoke({
        "scheduled_date": "2026-01-15",
        "platform": "twitter",
        "content_type": "promotional",
        "title": "Test Entry from Tool Script",
        "content": "This is a test post to verify the tool works.",
        "scheduled_time": "10:00"
    })
    
    print(f"add_calendar_entry result: {result}")
    
    # 3. Verify it exists via get_calendar_entries tool
    print("\nVerifying via get_calendar_entries tool...")
    entries_result = get_calendar_entries.invoke({
        "start_date": "2026-01-14",
        "end_date": "2026-01-16"
    })
    
    print(f"get_calendar_entries result: {entries_result}")

if __name__ == "__main__":
    asyncio.run(test_tool())
