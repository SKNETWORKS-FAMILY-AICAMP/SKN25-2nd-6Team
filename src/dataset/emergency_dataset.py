import pandas as pd
import torch
from torch.utils.data import Dataset

class EmergencyDataset(Dataset):

    def __init__(self, df: pd.DataFrame, tokenizer, token_max_len: int):
        self.df = df.reset_index(drop=True)
        self.tokenizer = tokenizer
        self.token_max_len = token_max_len

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]

        text = str(row["symptom"])
        enc = self.tokenizer(
            text,
            padding="max_length",
            truncation=True,
            max_length=self.token_max_len,
            return_tensors="pt",
        )

        tab = torch.tensor([row["age_norm"], row["sex"]], dtype=torch.float)
        label = torch.tensor(int(row["emergency_label"]), dtype=torch.long)
        return {
            "input_ids": enc["input_ids"].squeeze(0),
            "attention_mask": enc["attention_mask"].squeeze(0),
            "tabular": tab,
            "labels": label,
        }

