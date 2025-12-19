"""
LLM Factory - Dynamic Model Creation
Multi-provider support for OpenAI, Anthropic, Google Gemini, Groq, DeepSeek
Based on Next.js dynamicModel.utils.ts
"""
from typing import Optional, Set
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from ..config import settings


# Model allowlist for security (matches Next.js allowlist)
MODEL_ALLOWLIST: Set[str] = {
    # OpenAI Models
    "openai:gpt-5.2",
    "openai:gpt-5.1",
    "openai:gpt-4o",
    "openai:gpt-4o-mini",
    # Anthropic Models
    "anthropic:claude-sonnet-4-5-20250929",
    "anthropic:claude-opus-4-5-20251101",
    "anthropic:claude-haiku-4-5-20251001",
    # Google Models
    "google-genai:gemini-3-pro-preview",
    "google-genai:gemini-3-flash-preview",
    "google-genai:gemini-2.5-pro",
    "google-genai:gemini-2.0-flash",
    # Groq Models
    "groq:llama-3.3-70b-versatile",
    "groq:llama-3.1-8b-instant",
}

ModelProvider = str  # Type alias: 'openai' | 'anthropic' | 'google-genai' | 'groq'
DEFAULT_MODEL_ID = "google-genai:gemini-3-flash-preview"


class ModelNotAllowedError(Exception):
    """Raised when a model is not in the allowlist"""
    pass


class UnsupportedProviderError(Exception):
    """Raised when a provider is not supported"""
    pass


class MissingAPIKeyError(Exception):
    """Raised when an API key is missing for a provider"""
    pass


def validate_model_id(model_id: str) -> None:
    """
    Validate that a model ID is in the allowlist
    
    Args:
        model_id: Model ID in format "provider:model-name"
        
    Raises:
        ModelNotAllowedError: If model is not in allowlist
    """
    if model_id not in MODEL_ALLOWLIST:
        raise ModelNotAllowedError(
            f"Model not allowed: {model_id}. "
            f"Allowed models: {', '.join(sorted(MODEL_ALLOWLIST))}"
        )


async def create_dynamic_model(
    model_id: Optional[str] = None,
    temperature: float = 0.7,
    **kwargs
) -> BaseChatModel:
    """
    Create a dynamic LLM model instance based on model ID
    
    Args:
        model_id: Model ID in format "provider:model-name".
                 Defaults to DEFAULT_MODEL_ID if None.
        temperature: Model temperature (0-2). Default: 0.7
        **kwargs: Additional model-specific parameters
        
    Returns:
        BaseChatModel instance
        
    Raises:
        ModelNotAllowedError: If model is not in allowlist
        UnsupportedProviderError: If provider is not supported
        MissingAPIKeyError: If API key is missing
        
    Example:
        >>> model = await create_dynamic_model("openai:gpt-4o")
        >>> model = await create_dynamic_model("google-genai:gemini-3-flash-preview")
    """
    resolved_model_id = model_id or DEFAULT_MODEL_ID
    validate_model_id(resolved_model_id)
    
    # Parse provider and model name
    parts = resolved_model_id.split(":", 1)
    if len(parts) != 2:
        raise ValueError(f"Invalid model_id format: {resolved_model_id}. Expected 'provider:model-name'")
    
    provider, model_name = parts
    
    print(f"[create_dynamic_model] Provider: {provider}, Model: {model_name}")
    
    # Create model based on provider
    if provider == "openai":
        api_key = settings.get_api_key("openai")
        if not api_key:
            raise MissingAPIKeyError("OPENAI_API_KEY environment variable is not set")
        
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            **kwargs
        )
    
    elif provider == "anthropic":
        api_key = settings.get_api_key("anthropic")
        if not api_key:
            raise MissingAPIKeyError("ANTHROPIC_API_KEY environment variable is not set")
        
        return ChatAnthropic(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            **kwargs
        )
    
    elif provider == "google-genai":
        api_key = settings.gemini_key
        if not api_key:
            raise MissingAPIKeyError(
                "GOOGLE_API_KEY or GEMINI_API_KEY environment variable is not set"
            )
        
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            temperature=temperature,
            **kwargs
        )
    
    elif provider == "groq":
        api_key = settings.get_api_key("groq")
        if not api_key:
            raise MissingAPIKeyError("GROQ_API_KEY environment variable is not set")
        
        return ChatGroq(
            model=model_name,
            api_key=api_key,
            temperature=temperature,
            **kwargs
        )
    
    else:
        raise UnsupportedProviderError(
            f"Unsupported provider: {provider}. "
            f"Supported providers: openai, anthropic, google-genai, groq"
        )


class LLMFactory:
    """
    LLM Factory for managing model instances
    Provides caching and lifecycle management
    """
    
    def __init__(self):
        self._models: dict[str, BaseChatModel] = {}
    
    async def get_model(
        self,
        model_id: Optional[str] = None,
        temperature: float = 0.7,
        **kwargs
    ) -> BaseChatModel:
        """
        Get or create a model instance
        
        Args:
            model_id: Model ID
            temperature: Model temperature
            **kwargs: Additional parameters
            
        Returns:
            BaseChatModel instance
        """
        cache_key = f"{model_id}:{temperature}"
        
        if cache_key not in self._models:
            self._models[cache_key] = await create_dynamic_model(
                model_id=model_id,
                temperature=temperature,
                **kwargs
            )
        
        return self._models[cache_key]
    
    async def initialize(self):
        """Initialize factory (for lifespan)"""
        print("🤖 LLM Factory initialized")
    
    async def close(self):
        """Cleanup factory resources (for lifespan)"""
        self._models.clear()
        print("👋 LLM Factory closed")
