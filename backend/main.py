import os
from datetime import date
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from extraction import extract_sales_meeting
from memory import get_all_memories, make_memories, save_memories
from retrieval import answer_with_memories


class ProcessRequest(BaseModel):
    transcript: str = Field(min_length=1)
    source: str = Field(min_length=1)
    date: date


class ProcessResponse(BaseModel):
    extracted: dict[str, Any]
    memories_saved: int


class AskRequest(BaseModel):
    question: str = Field(min_length=1)


class AskResponse(BaseModel):
    answer: str


app = FastAPI(title="Deal Memory API")
frontend_origins = [
    origin.strip()
    for origin in os.environ.get(
        "FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.post("/process", response_model=ProcessResponse)
def process_meeting(request: ProcessRequest) -> ProcessResponse:
    try:
        extracted = extract_sales_meeting(request.transcript)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    memories = make_memories(extracted, request.source, request.date.isoformat())
    save_memories(memories)
    return ProcessResponse(extracted=extracted, memories_saved=len(memories))


@app.get("/memories", response_model=list[dict[str, Any]])
def list_memories() -> list[dict[str, Any]]:
    return get_all_memories()


@app.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest) -> AskResponse:
    try:
        answer = answer_with_memories(request.question)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return AskResponse(answer=answer)