# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from sqlalchemy import Column, Integer, String, TIMESTAMP, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

# --- MySQL connection (async) ---
DATABASE_URL = "mysql+aiomysql://root:dbpassword@3.104.211.124:3306/sputnik_game"

# --- Database Setup ---
Base = declarative_base()
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"
    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(50), nullable=False)
    score = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

# --- Pydantic Model ---
class ScoreEntry(BaseModel):
    nickname: str
    score: int

# --- FastAPI App ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Create Tables on Startup ---
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# --- Endpoints ---
@app.get("/leaderboard", response_model=List[ScoreEntry])
async def get_leaderboard():
    async with async_session() as session:
        result = await session.execute(
            select(LeaderboardEntry).order_by(LeaderboardEntry.score.desc()).limit(10)
        )
        rows = result.scalars().all()
        return [ScoreEntry(nickname=r.nickname, score=r.score) for r in rows]

@app.post("/leaderboard", status_code=201)
async def post_leaderboard(entry: ScoreEntry):
    if not entry.nickname:
        entry.nickname = "Anonymous"
    if entry.score < 0:
        raise HTTPException(status_code=400, detail="Score cannot be negative")

    async with async_session() as session:
        new_entry = LeaderboardEntry(nickname=entry.nickname, score=entry.score)
        session.add(new_entry)
        await session.commit()
    return {"message": "Score submitted successfully"}
