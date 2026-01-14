
import asyncio
from src.agents.content_strategist_agent.tools.calendar_tools import add_calendar_entry, set_workspace_id

async def add_more_entries():
    # consistent workspace ID
    workspace_id = "72f4e5fd-00dc-415a-ac82-c58cba21d05b" 
    set_workspace_id(workspace_id)
    
    print(f"Adding extra entries for today (2026-01-14)...")
    
    # YouTube
    print("1. Adding YouTube Entry...")
    yt_result = add_calendar_entry.invoke({
        "scheduled_date": "2026-01-14",
        "platform": "youtube",
        "content_type": "educational",
        "title": "Behind the Scenes: Production",
        "content": "A deep dive into how we make our shoes comfortable and stylish. #design #fashion",
        "scheduled_time": "16:00",
        "video_script": "Intro: Show workshop from wide angle...",
        "hashtags": "design,fashion,bts"
    })
    print(f"YouTube Result: {yt_result}")

    # TikTok
    print("2. Adding TikTok Entry...")
    tt_result = add_calendar_entry.invoke({
        "scheduled_date": "2026-01-14",
        "platform": "tiktok",
        "content_type": "fun",
        "title": "Shoe Flip Challenge",
        "content": "Trying the viral shoe flip challenge! Can we land it? 👟✨",
        "scheduled_time": "18:00",
        "hashtags": "challenge,viral,fun"
    })
    print(f"TikTok Result: {tt_result}")

if __name__ == "__main__":
    asyncio.run(add_more_entries())
