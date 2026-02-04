"""AI Analysis Service using GPT-4o-mini

Handles all AI analysis for Reddit posts:
- Sentiment Analysis
- Intent Detection
- Pain Point Detection
- Entity Extraction
- Topic Modeling

All features are processed in a single API call to minimize cost.
"""

import json
import time
import logging
from typing import Optional, Dict, Any, List
from decimal import Decimal
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

# System prompt instructs GPT-4o-mini on what to extract
ANALYSIS_SYSTEM_PROMPT = """You are an expert AI analyst specializing in social media text analysis for Reddit posts.

Your job is to analyze a Reddit post and extract structured intelligence. You must return ONLY valid JSON with no extra text.

Analyze the post for ALL of the following:

1. **Sentiment**: Classify as "positive", "negative", "neutral", or "mixed". Provide a score from -1.0 (most negative) to 1.0 (most positive). Detect sarcasm - if sarcastic, the sentiment should reflect the TRUE meaning, not the surface words.

2. **Emotion**: Identify the primary emotion: "joy", "anger", "frustration", "excitement", "confusion", "disappointment", "curiosity", "satisfaction", "fear", "neutral".

3. **Intent**: Classify the author's intent. Can be multiple:
   - "question" - Asking for help or information
   - "complaint" - Expressing dissatisfaction
   - "recommendation" - Suggesting a product/tool/approach
   - "purchase_intent" - Looking to buy or use something
   - "feature_request" - Wanting new functionality
   - "comparison" - Comparing products/tools
   - "praise" - Expressing appreciation
   - "help_offering" - Providing assistance to others
   - "discussion" - General conversation
   - "announcement" - Sharing news

4. **Pain Points**: Identify specific frustrations or problems. For each:
   - Extract the exact phrase from the post
   - Categorize: "performance", "usability", "missing_feature", "pricing", "documentation", "support", "reliability", "security", "compatibility"
   - Rate severity: "low", "medium", "high", "critical"

5. **Entities**: Extract mentioned entities:
   - Products/tools (e.g., "React", "PostgreSQL")
   - Companies/organizations (e.g., "Google", "Microsoft")
   - Technologies/concepts (e.g., "microservices", "REST API")
   - People (if mentioned by name)

6. **Topics**: Classify into 1-3 topics from this list:
   - "getting_started", "performance", "bug_report", "feature_request", "best_practices", "deployment", "security", "database", "api_design", "testing", "documentation", "career", "architecture", "devops", "machine_learning", "web_development", "mobile", "open_source", "pricing", "comparison", "tutorial", "news", "other"

7. **Keywords**: Extract 3-7 important keywords or phrases from the post.

8. **Customer Language**: Extract 1-3 notable phrases that represent how the author naturally describes their problem or need. These are useful for marketing copy.

Return this exact JSON structure:
{
  "sentiment": {
    "label": "positive|negative|neutral|mixed",
    "score": <float -1.0 to 1.0>,
    "confidence": <float 0.0 to 1.0>,
    "is_sarcastic": <bool>
  },
  "emotion": {
    "label": "<primary emotion>",
    "score": <float 0.0 to 1.0>
  },
  "intent": {
    "labels": ["<intent1>", "<intent2>"],
    "primary": "<most dominant intent>",
    "confidence": <float 0.0 to 1.0>
  },
  "pain_points": [
    {
      "phrase": "<exact quote from post>",
      "category": "<category>",
      "severity": "low|medium|high|critical"
    }
  ],
  "entities": {
    "products": ["<product1>", "<product2>"],
    "companies": ["<company1>"],
    "technologies": ["<tech1>", "<tech2>"],
    "people": []
  },
  "topics": ["<topic1>", "<topic2>"],
  "keywords": ["<kw1>", "<kw2>", "<kw3>"],
  "customer_language": ["<phrase1>", "<phrase2>"]
}"""


def _build_user_prompt(title: str, body: str, subreddit: str) -> str:
    """Build the user prompt with post content."""
    text_parts = []
    if subreddit:
        text_parts.append(f"Subreddit: r/{subreddit}")
    if title:
        text_parts.append(f"Title: {title}")
    if body:
        # Truncate very long posts to stay within token limits
        truncated_body = body[:3000] if len(body) > 3000 else body
        text_parts.append(f"Body: {truncated_body}")

    return "\n".join(text_parts)


