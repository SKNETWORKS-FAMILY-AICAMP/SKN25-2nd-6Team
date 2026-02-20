import pandas as pd
import requests
import holidays

BASE_DIR = r"C:\Users\playdata2\Desktop\skn\project 2_file"
APPOINTMENT_PATH = BASE_DIR + r"\Appointment.csv"

OUT_CAL_PATH = BASE_DIR + r"\Calendar.csv"
OUT_WEATHER_PATH = BASE_DIR + r"\Weather.csv"

# Vitória(ES, Brazil) 대표 좌표
LAT, LON = -20.3155, -40.3128

# Appointment-전체 기간
appt = pd.read_csv(APPOINTMENT_PATH)
appt["appt_date"] = pd.to_datetime(appt["appt_date"], errors="coerce").dt.floor("D")

start = appt["appt_date"].min()
end   = appt["appt_date"].max()

print("Date range:", start.date(), "~", end.date())

# Calendar 생성 (연속 날짜)
calendar = pd.DataFrame({"date": pd.date_range(start, end, freq="D")})
calendar["date"] = pd.to_datetime(calendar["date"], errors="coerce").dt.tz_localize(None).dt.floor("D")

calendar["dow"] = calendar["date"].dt.dayofweek
calendar["month"] = calendar["date"].dt.month
calendar["is_weekend"] = (calendar["dow"] >= 5).astype(int)

# 브라질(ES) 공휴일
br_holidays = holidays.Brazil(subdiv="ES")
calendar["is_holiday"] = calendar["date"].dt.date.map(lambda d: 1 if d in br_holidays else 0)

# 공휴일 전후일
calendar = calendar.sort_values("date").reset_index(drop=True)
calendar["is_before_holiday"] = calendar["is_holiday"].shift(-1).fillna(0).astype(int)
calendar["is_after_holiday"]  = calendar["is_holiday"].shift(1).fillna(0).astype(int)

calendar.to_csv(OUT_CAL_PATH, index=False)

print("Saved:", OUT_CAL_PATH)
print("Calendar rows:", len(calendar), "is_holiday sum:", calendar["is_holiday"].sum())

# Weather 생성
start_date = start.strftime("%Y-%m-%d")
end_date   = end.strftime("%Y-%m-%d")

url = "https://archive-api.open-meteo.com/v1/archive"
params = {
    "latitude": LAT,
    "longitude": LON,
    "start_date": start_date,
    "end_date": end_date,
    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    "timezone": "America/Sao_Paulo"
}

r = requests.get(url, params=params, timeout=30)
r.raise_for_status()
data = r.json()

weather = pd.DataFrame({
    "date": pd.to_datetime(data["daily"]["time"]),
    "max_temp": data["daily"]["temperature_2m_max"],
    "min_temp": data["daily"]["temperature_2m_min"],
    "precip_mm": data["daily"]["precipitation_sum"],
    "weather_code": data["daily"]["weather_code"],
})

weather = weather.rename(columns={"weather_code": "weather"})
weather["date"] = pd.to_datetime(weather["date"]).dt.tz_localize(None).dt.floor("D")
weather["temp_range"] = weather["max_temp"] - weather["min_temp"]
weather["is_rainy"] = (weather["precip_mm"] > 0).astype(int)

# code -> text
WMO_WEATHER = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm"
}
weather["weather_desc"] = weather["weather"].map(WMO_WEATHER).fillna("Unknown")

weather = weather.sort_values("date").reset_index(drop=True)
weather.to_csv(OUT_WEATHER_PATH, index=False)

print("Saved:", OUT_WEATHER_PATH)
print("Weather rows:", len(weather), "Missing max_temp:", weather["max_temp"].isna().sum())
print(weather.head(3))