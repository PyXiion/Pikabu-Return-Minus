from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy import func
from database import Base
from schemas import Choice

class User(Base):
  __tablename__ = "users"

  id = Column(Integer, primary_key=True)

  secret = Column(String)
  create_date = Column(DateTime, server_default=func.now())
  
  story_choices = relationship("StoryChoice", back_populates="owner")

class StoryChoice(Base):
  __tablename__ = 'storychoices'

  story_id = Column(Integer, primary_key=True)
  owner_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
  choice = Column(Enum(Choice))

  owner = relationship("User", back_populates="story_choices")