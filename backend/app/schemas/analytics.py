from datetime import datetime
from typing import Dict, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


AnalyticsValue = Union[str, int, float, bool]


class AnalyticsEventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event: str = Field(min_length=1, max_length=80)
    session_id: str = Field(min_length=1, max_length=120)
    path: str = Field(min_length=1, max_length=255)
    timestamp: datetime
    properties: Dict[str, AnalyticsValue] = Field(default_factory=dict)

    @field_validator("properties")
    @classmethod
    def validate_properties(cls, value: Dict[str, AnalyticsValue]):
        if len(value) > 30:
            raise ValueError("Too many analytics properties")
        for key in value:
            if len(key) > 80:
                raise ValueError("Analytics property name is too long")
        return value
