"""
SDK Reach Estimation Service
Meta Business SDK - ReachFrequencyPrediction

Uses:
- facebook_business.adobjects.reachfrequencyprediction
- Estimate audience reach before campaign launch
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.reachfrequencyprediction import ReachFrequencyPrediction
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class ReachEstimationService:
    """Service for reach and frequency prediction using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _get_reach_estimate_sync(
        self,
        account_id: str,
        targeting_spec: Dict[str, Any],
        optimization_goal: str = "REACH",
        budget: int = 10000,  # Default $100 if not provided
        currency: str = "USD",
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        prediction_mode: int = 0
    ) -> Dict[str, Any]:
        """
        Get reach estimate for targeting spec.
        
        Args:
            account_id: Ad account ID
            targeting_spec: Targeting specification dict
            optimization_goal: Campaign optimization goal
            budget: Budget in cents (e.g. 1000 = $10.00)
            currency: Currency code
            start_time: Unix timestamp for start
            end_time: Unix timestamp for end
            prediction_mode: 0 = Reach, 1 = Impression
        """
        try:
            from facebook_business.api import FacebookAdsApi
            FacebookAdsApi.init(access_token=self.access_token)
            
            account = AdAccount(f"act_{account_id}")
            
            # Default time window: Next 24h to 7 days if not provided
            if not start_time:
                start_time = int((datetime.now() + timedelta(hours=1)).timestamp())
            
            if not end_time:
                # Default to 7 days duration
                end_time = int((datetime.fromtimestamp(start_time) + timedelta(days=7)).timestamp())
            
            # Create prediction params per v24.0 spec
            params = {
                "targeting_spec": targeting_spec,
                "objective": optimization_goal,
                "prediction_mode": prediction_mode,
                "budget_to_calculate_for": budget,  # Dynamic budget
                "start_time": start_time,
                "stop_time": end_time,
                "currency": currency
            }
            
            # Create prediction
            prediction = account.create_reach_frequency_prediction(params=params)
            
            return {
                "success": True,
                "prediction_id": prediction.get("id"),
                "reach_estimate": prediction.get("prediction_reach", 0),
                "frequency": prediction.get("prediction_frequency", 0),
                "impressions": prediction.get("prediction_impressions", 0),
                "budget": prediction.get("prediction_budget", 0),
                "curve_budget_reach": prediction.get("curve_budget_reach", [])
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Reach estimation error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_reach_estimate(
        self,
        account_id: str,
        targeting_spec: Dict[str, Any],
        optimization_goal: str = "REACH",
        budget: int = 10000,
        currency: str = "USD",
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        prediction_mode: int = 0
    ) -> Dict[str, Any]:
        """Async wrapper for reach estimation."""
        return await asyncio.to_thread(
            self._get_reach_estimate_sync,
            account_id,
            targeting_spec,
            optimization_goal,
            budget,
            currency,
            start_time,
            end_time,
            prediction_mode
        )
    
    def _get_delivery_estimate_sync(
        self,
        account_id: str,
        targeting_spec: Dict[str, Any],
        optimization_goal: str = "LINK_CLICKS"
    ) -> Dict[str, Any]:
        """
        Get delivery estimate for ad set targeting.
        Uses the delivery_estimate edge on ad account.
        """
        try:
            from facebook_business.api import FacebookAdsApi
            FacebookAdsApi.init(access_token=self.access_token)
            
            account = AdAccount(f"act_{account_id}")
            
            estimates = account.get_delivery_estimate(
                params={
                    "targeting_spec": targeting_spec,
                    "optimization_goal": optimization_goal,
                }
            )
            
            if estimates:
                est = estimates[0] if isinstance(estimates, list) else estimates
                return {
                    "success": True,
                    "daily_outcomes_curve": est.get("daily_outcomes_curve", []),
                    "estimate_dau": est.get("estimate_dau", 0),
                    "estimate_mau": est.get("estimate_mau", 0),
                    "estimate_ready": est.get("estimate_ready", False)
                }
            
            return {"success": True, "estimate_dau": 0, "estimate_mau": 0}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Delivery estimation error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_delivery_estimate(
        self,
        account_id: str,
        targeting_spec: Dict[str, Any],
        optimization_goal: str = "LINK_CLICKS"
    ) -> Dict[str, Any]:
        """Async wrapper for delivery estimation."""
        return await asyncio.to_thread(
            self._get_delivery_estimate_sync,
            account_id,
            targeting_spec,
            optimization_goal
        )
