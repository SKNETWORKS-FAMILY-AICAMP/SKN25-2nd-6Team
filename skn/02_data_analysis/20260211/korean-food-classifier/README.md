# 🍲 한국 음식 이미지 분류기 (Korean Food Classifier)

VGG16 모델을 전이 학습(Fine-tuning)하여 한국 음식 이미지를 분류하는 프로젝트입니다. 
캐글(Kaggle)에서 모델 학습을 진행하였으며, Streamlit을 이용해 웹 인터페이스를 구현했습니다.

## 🛠 사용 기술
- **Language:** Python
- **Framework:** PyTorch, Streamlit
- **Model:** VGG16 (Pre-trained)
- **Data:** Kaggle Korean Food Dataset

## 📂 폴더 구조
- `training/`: 캐글 노트북 파일 (.ipynb) - 모델 학습 및 증강 과정
- `streamlit_app/`: 실시간 예측 웹 서비스 코드 및 모델 가중치
- `label.pkl`: 음식 카테고리 라벨

## 🚀 실행 방법
1. 필수 라이브러리 설치:
   ```bash
   pip install -r requirements.txt