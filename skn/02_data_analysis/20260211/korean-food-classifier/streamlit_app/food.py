import streamlit as st
import torch
import torch.nn as nn
from torchvision import models, transforms
from torchvision.models import VGG16_Weights
from PIL import Image
import pickle

device = torch.device("cpu")

with open("./label.pkl", "rb") as f:
    data = pickle.load(f)

CLASS_NAMES = data["label"]
NUM_CLASSES = len(CLASS_NAMES)


class VGG16TransferLearning(nn.Module):
    def __init__(self, num_classes: int, mode: str = "fine_tuning"):
        super().__init__()
        self.backbone = models.vgg16(weights=VGG16_Weights.IMAGENET1K_V1)

        if mode == "feature_extraction":
            for p in self.backbone.features.parameters():
                p.requires_grad = False
        elif mode == "fine_tuning":
            freeze_until = 21 
            for idx, param in enumerate(self.backbone.features.parameters()):
                if idx < freeze_until:
                    param.requires_grad = False
                else:
                    param.requires_grad = True
                    print(f"Fine-tuning enabled at layer index: {idx}")

        in_features = self.backbone.classifier[6].in_features
        self.backbone.classifier[6] = nn.Linear(in_features, num_classes)

    def forward(self, x):
        return self.backbone(x)


def process_image(image: Image.Image):
    tf = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225]),
    ])
    return tf(image).unsqueeze(0)  # (1,3,224,224)

model = VGG16TransferLearning(num_classes=NUM_CLASSES, mode="fine_tuning")
state = torch.load("./best_food_vgg16_ft.pth", map_location=device)
model.load_state_dict(state)
model.to(device)
model.eval()


st.title("한국 음식 분류 서비스")
st.write("사진을 업로드하면 6가지 음식 중 하나로 분류합니다.")

upload_file = st.file_uploader("음식 사진 선택", type=["jpg", "jpeg", "png", "webp"])

if upload_file is not None:
    image = Image.open(upload_file).convert("RGB")
    st.image(image, caption="업로드 이미지", use_container_width=True)

    if st.button("분류하기"):
        with st.spinner("분석중..."):
            x = process_image(image).to(device)

            with torch.no_grad():
                logits = model(x)[0]  # (num_classes,)
                probs = torch.softmax(logits, dim=0)

            top_prob, top_idx = torch.max(probs, dim=0)
            pred_name = CLASS_NAMES[int(top_idx)]
            st.success("분석 완료!")

            st.markdown(f"### 예측 결과: **{pred_name}**")
            st.markdown(f"- 확률: **{float(top_prob)*100:.2f}%**")

            # (선택) Top-3도 보여주기
            topk = min(3, NUM_CLASSES)
            vals, idxs = torch.topk(probs, topk)
            st.write("#### Top-3")
            for v, i in zip(vals, idxs):
                st.write(f"- {CLASS_NAMES[int(i)]}: {float(v)*100:.2f}%")
