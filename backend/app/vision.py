from __future__ import annotations

import base64
import json
import re
from typing import Any

from openai import OpenAI

from .config import Settings
from .prompts import NORTH_INDIAN_VEG_PROMPT
from .schemas import MealEstimate


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("Model did not return JSON")
        return json.loads(match.group(0))


def _reconcile_totals(payload: dict[str, Any]) -> dict[str, Any]:
    items = payload.get("items") or []
    if not items:
        return payload
    totals = {
        "calories": round(sum(float(i.get("calories", 0)) for i in items), 1),
        "protein_g": round(sum(float(i.get("protein_g", 0)) for i in items), 1),
        "carbs_g": round(sum(float(i.get("carbs_g", 0)) for i in items), 1),
        "fat_g": round(sum(float(i.get("fat_g", 0)) for i in items), 1),
    }
    payload["totals"] = totals
    return payload


class VisionEstimator:
    def __init__(self, settings: Settings):
        self.settings = settings
        if not settings.vision_configured:
            raise RuntimeError(
                "Vision API key not set. Add NVIDIA_API_KEY (or VISION_API_KEY) to .env."
            )
        self.client = OpenAI(
            api_key=settings.vision_api_key,
            base_url=settings.vision_base_url,
        )

    def estimate(self, image_bytes: bytes, mime_type: str) -> MealEstimate:
        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:{mime_type};base64,{b64}"

        request_kwargs: dict[str, Any] = {
            "model": self.settings.vision_model,
            "temperature": 0.2,
            "max_tokens": 4096,
            "messages": [
                {
                    "role": "system",
                    "content": NORTH_INDIAN_VEG_PROMPT,
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Estimate this North Indian vegetarian meal. "
                                "Use katori/count portions and include a smart reduction tip. "
                                "Respond with JSON only."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        },
                    ],
                },
            ],
        }

        # Nemotron on NVIDIA NIM: disable chain-of-thought for cleaner JSON
        if self.settings.is_nemotron:
            request_kwargs["extra_body"] = {
                "top_k": 1,
                "chat_template_kwargs": {
                    "enable_thinking": self.settings.vision_enable_thinking,
                },
            }
        else:
            request_kwargs["response_format"] = {"type": "json_object"}

        response = self.client.chat.completions.create(**request_kwargs)

        message = response.choices[0].message
        content = message.content or ""
        if not content.strip() and getattr(message, "reasoning_content", None):
            content = message.reasoning_content or "{}"

        payload = _reconcile_totals(_extract_json(content))
        return MealEstimate.model_validate(payload)
