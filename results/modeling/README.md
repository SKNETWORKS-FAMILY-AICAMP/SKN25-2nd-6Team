# 모델 학습 결과 요약

## 1. 데이터 분할 전략

예약/내원 데이터의 시간 흐름을 고려해 랜덤 분할 대신 **시간 순 기반 분할(Time-based split, 70:15:15)** 을 적용하였다. </br>
Train → Validation → Test 순서로 구성해 시간 누수(leakage)를 최소화했다.

</br>

## 2. 평가 지표

No-Show 예측은 클래스 불균형 가능성이 높고, 운영 관점에서 양성 클래스(No-Show)를 놓치지 않는 것이 중요하므로 단일 지표(Accuracy)만으로는 평가가 부족하다. </br>
따라서 다음 지표를 중심으로 평가하였다. 

- **ROC-AUC**: 전반적인 분류 성능 (임계값에 덜 민감하여 모델 간 전반 성능 비교에 적합)
- **PR-AUC**: 정밀도-재현율 균형 -> 불균형 데이터에서 양성 탐지 성능에 민감
- **Precision / Recall / F1** (양성 클래스=1 기준): 운영 목표의 trade-off 확인
- **Threshold 최적화**: 고정값(0.5) 대신 Validation에서 F1이 최대가 되는 threshold를 선택해 Test에 적용 (`best_thr_valid_f1`)

</br>

## 3. 사용 피처 

| 카테고리 | 피처 |
|---|---|
| 예약 정보 | `scheduled_time`, `lead_time_days`, `sms_received` |
| 환자 정보 | `gender`, `has_hypertension`, `has_diabetes`, `has_alcoholism`, `has_handicap`, `scholarship` |
| 날짜/시간 | `month`, `is_weekend`, `is_holiday`, `is_before_holiday`, `is_after_holiday` |
| 날씨 | `max_temp`, `min_temp`, `precip_mm`, `weather`, `temp_range`, `is_rainy` |
| 지역 | `nhood_freq` (neighborhood 방문 빈도 인코딩) |

> LightGBM은 sklearn Pipeline 내 ColumnTransformer를 통해 범주형 피처에 OneHotEncoding을 적용하였으며, 최종 입력 차원은 **873**이다.  
> Logistic Regression 또한 동일한 전처리 파이프라인을 사용하며 최종 입력 차원은 **106**이다.

</br>


## 4. 모델별 성능 비교 (Time split 70/15/15)

| Model | Valid ROC-AUC | Valid PR-AUC | Test ROC-AUC | Test PR-AUC | Best Thr | Test Precision(1) | Test Recall(1) | Test F1(1) |
|---|---|---|---|---|---|---|---|---|
| Logistic Regression | 0.6305 | 0.2615 | 0.6712 | 0.2787 | 0.2128 | 0.2609 | 0.7439 | 0.3863 |
| LightGBM | 0.6856 | 0.2900 | 0.7013 | 0.2874 | 0.2295 | 0.2580 | 0.8689 | 0.3979 |
| XGBoost | 0.7250 | 0.3456 | 0.7266 | 0.3209 | 0.4449 | 0.2791 | 0.7908 | 0.4126 |
| CatBoost | 0.7319 | 0.3492 | 0.7358 | 0.3308 | 0.5099 | 0.2936 | 0.7550 | 0.4229 |

</br>


## 5. 모델 해석

- **Logistic Regression** : ROC-AUC 0.671 / PR-AUC 0.279로 가장 낮은 성능. </br>
  threshold를 0.2128로 낮춰 Recall(1)=0.744를 확보했으나, Precision(1)=0.261로 오탐 부담이 크다. </br>
  
- **LightGBM** : ROC-AUC 0.701 / PR-AUC 0.287로 Logistic Regression 대비 향상. </br>
  Recall(1)=0.869로 전 모델 중 가장 높은 양성 탐지율을 기록했으나, Precision(1)=0.258로 낮아 오탐이 많다.
  
- **XGBoost** : ROC-AUC 0.727 / PR-AUC 0.321로 상위권 성능. </br>
  scale_pos_weight=3.786으로 클래스 불균형을 직접 보정하였으며, Recall(1)=0.791 / F1(1)=0.413으로 LightGBM 대비 균형 잡힌 성능을 보인다.
  
- **CatBoost** : ROC-AUC 0.736 / PR-AUC 0.331로 전 모델 중 가장 높은 성능. </br>
  auto_class_weights=Balanced로 불균형을 자동 처리하였으며, F1(1)=0.423으로 Precision과 Recall의 균형도 가장 우수하다.

</br>

## 6. 최종 모델 선정 기준

### 6.1 선정 기준 (우선순위)

| 순위 | 지표 | 이유 |
|---|---|---|
| 1순위 | **Test PR-AUC** | 불균형 상황에서 양성 탐지 성능을 가장 직접적으로 반영 |
| 2순위 | **Test Recall(1)** | No-Show를 놓치는 것이 운영상 가장 큰 비용 |
| 3순위 | ROC-AUC, Precision, F1 | 오탐 부담 및 전반 성능 점검용 보조 지표 |

</br>

### 6.2 최종 선정 모델: **CatBoost**

| 지표 | 값 |
|---|---|
| Test ROC-AUC | **0.7358** (전체 1위) |
| Test PR-AUC | **0.3308** (전체 1위) |
| Test Recall(1) | 0.7550 |
| Test Precision(1) | 0.2936 |
| Test F1(1) | **0.4229** (전체 1위) |
| Best Threshold | 0.5099 |

**선정 이유:**
- PR-AUC, ROC-AUC, F1 모두 전체 모델 중 최고 성능
- `auto_class_weights=Balanced`로 클래스 불균형을 자동 처리하여 별도의 수동 보정 없이도 안정적인 성능 달성
- threshold가 0.51로 기본값(0.5)에 가깝다는 것은 모델이 이미 충분히 보정된 확률 출력을 제공함을 의미
- Recall과 Precision의 균형이 4개 모델 중 가장 우수하여 오탐 부담을 최소화하면서도 No-Show를 효과적으로 탐지



