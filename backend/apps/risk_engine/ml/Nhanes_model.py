"""
Runtime loader for the undiagnosed-T2D detector.

Loads model/model.pkl (an L2 LogisticRegression pipeline wrapped in
CalibratedClassifierCV) and maps form answers to the exact feature vector
produced by prepare() in nhanes_dysglycemia.py.

If the two feature lists drift apart, the model silently sees different
inputs than it was trained on. Keep them in sync.
"""
import json
import os
import pickle

import numpy as np
import pandas as pd

MODEL_DIR = "model"


class DetectionModel:
    """Loads model/model.pkl + model/schema.json. Disabled if either missing."""

    def __init__(self, model_dir: str = MODEL_DIR):
        self.available = False
        self.reason = None

        schema_path = os.path.join(model_dir, "schema.json")
        model_path = os.path.join(model_dir, "model.pkl")

        if not all(os.path.exists(p) for p in (schema_path, model_path)):
            self.reason = ("model not trained yet "
                           "(run: python nhanes_dysglycemia.py --train)")
            return

        try:
            with open(schema_path) as f:
                self.schema = json.load(f)
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            self.features = self.schema["features"]
            self.threshold = self.schema["threshold"]
            self.available = True
        except Exception as e:
            self.reason = f"could not load model: {e.__class__.__name__}: {e}"

    # -----------------------------------------------------------------
    # FORM -> FEATURES
    # Must mirror prepare() in nhanes_dysglycemia.py exactly.
    # -----------------------------------------------------------------
    @staticmethod
    def _featurize(a: dict) -> dict:
        height_m = a["height_cm"] / 100.0
        bmi = a["weight_kg"] / (height_m ** 2)

        waist = a.get("waist_cm")
        whtr = (waist / a["height_cm"]) if waist else None

        # Family history: anything other than "none"/None counts as yes
        family_hx = 0 if a.get("family_history") in (None, "none") else 1
        gest_dm = 1 if a.get("gestational_dm") else 0

        # DIABSCORE = age + 100 * whtr + 10 * FH + 25 * GDM
        # If waist is missing, the whole score is missing (matches training).
        if whtr is not None:
            diabscore = a["age"] + 100.0 * whtr + 10.0 * family_hx + 25.0 * gest_dm
        else:
            diabscore = None

        # BP meds: skip pattern. If not told hypertensive, force 0.
        htn_yes = 1 if a.get("hypertension_dx") else 0
        if htn_yes:
            bp_meds_yes = 1 if a.get("bp_medication") else 0
        else:
            bp_meds_yes = 0

        return {
            "age":               a["age"],
            "bmi":               bmi,
            "whtr":              whtr,
            "sbp":               a.get("sbp"),
            "diabscore":         diabscore,
            "sex_male":          1 if a["sex"] == "M" else 0,
            "family_hx_yes":     family_hx,
            "gest_dm_yes":       gest_dm,
            "inactive_yes":      0 if a.get("active_30min_daily") else 1,
            "bp_meds_yes":       bp_meds_yes,
            "htn_yes":           htn_yes,
            "smoker_now":        1 if a.get("smoker_now") else 0,
            "high_glucose_hist": 1 if a.get("high_glucose_ever") else 0,
        }

    def predict(self, a: dict) -> dict:
        if not self.available:
            return {"available": False, "reason": self.reason}

        f = self._featurize(a)

        # DataFrame with the exact column order the pipeline was fit on.
        # NaN flows through to SimpleImputer, which uses the training medians
        # and modes saved inside model.pkl. Do NOT impute here.
        row = pd.DataFrame(
            [[f.get(k, np.nan) for k in self.features]],
            columns=self.features,
            dtype=float,
        )

        p = float(self.model.predict_proba(row)[0, 1])

        return {
            "available": True,
            "probability": round(p, 3),
            "flagged": bool(p >= self.threshold),
            "claim": ("probability of ALREADY having prediabetes or "
                      "undiagnosed type 2 diabetes today"),
            "not_a_claim": "this is not a future-risk estimate",
        }


if __name__ == "__main__":
    from demo_profiles import KARIM
    m = DetectionModel()
    print("available:", m.available, "" if m.available else f"({m.reason})")
    print(m.predict(KARIM))
