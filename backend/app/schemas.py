from pydantic import BaseModel, Field


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
    smart_reduction_tip: SmartReductionTip
    confidence: str = Field(
        "medium",
        description="low | medium | high based on image clarity",
    )
    assumptions: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    model: str
    vision_configured: bool
