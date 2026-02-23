import torch
import torch.nn as nn
from transformers import AutoModel


class BertWithTabular(nn.Module):

    def __init__(self, model_name: str, tab_dim: int = 2, num_labels: int = 2):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)

        hidden = self.bert.config.hidden_size
        self.tab_mlp = nn.Sequential(
            nn.Linear(tab_dim, 16),
            nn.ReLU(),
            nn.Dropout(0.1),
        )

        self.classifier = nn.Sequential(
            nn.Linear(hidden + 16, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, num_labels),
        )

        self.loss_fn = nn.CrossEntropyLoss()

    def forward(self, input_ids, attention_mask, tabular, labels=None):
        out = self.bert(input_ids=input_ids, attention_mask=attention_mask)

        # Some models don't provide pooler_output; fallback to CLS token embedding.
        if hasattr(out, "pooler_output") and out.pooler_output is not None:
            text_feat = out.pooler_output
        else:
            text_feat = out.last_hidden_state[:, 0]  # CLS: [B, hidden]

        tab_feat = self.tab_mlp(tabular)             # [B, 16]
        x = torch.cat([text_feat, tab_feat], dim=1)  # [B, hidden+16]
        logits = self.classifier(x)                  # [B, num_labels]

        loss = None
        if labels is not None:
            loss = self.loss_fn(logits, labels)

        return loss, logits