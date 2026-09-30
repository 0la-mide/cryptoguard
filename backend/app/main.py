from typing import Literal

from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import engine
from .report import build_pdf

app = FastAPI(title="CryptoGuard API", docs_url="/api/docs", openapi_url="/api/openapi.json")


class SimRequest(BaseModel):
    samples: int = Field(500, ge=100, le=2000)
    bit_gap_ms: float = Field(40.0, ge=5, le=80)
    noise_std_ms: float = Field(8.0, ge=1, le=20)
    alpha: float = Field(0.05, ge=0.01, le=0.99)
    kp: float = Field(0.8, ge=0.1, le=2.0)
    ki: float = Field(0.1, ge=0.01, le=0.5)
    kd: float = Field(0.05, ge=0.01, le=0.2)
    setpoint_ms: float = Field(500.0, ge=400, le=700)
    threat_model: Literal["external", "rogue_node"] = "external"
    threshold_ms: float = Field(4.5, gt=0, le=50)
    wcet_enabled: bool = False
    wcet_budget_ms: float = Field(600.0, ge=500, le=900)
    seed: int | None = Field(None, ge=0, le=2**31 - 1)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/simulate")
def simulate(req: SimRequest):
    return engine.run(engine.SimConfig(**req.model_dump()))


@app.post("/api/report")
def report(req: SimRequest):
    """Re-runs the simulation (pass the seed from /simulate to reproduce it) and returns a PDF."""
    result = engine.run(engine.SimConfig(**req.model_dump()))
    pdf = build_pdf(result)
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="cryptoguard-report-{result["config"]["seed"]}.pdf"'},
    )
