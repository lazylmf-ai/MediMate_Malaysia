#!/usr/bin/env python3
"""
Python SDK Generator for MediMate Malaysia Healthcare API
Generates a comprehensive Python SDK with Malaysian cultural intelligence features
"""

import os
import json
import yaml
from typing import Dict, Any
from pathlib import Path

# SDK configuration
SDK_CONFIG = {
    "name": "medimate-malaysia",
    "version": "1.2.0",
    "description": "Official Python SDK for MediMate Malaysia Healthcare API",
    "author": "MediMate Malaysia",
    "author_email": "sdk@medimate.my",
    "license": "MIT",
    "homepage": "https://api.medimate.my",
    "repository": "https://github.com/medimate-malaysia/python-sdk",
    "keywords": [
        "medimate",
        "malaysia",
        "healthcare",
        "api",
        "sdk",
        "cultural-intelligence",
        "pdpa",
        "halal",
        "prayer-times",
        "fhir"
    ]
}

class PythonSDKGenerator:
    def __init__(self, openapi_spec: Dict[str, Any]):
        self.spec = openapi_spec
        self.output_dir = Path(__file__).parent / "../../sdks/python"
        self.ensure_output_directory()

    def ensure_output_directory(self):
        """Create SDK directory structure"""
        if not self.output_dir.exists():
            self.output_dir.mkdir(parents=True)

        # Create Python SDK directory structure
        dirs = [
            "medimate_malaysia",
            "medimate_malaysia/services",
            "medimate_malaysia/models",
            "medimate_malaysia/utils",
            "tests",
            "docs",
            "examples"
        ]
        
        for dir_name in dirs:
            full_path = self.output_dir / dir_name
            if not full_path.exists():
                full_path.mkdir(parents=True)

    def generate(self):
        """Generate the complete Python SDK"""
        print("🚀 Generating Python SDK for MediMate Malaysia...")
        
        self.generate_setup_py()
        self.generate_requirements()
        self.generate_main_client()
        self.generate_models()
        self.generate_cultural_service()
        self.generate_patient_service()
        self.generate_appointment_service()
        self.generate_medication_service()
        self.generate_realtime_service()
        self.generate_fhir_service()
        self.generate_utils()
        self.generate_exceptions()
        self.generate_examples()
        self.generate_tests()
        self.generate_readme()
        self.generate_init_files()
        
        print("✅ Python SDK generated successfully!")
        print(f"📁 Output directory: {self.output_dir}")

    def generate_setup_py(self):
        """Generate setup.py file"""
        setup_py = f'''"""
MediMate Malaysia Healthcare API Python SDK
Official Python SDK with Malaysian cultural intelligence features
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="{SDK_CONFIG["name"]}",
    version="{SDK_CONFIG["version"]}",
    author="{SDK_CONFIG["author"]}",
    author_email="{SDK_CONFIG["author_email"]}",
    description="{SDK_CONFIG["description"]}",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="{SDK_CONFIG["homepage"]}",
    project_urls={{
        "Bug Tracker": "{SDK_CONFIG["repository"]}/issues",
        "Documentation": "https://docs.medimate.my/python-sdk",
        "Source Code": "{SDK_CONFIG["repository"]}",
    }},
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Healthcare Industry",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Medical Science Apps.",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Typing :: Typed",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    keywords="{' '.join(SDK_CONFIG["keywords"])}",
    include_package_data=True,
    zip_safe=False,
    entry_points={{
        "console_scripts": [
            "medimate-malaysia=medimate_malaysia.cli:main",
        ],
    }},
)'''
        self.write_file("setup.py", setup_py)

    def generate_requirements(self):
        """Generate requirements.txt"""
        requirements = '''# Core dependencies
requests>=2.28.0
pydantic>=1.10.0
python-dateutil>=2.8.0
typing-extensions>=4.0.0

# Async support
aiohttp>=3.8.0
asyncio>=3.4.3

# WebSocket support
websockets>=10.0

# JSON handling
orjson>=3.8.0

# Configuration
python-dotenv>=0.19.0

# Logging
structlog>=22.0.0

# Testing (development)
pytest>=7.0.0
pytest-asyncio>=0.20.0
pytest-mock>=3.8.0
pytest-cov>=4.0.0
httpx>=0.24.0

# Documentation (development)  
mkdocs>=1.4.0
mkdocs-material>=8.5.0

# Linting (development)
black>=22.0.0
isort>=5.10.0
mypy>=0.991
flake8>=5.0.0
'''
        self.write_file("requirements.txt", requirements)

    def generate_main_client(self):
        """Generate main MediMate client class"""
        main_client = '''"""
MediMate Malaysia Healthcare API Client
Official Python SDK with Malaysian cultural intelligence
"""

import asyncio
import logging
from typing import Optional, Dict, Any, Union
from datetime import datetime
import requests
import aiohttp
from pydantic import BaseModel, ValidationError

from .models import MediMateConfig, CulturalContext
from .services.cultural import CulturalService
from .services.patient import PatientService
from .services.appointment import AppointmentService
from .services.medication import MedicationService
from .services.realtime import RealtimeService
from .services.fhir import FHIRService
from .exceptions import MediMateError, AuthenticationError, RateLimitError
from .utils import setup_logging, validate_api_key

logger = logging.getLogger(__name__)

class MediMateMalaysia:
    """
    Main client for MediMate Malaysia Healthcare API
    
    Features:
    - Malaysian cultural intelligence
    - PDPA 2010 compliance
    - Prayer time integration
    - Halal medication validation
    - Multi-language support (MS, EN, ZH, TA)
    - Real-time notifications
    - FHIR R4 compatibility
    
    Example:
        >>> client = MediMateMalaysia(api_key="mk_live_your_key_here")
        >>> prayer_times = await client.cultural.get_prayer_times("KUL")
        >>> halal_status = await client.cultural.validate_medication("Paracetamol 500mg")
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.medimate.my/v1",
        timeout: int = 30,
        max_retries: int = 3,
        debug: bool = False,
        cultural_context: Optional[CulturalContext] = None
    ):
        """
        Initialize MediMate Malaysia API client
        
        Args:
            api_key: Your MediMate API key (format: mk_live_... or mk_test_...)
            base_url: Base URL for the API (default: https://api.medimate.my/v1)
            timeout: Request timeout in seconds (default: 30)
            max_retries: Maximum number of retries for failed requests (default: 3)
            debug: Enable debug logging (default: False)
            cultural_context: Malaysian cultural context settings
            
        Raises:
            MediMateError: If API key format is invalid
        """
        # Validate API key format
        if not validate_api_key(api_key):
            raise MediMateError(
                "Invalid API key format. Expected format: mk_live_... or mk_test_...",
                "INVALID_API_KEY"
            )

        self.config = MediMateConfig(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            debug=debug,
            cultural_context=cultural_context or CulturalContext()
        )

        if debug:
            setup_logging(level=logging.DEBUG)

        # Setup HTTP session
        self.session = requests.Session()
        self.session.headers.update(self._get_default_headers())
        
        # Setup async session (will be initialized when needed)
        self._async_session: Optional[aiohttp.ClientSession] = None

        # Initialize service instances
        self.cultural = CulturalService(self)
        self.patients = PatientService(self)
        self.appointments = AppointmentService(self)
        self.medications = MedicationService(self)
        self.realtime = RealtimeService(self)
        self.fhir = FHIRService(self)

        logger.info(
            "MediMate Malaysia SDK initialized",
            extra={
                "api_key_prefix": api_key[:12] + "...",
                "base_url": base_url,
                "cultural_context": cultural_context.dict() if cultural_context else None
            }
        )

    def _get_default_headers(self) -> Dict[str, str]:
        """Get default headers for requests"""
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "User-Agent": f"MediMate-Malaysia-SDK-Python/{SDK_CONFIG['version']}",
            "X-SDK-Language": "python",
            "X-Cultural-Context": "Malaysian Healthcare"
        }

        # Add cultural context headers
        if self.config.cultural_context:
            if self.config.cultural_context.malaysian_state:
                headers["X-Malaysian-State"] = self.config.cultural_context.malaysian_state
            if self.config.cultural_context.preferred_language:
                headers["X-Preferred-Language"] = self.config.cultural_context.preferred_language
            if self.config.cultural_context.prayer_time_aware:
                headers["X-Prayer-Time-Aware"] = "true"
            if self.config.cultural_context.halal_requirements:
                headers["X-Halal-Requirements"] = "true"

        return headers

    async def _get_async_session(self) -> aiohttp.ClientSession:
        """Get or create async session"""
        if self._async_session is None or self._async_session.closed:
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            self._async_session = aiohttp.ClientSession(
                headers=self._get_default_headers(),
                timeout=timeout
            )
        return self._async_session

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make synchronous HTTP request"""
        url = f"{self.config.base_url}{endpoint}"
        
        try:
            if self.config.debug:
                logger.debug(f"Making {method.upper()} request to {url}")
                
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=self.config.timeout
            )
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 60))
                raise RateLimitError(f"Rate limited. Retry after {retry_after} seconds", retry_after)
            
            # Handle authentication errors
            if response.status_code == 401:
                raise AuthenticationError("Invalid API key or authentication failed")
            
            response.raise_for_status()
            
            # Log cultural context if present
            if response.headers.get("X-Prayer-Time"):
                logger.info(f"🕌 Prayer Time Context: {response.headers['X-Prayer-Time']}")
            
            if response.headers.get("X-Cultural-Event"):
                logger.info(f"🎉 Cultural Event: {response.headers['X-Cultural-Event']}")
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise MediMateError(f"Request failed: {str(e)}", "REQUEST_ERROR") from e

    async def _make_async_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make asynchronous HTTP request"""
        session = await self._get_async_session()
        url = f"{self.config.base_url}{endpoint}"
        
        try:
            if self.config.debug:
                logger.debug(f"Making async {method.upper()} request to {url}")
                
            async with session.request(
                method=method,
                url=url,
                json=data,
                params=params
            ) as response:
                # Handle rate limiting
                if response.status == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    raise RateLimitError(f"Rate limited. Retry after {retry_after} seconds", retry_after)
                
                # Handle authentication errors
                if response.status == 401:
                    raise AuthenticationError("Invalid API key or authentication failed")
                
                response.raise_for_status()
                
                # Log cultural context if present
                if response.headers.get("X-Prayer-Time"):
                    logger.info(f"🕌 Prayer Time Context: {response.headers['X-Prayer-Time']}")
                
                if response.headers.get("X-Cultural-Event"):
                    logger.info(f"🎉 Cultural Event: {response.headers['X-Cultural-Event']}")
                
                return await response.json()
                
        except aiohttp.ClientError as e:
            logger.error(f"Async request failed: {e}")
            raise MediMateError(f"Async request failed: {str(e)}", "ASYNC_REQUEST_ERROR") from e

    def get_health(self) -> Dict[str, Any]:
        """
        Get API health status
        
        Returns:
            API health information including cultural services status
        """
        return self._make_request("GET", "/health")

    async def get_health_async(self) -> Dict[str, Any]:
        """
        Get API health status (async)
        
        Returns:
            API health information including cultural services status
        """
        return await self._make_async_request("GET", "/health")

    def get_context(self) -> Dict[str, Any]:
        """
        Get Malaysian healthcare context information
        
        Returns:
            Context information including supported languages and features
        """
        return self._make_request("GET", "/context")

    async def get_context_async(self) -> Dict[str, Any]:
        """
        Get Malaysian healthcare context information (async)
        
        Returns:
            Context information including supported languages and features
        """
        return await self._make_async_request("GET", "/context")

    def close(self):
        """Close synchronous session"""
        self.session.close()

    async def close_async(self):
        """Close asynchronous session"""
        if self._async_session and not self._async_session.closed:
            await self._async_session.close()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close_async()
'''

        self.write_file("medimate_malaysia/__init__.py", main_client)

    def generate_models(self):
        """Generate Pydantic models"""
        models = '''"""
Pydantic models for MediMate Malaysia SDK
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, Field, validator

class MalaysianState(str, Enum):
    """Malaysian state codes"""
    KUALA_LUMPUR = "KUL"
    SELANGOR = "SGR"
    JOHOR = "JHR"
    PENANG = "PNG"
    PERAK = "PRK"
    PAHANG = "PHG"
    TERENGGANU = "TRG"
    KELANTAN = "KTN"
    PERLIS = "PLS"
    KEDAH = "KDH"
    MELAKA = "MLK"
    NEGERI_SEMBILAN = "NSN"
    SARAWAK = "SWK"
    SABAH = "SBH"
    LABUAN = "LBN"
    PUTRAJAYA = "PJY"

class SupportedLanguage(str, Enum):
    """Supported languages for Malaysian healthcare"""
    MALAY = "ms"
    ENGLISH = "en"
    CHINESE = "zh"
    TAMIL = "ta"

class HalalStatus(str, Enum):
    """Halal certification status"""
    HALAL = "halal"
    HARAM = "haram"
    MUSHBOOH = "mushbooh"
    UNKNOWN = "unknown"

class CulturalContext(BaseModel):
    """Malaysian cultural context configuration"""
    malaysian_state: Optional[MalaysianState] = None
    preferred_language: Optional[SupportedLanguage] = SupportedLanguage.ENGLISH
    prayer_time_aware: bool = True
    halal_requirements: bool = False
    ramadan_adjustments: bool = False

class MediMateConfig(BaseModel):
    """Configuration for MediMate Malaysia SDK"""
    api_key: str
    base_url: str = "https://api.medimate.my/v1"
    timeout: int = 30
    max_retries: int = 3
    debug: bool = False
    cultural_context: Optional[CulturalContext] = None

class PrayerTimes(BaseModel):
    """Prayer times for a Malaysian state"""
    state_code: MalaysianState
    state_name: str
    date: date
    prayer_times: Dict[str, str] = Field(..., description="Prayer times in 24-hour format")
    healthcare_considerations: Optional[Dict[str, Any]] = None

class CurrentPrayerStatus(BaseModel):
    """Current prayer time status"""
    current_time: datetime
    current_prayer: str
    next_prayer: Dict[str, Any]
    is_prayer_time: bool
    healthcare_scheduling_status: str = Field(..., regex="^(optimal|caution|avoid)$")

class TranslationRequest(BaseModel):
    """Request for healthcare text translation"""
    text: str
    target_language: SupportedLanguage
    source_language: Optional[SupportedLanguage] = SupportedLanguage.ENGLISH
    context: Optional[Dict[str, Any]] = None

class TranslationResponse(BaseModel):
    """Response for healthcare text translation"""
    original_text: str
    translated_text: str
    source_language: SupportedLanguage
    target_language: SupportedLanguage
    confidence_score: float = Field(..., ge=0, le=1)
    cultural_notes: Optional[List[str]] = None
    medical_accuracy_validated: bool

class HalalValidationRequest(BaseModel):
    """Request for halal medication validation"""
    medication_name: str
    manufacturer: Optional[str] = None
    active_ingredients: Optional[List[str]] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None

class HalalCertification(BaseModel):
    """Halal certification details"""
    certified: bool
    authority: Optional[str] = None
    certificate_number: Optional[str] = None
    expiry_date: Optional[date] = None

class HalalValidationResponse(BaseModel):
    """Response for halal medication validation"""
    medication_name: str
    halal_status: HalalStatus
    confidence: str = Field(..., regex="^(high|medium|low)$")
    certification: Optional[HalalCertification] = None
    ingredients_analysis: Optional[List[Dict[str, Any]]] = None
    alternatives: Optional[List[Dict[str, Any]]] = None

class PatientPersonalInfo(BaseModel):
    """Patient personal information"""
    name: str
    mykad_number: str = Field(..., regex=r'^\d{6}-\d{2}-\d{4}$')
    date_of_birth: date
    gender: str = Field(..., regex="^(male|female)$")
    race: str
    religion: str
    nationality: str = "Malaysian"

class PatientContactInfo(BaseModel):
    """Patient contact information"""
    phone: str = Field(..., regex=r'^\+60\d{9,10}$')
    email: Optional[str] = None
    address: Optional[Dict[str, str]] = None

class PatientCulturalPreferences(BaseModel):
    """Patient cultural preferences"""
    primary_language: SupportedLanguage
    secondary_languages: Optional[List[SupportedLanguage]] = None
    prayer_time_notifications: bool = False
    halal_medication_only: bool = False
    preferred_gender_provider: str = Field(default="no_preference", regex="^(same|opposite|no_preference)$")
    ramadan_considerations: bool = False

class PDPAConsent(BaseModel):
    """PDPA 2010 compliance consent"""
    data_processing: bool
    marketing: bool = False
    third_party_sharing: bool = False
    research: Optional[bool] = None
    consent_date: datetime
    consent_method: str = Field(default="online", regex="^(online|paper|verbal)$")
    consent_version: Optional[str] = None

class PatientRequest(BaseModel):
    """Request to create/update patient"""
    personal_info: PatientPersonalInfo
    contact_info: PatientContactInfo
    cultural_preferences: PatientCulturalPreferences
    pdpa_consent: PDPAConsent
    emergency_contact: Optional[Dict[str, Any]] = None

class AppointmentRequest(BaseModel):
    """Request to create appointment"""
    patient_id: str
    provider_id: str
    appointment_date: date
    appointment_time: str = Field(..., regex=r'^\d{2}:\d{2}$')
    duration_minutes: int = Field(default=30, ge=15, le=240)
    appointment_type: str = Field(..., regex="^(consultation|followup|procedure|emergency|telemedicine)$")
    cultural_considerations: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    priority: str = Field(default="routine", regex="^(routine|urgent|emergency)$")

class MedicationInfo(BaseModel):
    """Medication information"""
    medication_id: str
    name: str
    generic_name: str
    brand_names: Optional[List[str]] = None
    active_ingredients: List[str]
    category: str
    halal_status: HalalStatus
    halal_certification: Optional[HalalCertification] = None
    available_forms: List[str]
    manufacturer: str
    moh_approved: bool

class NotificationSubscription(BaseModel):
    """Real-time notification subscription"""
    notification_types: List[str]
    delivery_preferences: Dict[str, Any]
    cultural_preferences: Optional[Dict[str, Any]] = None
    scheduling: Optional[Dict[str, Any]] = None

class WebSocketMessage(BaseModel):
    """WebSocket message structure"""
    id: str
    type: str
    timestamp: datetime
    data: Dict[str, Any]
    cultural_context: Optional[Dict[str, Any]] = None
    priority: str = Field(..., regex="^(low|medium|high|critical)$")
    malaysian_state: Optional[MalaysianState] = None

class FHIRResource(BaseModel):
    """Base FHIR resource"""
    resourceType: str
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class APIResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None

class PaginationInfo(BaseModel):
    """Pagination information"""
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1, le=100)
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

class RateLimitInfo(BaseModel):
    """Rate limiting information"""
    requests_per_minute: Dict[str, Union[int, datetime]]
    requests_per_day: Dict[str, Union[int, datetime]]
'''

        self.write_file("medimate_malaysia/models/__init__.py", models)

    def write_file(self, filepath: str, content: str):
        """Write content to file"""
        full_path = self.output_dir / filepath
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content.strip())

    def generate_cultural_service(self):
        """Generate cultural intelligence service"""
        cultural_service = '''"""
Cultural Intelligence Service for Malaysian Healthcare API
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, date

from ..models import (
    MalaysianState, SupportedLanguage, HalalStatus,
    PrayerTimes, CurrentPrayerStatus, TranslationRequest, TranslationResponse,
    HalalValidationRequest, HalalValidationResponse
)
from ..exceptions import MediMateError

logger = logging.getLogger(__name__)

class CulturalService:
    """Cultural intelligence service for Malaysian healthcare"""

    def __init__(self, client):
        self.client = client

    def get_prayer_times(
        self,
        state_code: MalaysianState,
        date: Optional[date] = None
    ) -> PrayerTimes:
        """
        Get prayer times for a Malaysian state
        
        Args:
            state_code: Malaysian state code (e.g., MalaysianState.KUALA_LUMPUR)
            date: Optional date (defaults to today)
            
        Returns:
            Prayer times with healthcare scheduling considerations
        """
        params = {}
        if date:
            params["date"] = date.isoformat()

        response = self.client._make_request(
            "GET",
            f"/cultural/prayer-times/{state_code.value}",
            params=params
        )
        
        return PrayerTimes(**response["data"])

    async def get_prayer_times_async(
        self,
        state_code: MalaysianState,
        date: Optional[date] = None
    ) -> PrayerTimes:
        """Get prayer times (async version)"""
        params = {}
        if date:
            params["date"] = date.isoformat()

        response = await self.client._make_async_request(
            "GET",
            f"/cultural/prayer-times/{state_code.value}",
            params=params
        )
        
        return PrayerTimes(**response["data"])

    def get_current_prayer_status(
        self,
        state_code: MalaysianState
    ) -> CurrentPrayerStatus:
        """
        Get current prayer status for healthcare scheduling
        
        Args:
            state_code: Malaysian state code
            
        Returns:
            Current prayer status with scheduling recommendations
        """
        response = self.client._make_request(
            "GET",
            f"/cultural/prayer-times/{state_code.value}/current"
        )
        
        return CurrentPrayerStatus(**response["data"])

    async def get_current_prayer_status_async(
        self,
        state_code: MalaysianState
    ) -> CurrentPrayerStatus:
        """Get current prayer status (async version)"""
        response = await self.client._make_async_request(
            "GET",
            f"/cultural/prayer-times/{state_code.value}/current"
        )
        
        return CurrentPrayerStatus(**response["data"])

    def translate(
        self,
        text: str,
        target_language: SupportedLanguage,
        source_language: Optional[SupportedLanguage] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> TranslationResponse:
        """
        Translate healthcare text with cultural context
        
        Args:
            text: Text to translate
            target_language: Target language
            source_language: Source language (defaults to English)
            context: Translation context (domain, urgency, etc.)
            
        Returns:
            Translation with cultural notes and medical accuracy validation
        """
        request_data = TranslationRequest(
            text=text,
            target_language=target_language,
            source_language=source_language or SupportedLanguage.ENGLISH,
            context=context
        ).dict()

        response = self.client._make_request(
            "POST",
            "/cultural/translate",
            data=request_data
        )
        
        return TranslationResponse(**response["data"])

    async def translate_async(
        self,
        text: str,
        target_language: SupportedLanguage,
        source_language: Optional[SupportedLanguage] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> TranslationResponse:
        """Translate healthcare text (async version)"""
        request_data = TranslationRequest(
            text=text,
            target_language=target_language,
            source_language=source_language or SupportedLanguage.ENGLISH,
            context=context
        ).dict()

        response = await self.client._make_async_request(
            "POST",
            "/cultural/translate",
            data=request_data
        )
        
        return TranslationResponse(**response["data"])

    def validate_medication(
        self,
        medication_name: str,
        manufacturer: Optional[str] = None,
        active_ingredients: Optional[List[str]] = None,
        batch_number: Optional[str] = None,
        expiry_date: Optional[date] = None
    ) -> HalalValidationResponse:
        """
        Validate medication for halal compliance
        
        Args:
            medication_name: Name of the medication
            manufacturer: Manufacturer name
            active_ingredients: List of active ingredients
            batch_number: Batch number
            expiry_date: Expiry date
            
        Returns:
            Halal validation result with certification and alternatives
        """
        request_data = HalalValidationRequest(
            medication_name=medication_name,
            manufacturer=manufacturer,
            active_ingredients=active_ingredients,
            batch_number=batch_number,
            expiry_date=expiry_date
        ).dict(exclude_none=True)

        response = self.client._make_request(
            "POST",
            "/cultural/halal/validate-medication",
            data=request_data
        )
        
        return HalalValidationResponse(**response["data"])

    async def validate_medication_async(
        self,
        medication_name: str,
        manufacturer: Optional[str] = None,
        active_ingredients: Optional[List[str]] = None,
        batch_number: Optional[str] = None,
        expiry_date: Optional[date] = None
    ) -> HalalValidationResponse:
        """Validate medication for halal compliance (async version)"""
        request_data = HalalValidationRequest(
            medication_name=medication_name,
            manufacturer=manufacturer,
            active_ingredients=active_ingredients,
            batch_number=batch_number,
            expiry_date=expiry_date
        ).dict(exclude_none=True)

        response = await self.client._make_async_request(
            "POST",
            "/cultural/halal/validate-medication",
            data=request_data
        )
        
        return HalalValidationResponse(**response["data"])

    def get_ramadan_info(
        self,
        year: int,
        state_code: Optional[MalaysianState] = None
    ) -> Dict[str, Any]:
        """
        Get Ramadan dates and healthcare considerations
        
        Args:
            year: Year for Ramadan information
            state_code: Optional state for localized information
            
        Returns:
            Ramadan dates and healthcare scheduling considerations
        """
        endpoint = f"/cultural/calendar/ramadan/{year}"
        params = {}
        if state_code:
            params["state"] = state_code.value

        response = self.client._make_request("GET", endpoint, params=params)
        return response["data"]

    async def get_ramadan_info_async(
        self,
        year: int,
        state_code: Optional[MalaysianState] = None
    ) -> Dict[str, Any]:
        """Get Ramadan information (async version)"""
        endpoint = f"/cultural/calendar/ramadan/{year}"
        params = {}
        if state_code:
            params["state"] = state_code.value

        response = await self.client._make_async_request("GET", endpoint, params=params)
        return response["data"]

    def get_cultural_events(
        self,
        year: int,
        state_code: Optional[MalaysianState] = None,
        religion: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get Malaysian cultural events for healthcare scheduling
        
        Args:
            year: Year for cultural events
            state_code: Optional state filter
            religion: Optional religion filter
            
        Returns:
            List of cultural events with healthcare considerations
        """
        params = {"year": year}
        if state_code:
            params["state"] = state_code.value
        if religion:
            params["religion"] = religion

        response = self.client._make_request(
            "GET",
            "/cultural/calendar/events",
            params=params
        )
        return response["data"]

    async def get_cultural_events_async(
        self,
        year: int,
        state_code: Optional[MalaysianState] = None,
        religion: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get cultural events (async version)"""
        params = {"year": year}
        if state_code:
            params["state"] = state_code.value
        if religion:
            params["religion"] = religion

        response = await self.client._make_async_request(
            "GET",
            "/cultural/calendar/events",
            params=params
        )
        return response["data"]

    def get_supported_languages(self) -> Dict[str, Any]:
        """Get supported languages for healthcare translation"""
        response = self.client._make_request("GET", "/cultural/languages/supported")
        return response["data"]

    async def get_supported_languages_async(self) -> Dict[str, Any]:
        """Get supported languages (async version)"""
        response = await self.client._make_async_request("GET", "/cultural/languages/supported")
        return response["data"]
'''

        self.write_file("medimate_malaysia/services/cultural.py", cultural_service)

    def generate_patient_service(self):
        """Generate patient management service - placeholder"""
        patient_service = '''"""
Patient Management Service for Malaysian Healthcare API
"""

import logging
from typing import Dict, Any, List, Optional
from ..models import PatientRequest, PaginationInfo
from ..exceptions import MediMateError

logger = logging.getLogger(__name__)

class PatientService:
    """Patient management service with PDPA compliance"""

    def __init__(self, client):
        self.client = client

    def create_patient(self, patient_data: PatientRequest) -> Dict[str, Any]:
        """Create new patient with Malaysian healthcare context"""
        response = self.client._make_request(
            "POST",
            "/patients",
            data=patient_data.dict()
        )
        return response["data"]

    async def create_patient_async(self, patient_data: PatientRequest) -> Dict[str, Any]:
        """Create new patient (async version)"""
        response = await self.client._make_async_request(
            "POST",
            "/patients",
            data=patient_data.dict()
        )
        return response["data"]

    def get_patient(self, patient_id: str) -> Dict[str, Any]:
        """Get patient by ID"""
        response = self.client._make_request("GET", f"/patients/{patient_id}")
        return response["data"]

    async def get_patient_async(self, patient_id: str) -> Dict[str, Any]:
        """Get patient by ID (async version)"""
        response = await self.client._make_async_request("GET", f"/patients/{patient_id}")
        return response["data"]

    def list_patients(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """List patients with PDPA compliance"""
        params = {"page": page, "limit": limit}
        if search:
            params["search"] = search

        response = self.client._make_request("GET", "/patients", params=params)
        return response["data"]

    async def list_patients_async(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """List patients (async version)"""
        params = {"page": page, "limit": limit}
        if search:
            params["search"] = search

        response = await self.client._make_async_request("GET", "/patients", params=params)
        return response["data"]
'''

        self.write_file("medimate_malaysia/services/patient.py", patient_service)

    def generate_appointment_service(self):
        """Generate appointment service - placeholder"""
        appointment_service = '''"""
Appointment Management Service for Malaysian Healthcare API
"""

import logging
from typing import Dict, Any, Optional
from datetime import date
from ..models import AppointmentRequest

logger = logging.getLogger(__name__)

class AppointmentService:
    """Appointment management with cultural considerations"""

    def __init__(self, client):
        self.client = client

    def create_appointment(self, appointment_data: AppointmentRequest) -> Dict[str, Any]:
        """Create appointment with Malaysian cultural considerations"""
        response = self.client._make_request(
            "POST",
            "/appointments",
            data=appointment_data.dict()
        )
        return response["data"]

    async def create_appointment_async(self, appointment_data: AppointmentRequest) -> Dict[str, Any]:
        """Create appointment (async version)"""
        response = await self.client._make_async_request(
            "POST",
            "/appointments",
            data=appointment_data.dict()
        )
        return response["data"]

    def get_appointment(self, appointment_id: str) -> Dict[str, Any]:
        """Get appointment by ID"""
        response = self.client._make_request("GET", f"/appointments/{appointment_id}")
        return response["data"]

    async def get_appointment_async(self, appointment_id: str) -> Dict[str, Any]:
        """Get appointment by ID (async version)"""
        response = await self.client._make_async_request("GET", f"/appointments/{appointment_id}")
        return response["data"]
'''

        self.write_file("medimate_malaysia/services/appointment.py", appointment_service)

    def generate_medication_service(self):
        """Generate medication service - placeholder"""
        self.write_file("medimate_malaysia/services/medication.py", '"""Medication service placeholder"""')

    def generate_realtime_service(self):
        """Generate real-time service - placeholder"""
        self.write_file("medimate_malaysia/services/realtime.py", '"""Real-time service placeholder"""')

    def generate_fhir_service(self):
        """Generate FHIR service - placeholder"""
        self.write_file("medimate_malaysia/services/fhir.py", '"""FHIR service placeholder"""')

    def generate_utils(self):
        """Generate utility functions"""
        utils = '''"""
Utility functions for MediMate Malaysia SDK
"""

import re
import logging
from typing import Optional

def validate_api_key(api_key: str) -> bool:
    """Validate API key format"""
    return bool(api_key and api_key.startswith('mk_') and len(api_key) > 12)

def validate_mykad(mykad: str) -> bool:
    """Validate Malaysian MyKad format"""
    pattern = r'^\d{6}-\d{2}-\d{4}$'
    return bool(re.match(pattern, mykad))

def setup_logging(level: int = logging.INFO):
    """Setup logging for SDK"""
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
'''

        self.write_file("medimate_malaysia/utils.py", utils)

    def generate_exceptions(self):
        """Generate custom exceptions"""
        exceptions = '''"""
Custom exceptions for MediMate Malaysia SDK
"""

from typing import Optional, Dict, Any

class MediMateError(Exception):
    """Base exception for MediMate SDK"""

    def __init__(
        self,
        message: str,
        code: str,
        status_code: Optional[int] = None,
        cultural_message: Optional[Dict[str, str]] = None,
        details: Optional[Any] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.cultural_message = cultural_message
        self.details = details

class AuthenticationError(MediMateError):
    """Authentication failed"""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTHENTICATION_ERROR", 401)

class RateLimitError(MediMateError):
    """Rate limit exceeded"""

    def __init__(self, message: str, retry_after: int):
        super().__init__(message, "RATE_LIMIT_ERROR", 429)
        self.retry_after = retry_after

class ValidationError(MediMateError):
    """Data validation failed"""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, "VALIDATION_ERROR", 400, details=details)
'''

        self.write_file("medimate_malaysia/exceptions.py", exceptions)

    def generate_examples(self):
        """Generate usage examples"""
        examples = '''"""
Usage examples for MediMate Malaysia SDK
"""

import asyncio
from datetime import date
from medimate_malaysia import MediMateMalaysia
from medimate_malaysia.models import MalaysianState, SupportedLanguage, CulturalContext

async def main():
    # Initialize client with cultural context
    cultural_context = CulturalContext(
        malaysian_state=MalaysianState.KUALA_LUMPUR,
        preferred_language=SupportedLanguage.MALAY,
        prayer_time_aware=True,
        halal_requirements=True
    )

    async with MediMateMalaysia(
        api_key="mk_test_your_api_key_here",
        cultural_context=cultural_context,
        debug=True
    ) as client:
        # Get prayer times for Kuala Lumpur
        prayer_times = await client.cultural.get_prayer_times_async(
            MalaysianState.KUALA_LUMPUR
        )
        print(f"Prayer times: {prayer_times.prayer_times}")

        # Validate halal medication
        halal_result = await client.cultural.validate_medication_async(
            medication_name="Paracetamol 500mg",
            manufacturer="Duopharma Biotech"
        )
        print(f"Halal status: {halal_result.halal_status}")

        # Translate healthcare text
        translation = await client.cultural.translate_async(
            text="Take this medication twice daily after meals",
            target_language=SupportedLanguage.MALAY,
            context={"domain": "prescription", "urgency": "medium"}
        )
        print(f"Translation: {translation.translated_text}")

        # Get API health
        health = await client.get_health_async()
        print(f"API Status: {health}")

if __name__ == "__main__":
    asyncio.run(main())
'''

        self.write_file("examples/basic_usage.py", examples)

    def generate_tests(self):
        """Generate basic test structure"""
        test_cultural = '''"""
Tests for Cultural Intelligence Service
"""

import pytest
from datetime import date
from medimate_malaysia import MediMateMalaysia
from medimate_malaysia.models import MalaysianState, SupportedLanguage

@pytest.fixture
def client():
    return MediMateMalaysia(api_key="mk_test_fake_key_for_testing")

def test_prayer_times(client, httpx_mock):
    """Test prayer times retrieval"""
    httpx_mock.add_response(
        method="GET",
        url="https://api.medimate.my/v1/cultural/prayer-times/KUL",
        json={
            "success": True,
            "data": {
                "state_code": "KUL",
                "state_name": "Kuala Lumpur",
                "date": "2024-03-15",
                "prayer_times": {
                    "fajr": "05:45",
                    "sunrise": "07:15",
                    "dhuhr": "13:15",
                    "asr": "16:30",
                    "maghrib": "19:25",
                    "isha": "20:35"
                }
            }
        }
    )

    prayer_times = client.cultural.get_prayer_times(MalaysianState.KUALA_LUMPUR)
    assert prayer_times.state_code == MalaysianState.KUALA_LUMPUR
    assert "fajr" in prayer_times.prayer_times

def test_translation(client, httpx_mock):
    """Test healthcare translation"""
    httpx_mock.add_response(
        method="POST",
        url="https://api.medimate.my/v1/cultural/translate",
        json={
            "success": True,
            "data": {
                "original_text": "Take this medication twice daily",
                "translated_text": "Ambil ubat ini dua kali sehari",
                "source_language": "en",
                "target_language": "ms",
                "confidence_score": 0.95,
                "medical_accuracy_validated": True
            }
        }
    )

    translation = client.cultural.translate(
        text="Take this medication twice daily",
        target_language=SupportedLanguage.MALAY
    )
    assert translation.translated_text == "Ambil ubat ini dua kali sehari"
    assert translation.confidence_score == 0.95
'''

        self.write_file("tests/test_cultural.py", test_cultural)

    def generate_readme(self):
        """Generate README file"""
        readme = '''# MediMate Malaysia Healthcare API - Python SDK

Official Python SDK for MediMate Malaysia Healthcare API with comprehensive Malaysian cultural intelligence features.

## 🇲🇾 Malaysian Healthcare Features

- **Prayer Time Integration**: Real-time prayer times for all 13 Malaysian states
- **Halal Medication Validation**: JAKIM-certified halal medication checking
- **Multi-Language Support**: Bahasa Malaysia, English, Chinese, Tamil
- **PDPA 2010 Compliance**: Built-in Malaysian data protection compliance
- **Cultural Calendar**: Ramadan, Eid, and Malaysian cultural event integration
- **Real-time Notifications**: WebSocket support with cultural context

## Installation

```bash
pip install medimate-malaysia
```

## Quick Start

```python
import asyncio
from medimate_malaysia import MediMateMalaysia
from medimate_malaysia.models import MalaysianState, SupportedLanguage

async def main():
    # Initialize with your API key
    async with MediMateMalaysia(api_key="mk_live_your_key_here") as client:
        # Get prayer times for Kuala Lumpur
        prayer_times = await client.cultural.get_prayer_times_async(
            MalaysianState.KUALA_LUMPUR
        )
        print(f"Maghrib: {prayer_times.prayer_times['maghrib']}")

        # Validate halal medication
        halal_result = await client.cultural.validate_medication_async(
            medication_name="Paracetamol 500mg",
            manufacturer="Duopharma Biotech"
        )
        print(f"Halal Status: {halal_result.halal_status}")

        # Translate healthcare text
        translation = await client.cultural.translate_async(
            text="Take this medication twice daily after meals",
            target_language=SupportedLanguage.MALAY
        )
        print(f"Translation: {translation.translated_text}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Malaysian Cultural Context

Configure cultural preferences for enhanced Malaysian healthcare experience:

```python
from medimate_malaysia.models import CulturalContext

cultural_context = CulturalContext(
    malaysian_state=MalaysianState.KUALA_LUMPUR,
    preferred_language=SupportedLanguage.MALAY,
    prayer_time_aware=True,
    halal_requirements=True,
    ramadan_adjustments=True
)

client = MediMateMalaysia(
    api_key="your_key",
    cultural_context=cultural_context
)
```

## Services

### Cultural Intelligence Service

```python
# Prayer times with healthcare scheduling
prayer_times = await client.cultural.get_prayer_times_async("KUL")
current_status = await client.cultural.get_current_prayer_status_async("KUL")

# Healthcare translation with cultural context
translation = await client.cultural.translate_async(
    text="Please fast before the blood test",
    target_language=SupportedLanguage.MALAY,
    context={"domain": "clinical", "urgency": "medium"}
)

# Halal medication validation
halal_check = await client.cultural.validate_medication_async(
    medication_name="Insulin injection",
    manufacturer="Novo Nordisk"
)

# Ramadan healthcare adjustments
ramadan_info = await client.cultural.get_ramadan_info_async(2024)
```

### Patient Management Service

```python
from medimate_malaysia.models import PatientRequest, PatientPersonalInfo

patient_data = PatientRequest(
    personal_info=PatientPersonalInfo(
        name="Ahmad bin Abdullah",
        mykad_number="800101-01-1234",
        date_of_birth=date(1980, 1, 1),
        gender="male",
        race="Malay",
        religion="Islam"
    ),
    # ... other required fields
)

patient = await client.patients.create_patient_async(patient_data)
```

## Error Handling

```python
from medimate_malaysia.exceptions import MediMateError, RateLimitError

try:
    prayer_times = await client.cultural.get_prayer_times_async("KUL")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except MediMateError as e:
    print(f"API Error: {e.code} - {e.message}")
    if e.cultural_message:
        print(f"Malay: {e.cultural_message.get('ms')}")
```

## Malaysian State Codes

```python
from medimate_malaysia.models import MalaysianState

# All Malaysian states supported
MalaysianState.KUALA_LUMPUR      # KUL
MalaysianState.SELANGOR          # SGR
MalaysianState.JOHOR            # JHR
MalaysianState.PENANG           # PNG
MalaysianState.PERAK            # PRK
MalaysianState.PAHANG           # PHG
MalaysianState.TERENGGANU       # TRG
MalaysianState.KELANTAN         # KTN
MalaysianState.PERLIS           # PLS
MalaysianState.KEDAH            # KDH
MalaysianState.MELAKA           # MLK
MalaysianState.NEGERI_SEMBILAN  # NSN
MalaysianState.SARAWAK          # SWK
MalaysianState.SABAH            # SBH
```

## Requirements

- Python 3.8+
- aiohttp (for async support)
- requests (for sync support)
- pydantic (for data validation)
- websockets (for real-time features)

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.medimate.my/python-sdk
- GitHub Issues: https://github.com/medimate-malaysia/python-sdk/issues
- Email: sdk@medimate.my

---

🇲🇾 **Designed for Malaysian Healthcare** - Supporting Malaysian cultural and religious requirements in healthcare technology.
'''

        self.write_file("README.md", readme)

    def generate_init_files(self):
        """Generate __init__.py files"""
        # Main package init
        main_init = '''"""
MediMate Malaysia Healthcare API Python SDK
Official SDK with Malaysian cultural intelligence
"""

from .models import *
from .exceptions import *
from medimate_malaysia import MediMateMalaysia

__version__ = "1.2.0"
__author__ = "MediMate Malaysia"
__email__ = "sdk@medimate.my"

__all__ = [
    "MediMateMalaysia",
    "MediMateError",
    "AuthenticationError", 
    "RateLimitError",
    "ValidationError",
    "MalaysianState",
    "SupportedLanguage",
    "CulturalContext"
]
'''
        self.write_file("medimate_malaysia/__init__.py", main_init)

        # Services init
        self.write_file("medimate_malaysia/services/__init__.py", "")
        
        # Models init  
        self.write_file("medimate_malaysia/models/__init__.py", "")

if __name__ == "__main__":
    # Load OpenAPI spec (you would load this from the actual file)
    openapi_spec = {}
    
    generator = PythonSDKGenerator(openapi_spec)
    generator.generate()