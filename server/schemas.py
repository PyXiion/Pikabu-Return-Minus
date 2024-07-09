from pydantic import BaseModel
from enum import IntEnum
from typing import Optional

class AuthInfo(BaseModel):
  id: int
  secret: str

class Choice(IntEnum):
  PLUS = 1
  NEUTRAL = 0
  MINUS = -1

class StoryInfo(BaseModel):
  minuses: int
  your_choice: Choice | None