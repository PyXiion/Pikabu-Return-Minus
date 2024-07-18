from fastapi import FastAPI, HTTPException, Depends
from schemas import StoryInfo, AuthInfo, Choice
from typing import Optional
from sqlalchemy.orm import Session
import models, secrets
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

def check_auth_info(db: Session, info: AuthInfo, exception: bool = True) -> bool:
  db_user: models.User = db \
    .query(models.User) \
    .filter(models.User.id == info.id) \
    .get()
  
  if db_user.secret != info.secret:
    if exception: raise HTTPException(401, 'Access forbidden')
    return False
  
  return True

@app.post('/user/register')
async def register(db: Session = Depends(get_db)) -> AuthInfo:
  db_user = models.User(secret = secrets.token_urlsafe(64))
  db.add(db_user)
  db.commit()
  return AuthInfo(id=db_user.id, secret=db_user.secret)

@app.post('/story/{story_id}/get')
async def get_story(auth: Optional[AuthInfo], story_id: int, db: Session = Depends(get_db)) -> StoryInfo:
  query = db \
    .query(models.StoryChoice) \
    .filter(models.StoryChoice.story_id == story_id) \
    .filter(models.StoryChoice.choice == Choice.MINUS)
  
  return StoryInfo(minuses=query.count(), your_choice=None)
  

@app.post('/story/{story_id}/vote')
async def post_story(story_id: int, auth: AuthInfo, choice: Choice, db: Session = Depends(get_db)):
  if not check_auth_info(auth):
    raise HTTPException(401, 'Unauthorized')
  
  

  db_choice = models.StoryChoice(story_id=story_id, owner_id=auth.id, choice=choice)
  db.merge(db_choice)
  db.commit()
