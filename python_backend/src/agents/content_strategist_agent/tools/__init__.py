"""Content Strategist Agent - Tools Package

Simplified calendar tools - no IDs required!

Available tools:
- web_search: Search the web

Calendar - View:
- get_today_entries: See today's schedule
- get_tomorrow_entries: See tomorrow's schedule  
- get_week_calendar: See full week

Calendar - Add:
- add_calendar_entry: Add single entry
- add_weekly_content_plan: Add full week at once

Calendar - Modify (no IDs needed):
- find_and_update_entry: Find by title/date/platform and update
- find_and_delete_entry: Find and delete
- clear_day: Clear all entries for a day
"""
from .tools import web_search
from .calendar_tools import (
    get_today_entries,
    get_tomorrow_entries,
    get_week_calendar,
    add_calendar_entry,
    add_weekly_content_plan,
    find_and_update_entry,
    find_and_delete_entry,
    clear_day,
    set_workspace_id,
)

__all__ = [
    "web_search",
    "get_today_entries",
    "get_tomorrow_entries",
    "get_week_calendar",
    "add_calendar_entry",
    "add_weekly_content_plan",
    "find_and_update_entry",
    "find_and_delete_entry",
    "clear_day",
    "set_workspace_id",
]
