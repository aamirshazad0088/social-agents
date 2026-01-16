"""
SDK Lead Forms Service
Meta Business SDK - LeadgenForm

Uses:
- facebook_business.adobjects.LeadgenForm
- Create and manage lead generation forms
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.page import Page
from facebook_business.adobjects.leadgenform import LeadgenForm
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class LeadFormsService:
    """Service for lead form management using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        from ...config import settings
        FacebookAdsApi.init(
            app_id=settings.FACEBOOK_APP_ID,
            app_secret=settings.FACEBOOK_APP_SECRET,
            access_token=self.access_token,
            api_version="v24.0"
        )
    
    def _get_lead_forms_sync(
        self,
        page_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get all lead forms for a page."""
        try:
            self._init_api()
            page = Page(page_id)
            
            forms = page.get_lead_gen_forms(
                fields=[
                    LeadgenForm.Field.id,
                    LeadgenForm.Field.name,
                    LeadgenForm.Field.status,
                    LeadgenForm.Field.leads_count,
                    LeadgenForm.Field.created_time,
                    LeadgenForm.Field.expired_leads_count,
                    LeadgenForm.Field.follow_up_action_url,
                    LeadgenForm.Field.privacy_policy_url,
                ],
                params={"limit": limit}
            )
            
            result = []
            for form in forms:
                result.append({
                    "id": form.get("id"),
                    "name": form.get("name"),
                    "status": form.get("status"),
                    "leads_count": form.get("leads_count", 0),
                    "expired_leads_count": form.get("expired_leads_count", 0),
                    "created_time": form.get("created_time"),
                    "privacy_policy_url": form.get("privacy_policy_url"),
                    "follow_up_action_url": form.get("follow_up_action_url")
                })
            
            return {"success": True, "forms": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get lead forms error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_lead_forms(
        self,
        page_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_lead_forms_sync,
            page_id,
            limit
        )
    
    def _create_lead_form_sync(
        self,
        page_id: str,
        name: str,
        questions: List[Dict[str, Any]],
        privacy_policy_url: str,
        thank_you_page_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new lead form.
        
        questions format:
        [
            {"type": "FULL_NAME"},
            {"type": "EMAIL"},
            {"type": "PHONE"},
            {"type": "CUSTOM", "key": "company", "label": "Company Name"}
        ]
        """
        try:
            self._init_api()
            page = Page(page_id)
            
            params = {
                "name": name,
                "questions": questions,
                "privacy_policy": {"url": privacy_policy_url},
                "follow_up_action_url": thank_you_page_url or privacy_policy_url,
            }
            
            form = page.create_lead_gen_form(params=params)
            
            return {
                "success": True,
                "form_id": form.get("id"),
                "name": name
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Create lead form error: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_lead_form(
        self,
        page_id: str,
        name: str,
        questions: List[Dict[str, Any]],
        privacy_policy_url: str,
        thank_you_page_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._create_lead_form_sync,
            page_id,
            name,
            questions,
            privacy_policy_url,
            thank_you_page_url
        )
    
    def _get_leads_sync(
        self,
        form_id: str,
        limit: int = 25,
        after: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get leads from a form with cursor pagination."""
        try:
            self._init_api()
            form = LeadgenForm(form_id)
            
            params = {"limit": limit}
            if after:
                params["after"] = after
            
            leads = form.get_leads(
                fields=["id", "created_time", "field_data"],
                params=params
            )
            
            result = []
            for lead in leads:
                field_data = {}
                for field in lead.get("field_data", []):
                    field_data[field.get("name")] = field.get("values", [None])[0]
                
                result.append({
                    "id": lead.get("id"),
                    "created_time": lead.get("created_time"),
                    "data": field_data
                })
            
            # Extract pagination cursor
            paging = {}
            if "paging" in leads:
                paging = {
                    "cursors": leads["paging"].get("cursors", {}),
                    "next": leads["paging"].get("next")
                }
            
            return {
                "success": True, 
                "leads": result,
                "paging": paging
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get leads error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_leads(
        self,
        form_id: str,
        limit: int = 25,
        after: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_leads_sync,
            form_id,
            limit,
            after
        )


# Standard question types
LEAD_FORM_QUESTION_TYPES = [
    "FULL_NAME",
    "FIRST_NAME",
    "LAST_NAME",
    "EMAIL",
    "PHONE",
    "STREET_ADDRESS",
    "CITY",
    "STATE",
    "ZIP",
    "COUNTRY",
    "COMPANY_NAME",
    "JOB_TITLE",
    "WORK_EMAIL",
    "WORK_PHONE",
    "DOB",
    "CUSTOM"
]
