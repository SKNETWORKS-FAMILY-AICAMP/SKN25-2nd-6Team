from __future__ import annotations

from typing import Sequence, Optional
import matplotlib.pyplot as plt


def plot_train_history(
    train_losses: Sequence[float],
    val_losses: Sequence[float],
    train_accs: Sequence[float],
    val_accs: Sequence[float],
    *,
    title_prefix: str = "",
    acc_in_percent: bool = True,
    out_path: Optional[str] = None,
    show: bool = True,
) -> None:
    n = len(train_losses)
    if not (len(val_losses) == len(train_accs) == len(val_accs) == n):
        raise ValueError(
            "All history arrays must have the same length: "
            f"train_losses={len(train_losses)}, val_losses={len(val_losses)}, "
            f"train_accs={len(train_accs)}, val_accs={len(val_accs)}"
        )
    if n == 0:
        raise ValueError("History arrays are empty. Nothing to plot.")

    epochs_range = range(1, n + 1)

    # accuracy scaling
    if acc_in_percent:
        train_acc_plot = [a * 100.0 for a in train_accs]
        val_acc_plot = [a * 100.0 for a in val_accs]
        acc_ylabel = "Accuracy (%)"
    else:
        train_acc_plot = list(train_accs)
        val_acc_plot = list(val_accs)
        acc_ylabel = "Accuracy"

    plt.figure(figsize=(12, 4))

    # --- Loss ---
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, train_losses, label="Train Loss", marker="o")
    plt.plot(epochs_range, val_losses, label="Valid Loss", marker="s")
    plt.title(f"{title_prefix}Training and Validation Loss".strip())
    plt.xlabel("Epochs")
    plt.ylabel("Loss")
    plt.grid(True)
    plt.legend()

    # --- Accuracy ---
    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, train_acc_plot, label="Train Accuracy", marker="o")
    plt.plot(epochs_range, val_acc_plot, label="Valid Accuracy", marker="s")
    plt.title(f"{title_prefix}Training and Validation Accuracy".strip())
    plt.xlabel("Epochs")
    plt.ylabel(acc_ylabel)
    plt.grid(True)
    plt.legend()

    plt.tight_layout()

    if out_path:
        plt.savefig(out_path, dpi=150, bbox_inches="tight")

    if show:
        plt.show()
    else:
        plt.close()