class AIAnalyzer:
    """Service for analyzing Reddit posts using GPT-4o-mini."""

    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not set. AI analysis will fail.")
            self.client = None
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = settings.OPENAI_TEMPERATURE

    def analyze_post(
        self,
        title: str,
        body: str,
        subreddit: str = "",
    ) -> Dict[str, Any]:
        """
        Analyze a single Reddit post using GPT-4o-mini.

        Args:
            title: Post title
            body: Post body/selftext
            subreddit: Subreddit name

        Returns:
            Dict with sentiment, intent, pain_points, entities, topics, keywords
        """
        if not self.client:
            raise RuntimeError(
                "OpenAI client not initialized. Set OPENAI_API_KEY in your .env file."
            )

        user_prompt = _build_user_prompt(title, body, subreddit)
        start_time = time.time()

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                response_format={"type": "json_object"},
            )

            raw_content = response.choices[0].message.content
            result = json.loads(raw_content)
            processing_time_ms = int((time.time() - start_time) * 1000)

            result["_meta"] = {
                "model": self.model,
                "processing_time_ms": processing_time_ms,
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }

            logger.info(
                f"Post analyzed in {processing_time_ms}ms "
                f"(tokens: {response.usage.total_tokens})"
            )
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT response as JSON: {e}")
            raise ValueError(f"GPT returned invalid JSON: {e}")
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            raise

    def analyze_batch(
        self,
        posts: List[Dict[str, str]],
    ) -> List[Dict[str, Any]]:
        """
        Analyze multiple posts sequentially.

        Args:
            posts: List of dicts with keys: title, body, subreddit

        Returns:
            List of analysis results
        """
        results = []
        for i, post in enumerate(posts):
            try:
                result = self.analyze_post(
                    title=post.get("title", ""),
                    body=post.get("body", ""),
                    subreddit=post.get("subreddit", ""),
                )
                result["_post_index"] = i
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to analyze post {i}: {e}")
                results.append({
                    "_post_index": i,
                    "_error": str(e),
                    "sentiment": {"label": "unknown", "score": 0, "confidence": 0},
                    "intent": {"labels": [], "primary": "unknown", "confidence": 0},
                    "pain_points": [],
                    "entities": {"products": [], "companies": [], "technologies": [], "people": []},
                    "topics": [],
                    "keywords": [],
                    "customer_language": [],
                })
        return results


def map_analysis_to_db_fields(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map GPT analysis result to AIAnalysis database model fields.

    Args:
        analysis: Raw analysis dict from GPT-4o-mini

    Returns:
        Dict matching AIAnalysis model columns
    """
    sentiment = analysis.get("sentiment", {})
    emotion = analysis.get("emotion", {})
    intent = analysis.get("intent", {})
    pain_points = analysis.get("pain_points", [])
    entities = analysis.get("entities", {})
    topics = analysis.get("topics", [])
    keywords = analysis.get("keywords", [])
    meta = analysis.get("_meta", {})

    # Determine pain point fields
    has_pain = len(pain_points) > 0
    pain_category = pain_points[0]["category"] if has_pain else None
    pain_severity = pain_points[0]["severity"] if has_pain else None
    pain_phrases = [p["phrase"] for p in pain_points] if has_pain else None

    # Build entity count
    entity_count = (
        len(entities.get("products", []))
        + len(entities.get("companies", []))
        + len(entities.get("technologies", []))
        + len(entities.get("people", []))
    )

    return {
        # Sentiment
        "sentiment_label": sentiment.get("label"),
        "sentiment_score": Decimal(str(sentiment.get("score", 0))),
        # Emotion
        "emotion": emotion.get("label"),
        "emotion_score": Decimal(str(emotion.get("score", 0))),
        # Intent
        "intent_label": intent.get("primary"),
        "intent_score": Decimal(str(intent.get("confidence", 0))),
        # Pain points
        "has_pain_point": has_pain,
        "pain_point_category": pain_category,
        "pain_point_severity": pain_severity,
        "pain_point_phrases": pain_phrases,
        # Entities
        "entities": entities,
        "entity_count": entity_count,
        # Topics
        "topics": topics,
        "main_topic": topics[0] if topics else None,
        # Keywords
        "extracted_keywords": keywords,
        # Model info
        "model_version": meta.get("model", "gpt-4o-mini"),
        "processing_time_ms": meta.get("processing_time_ms"),
    }
