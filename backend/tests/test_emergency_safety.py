import pytest
from backend.app.schemas.prediction import HeartDiseaseInput
from backend.app.services.emergency_safety import check_emergency_safety


def get_base_input():
    return HeartDiseaseInput(
        age=50.0,
        sex=1.0,
        cp=2.0,
        trestbps=120.0,
        chol=200.0,
        fbs=0.0,
        restecg=0.0,
        thalach=140.0,
        exang=0.0,
        oldpeak=0.5,
        slope=1.0,
        ca=0.0,
        thal=3.0
    )


def test_normal_case_no_emergency():
    inp = get_base_input()
    res = check_emergency_safety(inp, ["Mild headache"])
    assert res.is_emergency is False
    assert res.urgent_warning is None


def test_crushing_chest_pain_triggers_emergency():
    inp = get_base_input()
    res = check_emergency_safety(inp, ["crushing chest pain radiating to arm"])
    assert res.is_emergency is True
    assert "CRITICAL EMERGENCY" in res.urgent_warning
    assert "112" in res.emergency_contact
    assert any("chest pain" in f for f in res.detected_flags)


def test_hypertensive_crisis_triggers_emergency():
    inp = get_base_input()
    inp.trestbps = 195.0
    res = check_emergency_safety(inp, [])
    assert res.is_emergency is True
    assert any("hypertensive" in f for f in res.detected_flags)


def test_acute_stroke_signs_triggers_emergency():
    inp = get_base_input()
    res = check_emergency_safety(inp, ["sudden facial drooping", "slurred speech"])
    assert res.is_emergency is True
    assert any("facial drooping" in f or "slurred speech" in f for f in res.detected_flags)
