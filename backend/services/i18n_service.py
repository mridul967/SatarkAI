"""
Internationalization (i18n) Service — Phase E3 Bilingual Alerts (v4.1)
Provides English and Hindi alerts for transaction events.
"""

ALERT_TEMPLATES = {
    "CRITICAL": {
        "en": "High-risk transaction blocked. Score: {score}%. Transaction ID: {txn_id}",
        "hi": "उच्च जोखिम लेनदेन अवरुद्ध। स्कोर: {score}%। लेनदेन आईडी: {txn_id}",
    },
    "HIGH": {
        "en": "High-risk transaction flagged. Score: {score}%. Transaction ID: {txn_id}",
        "hi": "उच्च जोखिम लेनदेन चिह्नित। स्कोर: {score}%। लेनदेन आईडी: {txn_id}",
    },
    "SUSPICIOUS": { # Alias for MEDIUM risk
        "en": "Suspicious transaction flagged for review. Score: {score}%",
        "hi": "संदिग्ध लेनदेन समीक्षा के लिए चिह्नित। स्कोर: {score}%",
    },
    "MEDIUM": {
        "en": "Suspicious transaction flagged for review. Score: {score}%",
        "hi": "संदिग्ध लेनदेन समीक्षा के लिए चिह्नित। स्कोर: {score}%",
    },
    "SAFE": {
        "en": "Transaction validated. Score: {score}%. Profile looks legitimate.",
        "hi": "लेनदेन मान्य। स्कोर: {score}%। प्रोफ़ाइल वैध लग रही है।",
    },
    "FMR1_QUEUED": {
        "en": "FMR-1 draft generated. Compliance officer action required.",
        "hi": "एफएमआर-1 मसौदा तैयार। अनुपालन अधिकारी की कार्रवाई आवश्यक।",
    },
}

def get_alert(alert_type: str, lang: str = "en", **kwargs) -> str:
    """Helper to retrieve a formatted alert in the specified language."""
    # Handle risk level aliases
    if alert_type == "SUSPICIOUS" and "SUSPICIOUS" not in ALERT_TEMPLATES:
        alert_type = "MEDIUM"
        
    template_group = ALERT_TEMPLATES.get(alert_type, ALERT_TEMPLATES.get("SAFE"))
    template = template_group.get(lang, template_group.get("en", ""))
    
    try:
        return template.format(**kwargs)
    except Exception as e:
        print(f"i18n formatting error: {e}")
        return template # Return unformatted if keys missing
