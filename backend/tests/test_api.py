from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

STRONG = dict(alpha=0.99, kp=2.0, ki=0.01, kd=0.01)


def sim(**kw):
    r = client.post("/api/simulate", json=kw)
    assert r.status_code == 200, r.text
    return r.json()


def test_same_seed_is_reproducible():
    assert sim(seed=7) == sim(seed=7)


def test_default_config_leaks_like_original_script():
    r = sim(seed=42, threat_model="rogue_node")
    raw, iir, obs = r["stages"]
    assert raw["leaked"] and obs["leaked"]
    assert not iir["leaked"]  # the IIR hides the gap internally, but T_obs still leaks
    assert r["recommendations"]


def test_wcet_gives_zero_gap_for_rogue_node():
    r = sim(seed=3, threat_model="rogue_node", wcet_enabled=True, **STRONG)
    assert r["true_t_obs_gap_ms"] == 0
    assert not r["attacker"]["leaked"]


def test_external_attacker_sees_subset():
    r = sim(seed=1, samples=1000)
    assert r["attacker"]["samples_observed"] == 150
    assert len(r["series"]["t_obs"]) == 150


def test_rejects_out_of_range():
    assert client.post("/api/simulate", json={"samples": 50000}).status_code == 422


def test_report_is_pdf():
    r = client.post("/api/report", json={"seed": 5})
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"
