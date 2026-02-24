import re
import pandas as pd
import os

INPUT_PATH = "../data/emergency.csv"
OUTPUT_PATH = "../processed/processed_emergency.csv"
AGE_MAX = 120.0

def clean_text(s: str) -> str:
    s = str(s)
    s = s.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("?", "")
    return s

def main():
    df = pd.read_csv(INPUT_PATH)

    data = df[["Chief_complain", "KTAS_expert", "Age", "Sex"]].copy()
    data = data.dropna(subset=["Chief_complain", "KTAS_expert", "Age", "Sex"])

    data["Chief_complain"] = data["Chief_complain"].astype(str).str.strip()
    data = data[~data["Chief_complain"].str.match(r"^[\?\s]+$", na=False)]

    data["KTAS_expert"] = pd.to_numeric(data["KTAS_expert"], errors="coerce")
    data = data.dropna(subset=["KTAS_expert"])
    data = data[data["KTAS_expert"].between(1, 5)]

    data["age"] = pd.to_numeric(data["Age"], errors="coerce")
    data = data.dropna(subset=["age"])
    data = data[data["age"].between(0, AGE_MAX)]

    data["sex"] = pd.to_numeric(data["Sex"], errors="coerce")
    data = data.dropna(subset=["sex"])
    data = data[data["sex"].isin([1, 2])]
    data["sex"] = (data["sex"] == 2).astype(int)

    data["emergency_label"] = (data["KTAS_expert"] <= 3).astype(int)

    data["symptom"] = data["Chief_complain"].apply(clean_text)
    data = data[data["symptom"].str.len() >= 3]
    data = data[data["symptom"].str.strip().ne("")]

    data["age_norm"] = data["age"] / AGE_MAX

    out = data[["age_norm", "sex", "symptom", "emergency_label"]].reset_index(drop=True)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    out.to_csv(OUTPUT_PATH, index=False)

    print("Saved:", OUTPUT_PATH)
    print("Rows:", len(out))
    print(out["emergency_label"].value_counts())
    print(out[["age_norm", "sex"]].describe())
if __name__ == "__main__":
    main()