# train.py
import os
import random
import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from transformers import AutoTokenizer, get_linear_schedule_with_warmup
from sklearn.model_selection import train_test_split

from models.bert_with_tabular import BertWithTabular
from src.dataset.emergency_dataset import EmergencyDataset
from src.emergency_visualize import plot_train_history

# -----------------------
# Config
# -----------------------
DATA_PATH = "../processed/processed_emergency.csv"
MODEL_NAME = "bert-base-uncased"
TOKEN_MAX_LEN = 64
BATCH_SIZE = 16
LEARNING_RATE = 2e-5
EPOCHS = 3
WEIGHT_DECAY = 0.01
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def seed_all(seed=24):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

seed_all()

# -----------------------
# Train / Eval
# -----------------------
def train_one_epoch(model, loader, optimizer, scheduler):
    model.train()
    total_loss, total, correct = 0.0, 0, 0

    for batch in loader:
        input_ids = batch["input_ids"].to(DEVICE)
        attention_mask = batch["attention_mask"].to(DEVICE)
        tabular = batch["tabular"].to(DEVICE)
        labels = batch["labels"].to(DEVICE)

        optimizer.zero_grad(set_to_none=True)
        loss, logits = model(input_ids, attention_mask, tabular, labels)

        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()

        total_loss += loss.item() * labels.size(0)
        preds = torch.argmax(logits, dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return total_loss / max(total, 1), correct / max(total, 1)

@torch.no_grad()
def evaluate(model, loader):
    model.eval()
    total_loss, total, correct = 0.0, 0, 0

    for batch in loader:
        input_ids = batch["input_ids"].to(DEVICE)
        attention_mask = batch["attention_mask"].to(DEVICE)
        tabular = batch["tabular"].to(DEVICE)
        labels = batch["labels"].to(DEVICE)

        loss, logits = model(input_ids, attention_mask, tabular, labels)

        total_loss += loss.item() * labels.size(0)
        preds = torch.argmax(logits, dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return total_loss / max(total, 1), correct / max(total, 1)

# -----------------------
# Main
# -----------------------
def main():
    df = pd.read_csv(DATA_PATH)

    # dtype 안전화
    df["age_norm"] = pd.to_numeric(df["age_norm"], errors="coerce")
    df["sex"] = pd.to_numeric(df["sex"], errors="coerce")
    df["emergency_label"] = pd.to_numeric(df["emergency_label"], errors="coerce")
    df = df.dropna(subset=["age_norm", "sex", "symptom", "emergency_label"])

    train_df, val_df = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df["emergency_label"].astype(int),
    )

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    train_ds = EmergencyDataset(train_df, tokenizer, TOKEN_MAX_LEN)
    val_ds = EmergencyDataset(val_df, tokenizer, TOKEN_MAX_LEN)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)

    model = BertWithTabular(model_name=MODEL_NAME, tab_dim=2, num_labels=2).to(DEVICE)

    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)

    total_steps = len(train_loader) * EPOCHS
    warmup_steps = int(total_steps * 0.1)
    scheduler = get_linear_schedule_with_warmup(
        optimizer, num_warmup_steps=warmup_steps, num_training_steps=total_steps
    )

    os.makedirs("./checkpoints", exist_ok=True)
    best_val_acc = 0.0
    loss_hist_train, loss_hist_valid = [], []
    acc_hist_train, acc_hist_valid = [], []

    for epoch in range(1, EPOCHS + 1):
        tr_loss, tr_acc = train_one_epoch(model, train_loader, optimizer, scheduler)
        va_loss, va_acc = evaluate(model, val_loader)

        loss_hist_train.append(tr_loss)
        loss_hist_valid.append(va_loss)
        acc_hist_train.append(tr_acc)
        acc_hist_valid.append(va_acc)

        print(
            f"[{epoch}/{EPOCHS}] "
            f"train loss={tr_loss:.4f} acc={tr_acc:.4f} | "
            f"val loss={va_loss:.4f} acc={va_acc:.4f}"
        )

        if va_acc > best_val_acc:
            best_val_acc = va_acc
            torch.save(model.state_dict(), "./checkpoints/best.pt")
            print("Saved best checkpoint: ./checkpoints/best.pt")

    print("Best val acc:", best_val_acc)

    plot_train_history(
        train_losses=loss_hist_train,
        val_losses=loss_hist_valid,
        train_accs=acc_hist_train,
        val_accs=acc_hist_valid,
        out_path="./checkpoints/train_curves.png",
        show=True,
    )

if __name__ == "__main__":
    main()