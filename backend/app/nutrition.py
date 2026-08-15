from __future__ import annotations

from .schemas import ActivityLevel, DailyTargets, Sex, UserProfile

ACTIVITY_MULTIPLIERS: dict[ActivityLevel, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}


def estimate_tdee(profile: UserProfile) -> DailyTargets | None:
    if not all([profile.height_cm, profile.weight_kg, profile.age, profile.sex]):
        return None

    weight = profile.weight_kg or 0
    height = profile.height_cm or 0
    age = profile.age or 0
    sex = profile.sex or "male"

    if sex == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    multiplier = ACTIVITY_MULTIPLIERS.get(profile.activity_level, 1.55)
    calories = round(bmr * multiplier)

    protein_g = round(weight * 1.6)  # moderate lean-mass target
    notes: list[str] = []

    conditions = {c for c in profile.conditions if c != "none"}
    if "diabetes" in conditions:
        notes.append("Diabetes: favour lower GI carbs, avoid sugary chutneys.")
    if "thyroid" in conditions:
        notes.append("Thyroid: ensure adequate iodine/selenium from dals and nuts.")
    if "hypertension" in conditions:
        notes.append("BP: watch sodium from pickle, papad, and restaurant gravies.")
    if "pcos" in conditions:
        notes.append("PCOS: prioritise protein and fibre; limit refined carbs.")

    note = " ".join(notes) if notes else None
    return DailyTargets(calories=calories, protein_g=protein_g, note=note)
