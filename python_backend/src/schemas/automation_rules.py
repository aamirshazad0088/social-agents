"""
Automation Rules Schemas
Meta Marketing API Ad Rules Engine via adrules_library endpoint

Based on December 2025 research:
- Use /act_{ad_account_id}/adrules_library endpoint
- Supports SCHEDULE and TRIGGER evaluation types
- Actions: PAUSE, UNPAUSE, CHANGE_BUDGET, SEND_NOTIFICATION
"""
from enum import Enum
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime


class RuleEvaluationType(str, Enum):
    """When the rule is evaluated"""
    SCHEDULE = "SCHEDULE"  # Check on a regular schedule
    TRIGGER = "TRIGGER"    # Check when metrics cross threshold


class RuleExecutionType(str, Enum):
    """Action to take when rule conditions are met - per Meta Ad Rules Engine v24.0 docs"""
    PAUSE = "PAUSE"
    UNPAUSE = "UNPAUSE"
    CHANGE_BUDGET = "CHANGE_BUDGET"
    CHANGE_BID = "CHANGE_BID"
    NOTIFICATION = "NOTIFICATION"  # Meta's official name
    REBALANCE_BUDGET = "REBALANCE_BUDGET"  # Redistribute budget based on performance
    PING_ENDPOINT = "PING_ENDPOINT"  # Call a webhook URL


class RuleEntityType(str, Enum):
    """Entity type the rule applies to"""
    CAMPAIGN = "CAMPAIGN"
    ADSET = "ADSET"
    AD = "AD"


class RuleOperator(str, Enum):
    """Comparison operators for rule conditions"""
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN = "LESS_THAN"
    EQUAL = "EQUAL"
    NOT_EQUAL = "NOT_EQUAL"
    IN_RANGE = "IN_RANGE"
    NOT_IN_RANGE = "NOT_IN_RANGE"


class RuleScheduleType(str, Enum):
    """Schedule frequency for rule evaluation"""
    DAILY = "DAILY"
    HOURLY = "HOURLY"
    EVERY_30_MINUTES = "EVERY_30_MINUTES"
    CUSTOM = "CUSTOM"


class RuleStatus(str, Enum):
    """Rule status"""
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"
    DELETED = "DELETED"


class RuleField(str, Enum):
    """Fields that can be used in rule conditions"""
    # Spend metrics
    SPENT = "spent"
    DAILY_SPEND = "daily_spend"
    LIFETIME_SPEND = "lifetime_spend"
    
    # Performance metrics
    IMPRESSIONS = "impressions"
    CLICKS = "clicks"
    CTR = "ctr"
    CPC = "cpc"
    CPM = "cpm"
    REACH = "reach"
    FREQUENCY = "frequency"
    
    # Conversion metrics
    CONVERSIONS = "conversions"
    COST_PER_CONVERSION = "cost_per_conversion"
    CONVERSION_RATE = "conversion_rate"
    ROAS = "roas"
    
    # Time-based
    HOURS_SINCE_CREATION = "hours_since_creation"
    DAYS_SINCE_LAST_EDIT = "days_since_last_edit"
    
    # Entity attributes
    STATUS = "entity_status"
    BUDGET = "budget"


class RuleCondition(BaseModel):
    """A single condition in a rule"""
    field: RuleField
    operator: RuleOperator
    value: Union[float, int, str, List[Union[float, int]]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "field": "ctr",
                "operator": "LESS_THAN",
                "value": 1.0
            }
        }


class RuleSchedule(BaseModel):
    """Schedule configuration for rule evaluation"""
    schedule_type: RuleScheduleType = RuleScheduleType.DAILY
    start_minute: Optional[int] = Field(default=0, ge=0, le=1439)
    end_minute: Optional[int] = Field(default=1439, ge=0, le=1439)
    days: Optional[List[int]] = Field(
        default=[0, 1, 2, 3, 4, 5, 6],
        description="Days of week (0=Sunday, 6=Saturday)"
    )


class RuleExecutionOptions(BaseModel):
    """Options for rule execution - per Meta Ad Rules Engine v24.0 docs"""
    # Execution limits
    execution_count_limit: Optional[int] = Field(
        default=None,
        ge=1,
        description="Maximum times an action can be taken per object"
    )
    action_frequency: Optional[int] = Field(
        default=None,
        ge=60,
        description="Minimum seconds until the same action can be taken again"
    )
    
    # For CHANGE_BUDGET
    budget_change_type: Optional[str] = Field(
        default=None,
        description="INCREASE_BY, DECREASE_BY, SET_TO"
    )
    budget_change_value: Optional[float] = None
    budget_change_unit: Optional[str] = Field(
        default="PERCENT",
        description="PERCENT or ABSOLUTE"
    )
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    
    # For CHANGE_BID
    bid_change_type: Optional[str] = Field(
        default=None,
        description="INCREASE_BY, DECREASE_BY, SET_TO"
    )
    bid_change_value: Optional[float] = None
    bid_change_unit: Optional[str] = Field(
        default="PERCENT",
        description="PERCENT or ABSOLUTE"
    )
    
    # For REBALANCE_BUDGET
    rebalance_metric: Optional[str] = Field(
        default=None,
        description="Metric to use for rebalancing (e.g., 'cpa', 'roas')"
    )
    
    # For NOTIFICATION
    user_ids: Optional[List[str]] = Field(
        default=None,
        description="User IDs to receive notifications"
    )
    notification_email: Optional[str] = None
    notification_message: Optional[str] = None
    
    # For PING_ENDPOINT (webhook)
    endpoint_url: Optional[str] = Field(
        default=None,
        description="URL to ping when rule triggers"
    )


