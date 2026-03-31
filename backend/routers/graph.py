from fastapi import APIRouter
from services.graph_service import graph_service

router = APIRouter()

@router.get("/{user_id}")
async def fetch_graph(user_id: str):
    return graph_service.get_graph_data(user_id)
