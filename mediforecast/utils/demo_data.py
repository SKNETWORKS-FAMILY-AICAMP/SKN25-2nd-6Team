"""
Demo data for today's appointments (2026-02-23)
"""
import pandas as pd
from pathlib import Path

# Today's appointments based on patient_name_map.csv
TODAY_APPOINTMENTS = [
    {"patient_id": "16349457375728.0", "name": "Nayeon Kim", "gender": "F", "age": 28, "time": "09:00", "sms_received": 1, "lead_time_days": 7, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "2168349418751.0", "name": "Yeseung Yang", "gender": "F", "age": 35, "time": "09:20", "sms_received": 0, "lead_time_days": 2, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "1168774745422.0", "name": "Beomsu Park", "gender": "M", "age": 42, "time": "09:30", "sms_received": 1, "lead_time_days": 5, "has_hypertension": 1, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "34299581483367.0", "name": "Geunhyeok Lee", "gender": "M", "age": 55, "time": "09:40", "sms_received": 0, "lead_time_days": 1, "has_hypertension": 0, "has_diabetes": 1, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "18823843757122.0", "name": "Hyeonwoo Choi", "gender": "M", "age": 31, "time": "09:45", "sms_received": 1, "lead_time_days": 3, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "93544699263711.0", "name": "Gayeong Kwon", "gender": "F", "age": 24, "time": "10:00", "sms_received": 0, "lead_time_days": 14, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "1166652312747.0", "name": "Haejun Yeo", "gender": "M", "age": 67, "time": "10:10", "sms_received": 1, "lead_time_days": 4, "has_hypertension": 1, "has_diabetes": 1, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "5164842912135.0", "name": "Haengun Yu", "gender": "M", "age": 19, "time": "10:20", "sms_received": 0, "lead_time_days": 0, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "76436476713814.0", "name": "Unyeol Jeon", "gender": "M", "age": 45, "time": "10:30", "sms_received": 1, "lead_time_days": 10, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "843774968473447.0", "name": "Eunseok Jo", "gender": "M", "age": 52, "time": "11:00", "sms_received": 1, "lead_time_days": 6, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "22739496469342.0", "name": "Seohyeon Kim", "gender": "F", "age": 29, "time": "11:00", "sms_received": 0, "lead_time_days": 8, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "198279686554265.0", "name": "Juhee Kim", "gender": "F", "age": 33, "time": "11:00", "sms_received": 1, "lead_time_days": 2, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "98729257569184.0", "name": "Chanyeong Kim", "gender": "M", "age": 38, "time": "11:10", "sms_received": 0, "lead_time_days": 15, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "955324437896599.0", "name": "Sangmin Lee", "gender": "M", "age": 48, "time": "11:20", "sms_received": 1, "lead_time_days": 5, "has_hypertension": 1, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "73473538658.0", "name": "Wonjun Choi", "gender": "M", "age": 26, "time": "11:30", "sms_received": 0, "lead_time_days": 1, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "78225316373962.0", "name": "Seongjin Park", "gender": "M", "age": 41, "time": "11:40", "sms_received": 1, "lead_time_days": 7, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "97943652197.0", "name": "Munsu Shin", "gender": "M", "age": 59, "time": "11:50", "sms_received": 0, "lead_time_days": 3, "has_hypertension": 0, "has_diabetes": 1, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "722385516987736.0", "name": "Suyeong Lee", "gender": "F", "age": 22, "time": "12:00", "sms_received": 1, "lead_time_days": 4, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "6346563561873.0", "name": "Hayun Lee", "gender": "F", "age": 36, "time": "13:00", "sms_received": 0, "lead_time_days": 12, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "857945381299535.0", "name": "Junmyeong Choi", "gender": "M", "age": 50, "time": "13:15", "sms_received": 1, "lead_time_days": 6, "has_hypertension": 1, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "94582556624467.0", "name": "Hongik Kim", "gender": "M", "age": 44, "time": "13:20", "sms_received": 0, "lead_time_days": 9, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "73663142844159.0", "name": "Chaerim Lee", "gender": "F", "age": 27, "time": "13:30", "sms_received": 1, "lead_time_days": 2, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "978793849838649.0", "name": "Hansol Lee", "gender": "F", "age": 31, "time": "13:40", "sms_received": 0, "lead_time_days": 0, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "8319825746742.0", "name": "Hayeong Im", "gender": "F", "age": 25, "time": "14:15", "sms_received": 1, "lead_time_days": 5, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "54137448737647.0", "name": "Yurim Choi", "gender": "F", "age": 39, "time": "14:30", "sms_received": 0, "lead_time_days": 11, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "989133166643.0", "name": "Jihyun Kim", "gender": "F", "age": 34, "time": "14:40", "sms_received": 1, "lead_time_days": 3, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "11619495835628.0", "name": "Yeonjun Kim", "gender": "M", "age": 21, "time": "15:00", "sms_received": 0, "lead_time_days": 1, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "24662666413967.0", "name": "Minseo Cho", "gender": "F", "age": 30, "time": "15:10", "sms_received": 1, "lead_time_days": 8, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "245549134617978.0", "name": "Jihyun Park", "gender": "F", "age": 46, "time": "15:50", "sms_received": 0, "lead_time_days": 4, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
    {"patient_id": "7619841287682.0", "name": "Yeonjeong Park", "gender": "F", "age": 53, "time": "16:00", "sms_received": 1, "lead_time_days": 10, "has_hypertension": 1, "has_diabetes": 1, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0},
]

def get_todays_appointments():
    """Return today's appointments as a DataFrame"""
    return pd.DataFrame(TODAY_APPOINTMENTS)
