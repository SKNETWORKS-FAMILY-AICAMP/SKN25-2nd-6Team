"""
Weather API module for fetching real-time weather data.
Uses Open-Meteo API — same source as training data, WMO weather codes, no API key needed.
"""
import requests
import streamlit as st

# Vitória, Espírito Santo, Brazil
LAT = -20.3155
LON = -40.3128

# WMO code emoji
WMO_ICONS = {
    0: "☀️",  1: "🌤️", 2: "⛅",  3: "☁️",
    45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌧️", 55: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "🌧️",
    71: "🌨️", 73: "❄️",  75: "❄️",
    80: "🌦️", 81: "🌧️", 82: "⛈️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
}

# WMO code description
WMO_DESC = {
    0: "Clear sky",      1: "Mainly clear",    2: "Partly cloudy",   3: "Overcast",
    45: "Fog",           48: "Rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain",   63: "Moderate rain",   65: "Heavy rain",
    71: "Slight snow",   73: "Moderate snow",   75: "Heavy snow",
    80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
    95: "Thunderstorm",  96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail",
}


@st.cache_data(ttl=600)  # 10분 캐시
def fetch_weather():
    """
    Open-Meteo Forecast API로 비토리아 실시간 날씨 조회
    훈련 데이터(data_calendar_weather.py)와 동일한 API·WMO 코드 사용

    Returns:
        icon (str)         : 날씨 이모지
        display_text (str) : 화면 표시용 문자열 (ex. "Partly cloudy, 27 °C")
        detail (dict)      : 모델 피처 {'max_temp', 'min_temp', 'precip_mm',
                                         'weather', 'temp_range', 'is_rainy'}
    """
    _fallback_detail = {
        "max_temp": 28.0, "min_temp": 22.0, "precip_mm": 0.0,
        "weather": 0, "temp_range": 6.0, "is_rainy": 0,
    }
    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": LAT,
            "longitude": LON,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
            "current": "temperature_2m,weather_code",
            "timezone": "America/Sao_Paulo",
            "forecast_days": 1,
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        # 현재 기온·코드 - 상단 카드 표시용
        cur_temp  = round(data["current"]["temperature_2m"])
        cur_code  = int(data["current"]["weather_code"])

        # 오늘 일별 요약 - 모델 피처용
        max_temp   = data["daily"]["temperature_2m_max"][0]
        min_temp   = data["daily"]["temperature_2m_min"][0]
        precip_mm  = data["daily"]["precipitation_sum"][0] or 0.0
        day_code   = int(data["daily"]["weather_code"][0])

        icon         = WMO_ICONS.get(cur_code, "🌤️")
        display_text = f"{WMO_DESC.get(cur_code, 'Unknown')}, {cur_temp} °C"

        detail = {
            "max_temp":  float(max_temp),
            "min_temp":  float(min_temp),
            "precip_mm": float(precip_mm),
            "weather":   day_code,                        # WMO code
            "temp_range": float(max_temp - min_temp),
            "is_rainy":   1 if precip_mm > 0 else 0,
        }
        return icon, display_text, detail

    except requests.exceptions.Timeout:
        print("Weather API timeout")
        return "날씨 정보 요청 시간 초과", _fallback_detail
    except Exception as e:
        print(f"Weather API error: {e}")
        import traceback
        traceback.print_exc()
        return f"날씨 정보 오류: {str(e)}", _fallback_detail