class CreateAutomationRuleRequest(BaseModel):
    """Request to create an automation rule"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    
    # Entity targeting
    entity_type: RuleEntityType = RuleEntityType.CAMPAIGN
    entity_ids: Optional[List[str]] = Field(
        default=None,
        description="Specific entity IDs, or None for all entities of type"
    )
    
    # Conditions (all must be met = AND logic)
    conditions: List[RuleCondition] = Field(
        ...,
        min_length=1,
        description="Conditions that trigger the rule"
    )
    
    # Action
    execution_type: RuleExecutionType
    execution_options: Optional[RuleExecutionOptions] = None
    is_once_off: bool = Field(
        default=False,
        description="If true, rule only fires once per entity"
    )
    
    # Schedule
    evaluation_type: RuleEvaluationType = RuleEvaluationType.SCHEDULE
    schedule: Optional[RuleSchedule] = None
    
    # Status
    status: RuleStatus = RuleStatus.ENABLED
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Pause Low CTR Ads",
                "description": "Automatically pause ads with CTR below 1%",
                "entity_type": "AD",
                "conditions": [
                    {"field": "ctr", "operator": "LESS_THAN", "value": 1.0},
                    {"field": "impressions", "operator": "GREATER_THAN", "value": 1000}
                ],
                "execution_type": "PAUSE",
                "evaluation_type": "SCHEDULE",
                "schedule": {"schedule_type": "DAILY"},
                "status": "ENABLED"
            }
        }


class AutomationRuleResponse(BaseModel):
    """Response after creating/updating a rule"""
    success: bool
    rule_id: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None


class RuleExecution(BaseModel):
    """Record of a rule execution"""
    execution_time: datetime
    entity_id: str
    entity_type: RuleEntityType
    action_taken: RuleExecutionType
    conditions_met: List[Dict[str, Any]]
    result: str  # "SUCCESS" or "FAILED"
    error_message: Optional[str] = None


class RuleExecutionHistory(BaseModel):
    """Execution history for a rule"""
    rule_id: str
    rule_name: str
    total_executions: int
    successful_executions: int
    failed_executions: int
    last_execution: Optional[datetime] = None
    executions: List[RuleExecution]


class AutomationRuleListItem(BaseModel):
    """Summary item for rule listing"""
    id: str
    name: str
    description: Optional[str]
    entity_type: RuleEntityType
    execution_type: RuleExecutionType
    status: RuleStatus
    conditions_count: int
    executions_count: int = 0
    last_execution: Optional[datetime] = None
    created_time: Optional[datetime] = None


# Pre-built rule templates - per Meta Ad Rules Engine best practices
RULE_TEMPLATES = [
    {
        "name": "Pause Low Performers",
        "description": "Pause ads with CTR below 1% after 1000 impressions",
        "entity_type": "AD",
        "conditions": [
            {"field": "ctr", "operator": "LESS_THAN", "value": 1.0},
            {"field": "impressions", "operator": "GREATER_THAN", "value": 1000}
        ],
        "execution_type": "PAUSE"
    },
    {
        "name": "Alert High Spend",
        "description": "Notify when daily spend exceeds $100",
        "entity_type": "CAMPAIGN",
        "conditions": [
            {"field": "spent", "operator": "GREATER_THAN", "value": 10000}
        ],
        "execution_type": "NOTIFICATION"
    },
    {
        "name": "Scale Winners",
        "description": "Increase budget 20% for campaigns with ROAS > 3",
        "entity_type": "CAMPAIGN",
        "conditions": [
            {"field": "roas", "operator": "GREATER_THAN", "value": 3.0},
            {"field": "spent", "operator": "GREATER_THAN", "value": 5000}
        ],
        "execution_type": "CHANGE_BUDGET",
        "execution_options": {
            "budget_change_type": "INCREASE_BY",
            "budget_change_value": 20,
            "budget_change_unit": "PERCENT"
        }
    },
    {
        "name": "Limit Frequency",
        "description": "Pause ad sets with frequency > 3",
        "entity_type": "ADSET",
        "conditions": [
            {"field": "frequency", "operator": "GREATER_THAN", "value": 3.0}
        ],
        "execution_type": "PAUSE"
    },
    {
        "name": "Optimize Bids",
        "description": "Lower bid by 10% when CPC exceeds target",
        "entity_type": "ADSET",
        "conditions": [
            {"field": "cpc", "operator": "GREATER_THAN", "value": 2.5}
        ],
        "execution_type": "CHANGE_BID",
        "execution_options": {
            "bid_change_type": "DECREASE_BY",
            "bid_change_value": 10,
            "bid_change_unit": "PERCENT"
        }
    }
]
