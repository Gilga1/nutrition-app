from typing import Literal

from pydantic import BaseModel, Field

ActivityLevel = Literal["sedentary", "light", "moderate", "active", "very_active"]
MealType = Literal["Breakfast", "Lunch", "Dinner", "Snack", "Pre-workout"]
MedicalCondition = Literal["thyroid", "diabetes", "hypertension", "pcos", "none"]
Sex = Literal["male", "female"]


class UserProfile(BaseModel):
    height_cm: float | None = Field(None, ge=50, le=280)
    weight_kg: float | None = Field(None, ge=20, le=300)
    age: int | None = Field(None, ge=10, le=120)
    sex: Sex | None = None
    activity_level: ActivityLevel = "moderate"
    conditions: list[MedicalCondition] = Field(default_factory=list)


class FoodItem(BaseModel):
    item: str = Field(..., description="Dish or food name")
    portion: str = Field(
        ...,
        description="Estimated portion, e.g. '1.5 katori', '2 roti', '1 bowl'",
    )
    calories: float = Field(..., ge=0, description="Estimated calories for the portion")
    protein_g: float = Field(..., ge=0, description="Estimated protein in grams")
    carbs_g: float = Field(0, ge=0, description="Estimated carbs in grams")
    fat_g: float = Field(0, ge=0, description="Estimated fat in grams")
    notes: str | None = Field(
        None,
        description="Cooking medium or assumptions, e.g. 'cooked in ghee'",
    )


class MacroTotals(BaseModel):
    calories: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    carbs_g: float = Field(0, ge=0)
    fat_g: float = Field(0, ge=0)


class MicroTotals(BaseModel):
    fibre_g: float = Field(0, ge=0)
    calcium_mg: float = Field(0, ge=0)
    iron_mg: float = Field(0, ge=0)
    zinc_mg: float = Field(0, ge=0)
    magnesium_mg: float = Field(0, ge=0)
    sodium_mg: float = Field(0, ge=0)
    potassium_mg: float = Field(0, ge=0)
    sugar_g: float = Field(0, ge=0)
    vitamin_c_mg: float = Field(0, ge=0)
    vitamin_d_iu: float = Field(0, ge=0)


class DailyTargets(BaseModel):
    calories: float | None = None
    protein_g: float | None = None
    note: str | None = None


class SmartReductionTip(BaseModel):
    tip: str = Field(..., description="Actionable calorie/protein tip")
    estimated_calorie_savings: float | None = Field(
        None, ge=0, description="Approx calories saved if tip is followed"
    )
    estimated_protein_change_g: float | None = Field(
        None,
        description="Protein change if tip followed (can be positive)",
    )


class MealEstimate(BaseModel):
    meal_summary: str = Field(..., description="Short description of the plate")
    items: list[FoodItem]
    totals: MacroTotals
    micros: MicroTotals = Field(default_factory=MicroTotals)
    daily_targets: DailyTargets | None = None
    smart_reduction_tip: SmartReductionTip
    confidence: str = Field(
        "medium",
        description="low | medium | high based on image clarity",
    )
    assumptions: list[str] = Field(default_factory=list)
    notion_page_url: str | None = None


class HealthResponse(BaseModel):
    status: str
    model: str
    vision_configured: bool
    notion_configured: bool
