"""CNN 비전 모델 서비스.

EfficientNet-B0 기반:
- 피부질환 분류 (6클래스)
- 안구질환 분류 (11클래스)

모델 파일 위치: backend/models/
  - efficientnet_b0_pet_skin.pth   (피부, 6클래스)
  - efficientnet_b0_eye_10epoch.pth (안구, 11클래스)
"""
import io
import logging
import os

import torch
from PIL import Image
import torchvision.transforms as transforms
import timm

logger = logging.getLogger(__name__)

SKIN_CLASSES = ["allergy", "dermatitis", "fungal", "healthy", "mange", "ringworm"]

SKIN_CLASS_KO = {
    "allergy":    "알레르기성 피부염",
    "dermatitis": "피부염",
    "fungal":     "진균 감염",
    "healthy":    "정상 피부",
    "mange":      "개선충증(옴)",
    "ringworm":   "백선(링웜)",
}

EYE_CLASSES = [
    "결막염",          # 0
    "궤양성각막질환",   # 1
    "백내장",          # 2
    "비궤양성각막질환", # 3
    "색소침착성각막염", # 4
    "안검내반증",       # 5
    "안검염",          # 6
    "안검종양",        # 7
    "유루증",          # 8
    "핵경화",          # 9
    "정상",            # 10
]
EYE_NORMAL_CLASS = "정상"


def _models_dir() -> str:
    # /app/ai/services/vision_model.py → /app/backend/models/
    current = os.path.dirname(os.path.abspath(__file__))  # /app/ai/services
    app_dir = os.path.dirname(os.path.dirname(current))   # /app
    return os.path.join(app_dir, "backend", "models")


class VisionModelService:
    def __init__(self):
        self.skin_model = None
        self.eye_model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.skin_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        self.eye_transform = transforms.Compose([
            transforms.Resize((300, 300)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def _load_skin_model(self):
        if self.skin_model is None:
            try:
                self.skin_model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=6)
                path = os.path.join(_models_dir(), "efficientnet_b0_pet_skin.pth")
                state_dict = torch.load(path, map_location=self.device)
                self.skin_model.load_state_dict(state_dict)
                self.skin_model.to(self.device)
                self.skin_model.eval()
                logger.info(f"[Vision/Skin] 모델 로드 성공: {path}")
            except Exception as e:
                logger.error(f"[Vision/Skin] 모델 로드 실패: {e}")
                self.skin_model = None
        return self.skin_model

    def _load_eye_model(self):
        if self.eye_model is None:
            try:
                self.eye_model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=11)
                path = os.path.join(_models_dir(), "efficientnet_b0_eye_10epoch.pth")
                state_dict = torch.load(path, map_location=self.device)
                self.eye_model.load_state_dict(state_dict)
                self.eye_model.to(self.device)
                self.eye_model.eval()
                logger.info(f"[Vision/Eye] 모델 로드 성공: {path}")
            except Exception as e:
                logger.error(f"[Vision/Eye] 모델 로드 실패: {e}")
                self.eye_model = None
        return self.eye_model

    def _topk(self, logits, classes: list[str], k: int = 3):
        probs = torch.nn.functional.softmax(logits, dim=0)
        top_probs, top_ids = torch.topk(probs, k)
        details = []
        for i in range(k):
            idx = top_ids[i].item()
            prob = top_probs[i].item() * 100
            name = classes[idx] if idx < len(classes) else f"unknown({idx})"
            details.append(f"{name} ({prob:.1f}%)")
        top_idx = top_ids[0].item()
        top_prob = top_probs[0].item() * 100
        top_name = classes[top_idx] if top_idx < len(classes) else "unknown"
        return top_name, top_prob, details

    def analyze_skin(self, image_bytes: bytes) -> dict:
        model = self._load_skin_model()
        if model is None:
            return {"error": "피부 모델을 불러오지 못했습니다."}
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            tensor = self.skin_transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                top_name, top_prob, details = self._topk(model(tensor)[0], SKIN_CLASSES)
            top_ko = SKIN_CLASS_KO.get(top_name, top_name)
            if top_prob >= 70.0:
                prediction_text = f"정상 피부 ({top_prob:.1f}%)" if top_name == "healthy" else f"{top_ko} 의심 ({top_prob:.1f}%)"
            else:
                prediction_text = f"판단 보류 (최고 {top_prob:.1f}% — 기준 70% 미달)"
            return {"top_1": prediction_text, "top_class": top_name, "top_confidence": top_prob, "details": details}
        except Exception as e:
            logger.error(f"[Vision/Skin] 분석 실패: {e}")
            return {"error": "피부 이미지 분석 중 오류가 발생했습니다."}

    def analyze_eye(self, image_bytes: bytes) -> dict:
        model = self._load_eye_model()
        if model is None:
            return {"error": "안구 모델을 불러오지 못했습니다."}
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            tensor = self.eye_transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                top_name, top_prob, details = self._topk(model(tensor)[0], EYE_CLASSES)
            if top_prob >= 70.0:
                prediction_text = f"정상 안구 ({top_prob:.1f}%)" if top_name == EYE_NORMAL_CLASS else f"{top_name} 의심 ({top_prob:.1f}%)"
            else:
                prediction_text = f"판단 보류 (최고 {top_prob:.1f}% — 기준 70% 미달)"
            return {"top_1": prediction_text, "top_class": top_name, "top_confidence": top_prob, "details": details}
        except Exception as e:
            logger.error(f"[Vision/Eye] 분석 실패: {e}")
            return {"error": "안구 이미지 분석 중 오류가 발생했습니다."}


vision_service = VisionModelService()
