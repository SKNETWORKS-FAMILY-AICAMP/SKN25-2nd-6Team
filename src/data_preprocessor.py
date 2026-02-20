import pandas as pd

def preprocess_data(input_file='KaggleV2-May-2016.csv'):
    """
    의료 예약 데이터를 전처리 및 3개 테이블로 분할
    input_file (str): 입력 CSV 파일 경로
    Returns:
        tuple: (neighbourhood_df, patients_df, appointment_df)
    """

    df = pd.read_csv(input_file)
    
    # 이상 데이터 제거
    invalid_appt_ids = [5642903, 5642503, 5642549, 5642828, 5642494]
    invalid_neighbourhoods = ['PARQUE INDUSTRIAL']
    
    df = df[~df['AppointmentID'].isin(invalid_appt_ids)]
    df = df[~df['Neighbourhood'].isin(invalid_neighbourhoods)]
    
    df['ScheduledDay'] = pd.to_datetime(df['ScheduledDay'])
    df['AppointmentDay'] = pd.to_datetime(df['AppointmentDay'])
    
    # scheduled_time과 lead_time_days 계산
    df['scheduled_time'] = df['ScheduledDay'].dt.strftime('%H:%M')
    df['lead_time_days'] = (df['AppointmentDay'].dt.date - df['ScheduledDay'].dt.date).apply(lambda x: x.days)
    
    # No-show (Yes=0, No=1)
    df['is_noshow'] = df['No-show'].map({'Yes': 0, 'No': 1})
    
    # 2. Neighbourhood Table
    neighbourhood_stats = df.groupby('Neighbourhood').agg(
        total_appts=('AppointmentID', 'count'),
        noshow_count=('is_noshow', 'sum'),
        avg_lead_time=('lead_time_days', 'mean')
    ).reset_index()
    
    neighbourhood_stats['noshow_rate'] = neighbourhood_stats['noshow_count'] / neighbourhood_stats['total_appts']
    neighbourhood_stats['nhood_id'] = range(1, len(neighbourhood_stats) + 1)
    
    neighbourhood_df = neighbourhood_stats[['nhood_id', 'Neighbourhood', 'total_appts', 'noshow_rate', 'avg_lead_time']]
    neighbourhood_df.columns = ['nhood_id', 'nhood_name', 'total_appts', 'noshow_rate', 'avg_lead_time']
    
    # neighbourhood_id mapping
    nhood_mapping = dict(zip(neighbourhood_df['nhood_name'], neighbourhood_df['nhood_id']))
    df['nhood_id'] = df['Neighbourhood'].map(nhood_mapping)
    
    # 3. Patients Table
    patients_stats = df.groupby('PatientId').agg(
        gender=('Gender', 'first'),
        age=('Age', 'first'),
        has_hypertension=('Hipertension', 'first'),  # 원본 컬럼명 오타 변경
        has_diabetes=('Diabetes', 'first'),
        has_alcoholism=('Alcoholism', 'first'),
        has_handicap=('Handcap', 'first'),
        scholarship=('Scholarship', 'first'),
        noshow_cnt=('is_noshow', 'sum'),
        total_visits=('AppointmentID', 'count'),
        last_visit_date=('AppointmentDay', 'max'),
        first_visit_date=('AppointmentDay', 'min')
    ).reset_index()
    
    patients_stats['noshow_rate'] = patients_stats['noshow_cnt'] / patients_stats['total_visits']
    
    patients_df = patients_stats[['PatientId', 'gender', 'age', 'has_hypertension', 'has_diabetes', 
                                  'has_alcoholism', 'has_handicap', 'scholarship', 'noshow_cnt', 
                                  'noshow_rate', 'last_visit_date', 'first_visit_date']]
    patients_df.columns = ['patient_id', 'gender', 'age', 'has_hypertension', 'has_diabetes', 
                           'has_alcoholism', 'has_handicap', 'scholarship', 'noshow_cnt', 
                           'noshow_rate', 'last_visit_date', 'first_visit_date']
    
    # 4. Appointment Table
    appointment_df = df[['AppointmentID', 'PatientId', 'nhood_id', 'ScheduledDay', 
                         'AppointmentDay', 'scheduled_time', 'is_noshow', 'SMS_received', 'lead_time_days']].copy()
    
    appointment_df.columns = ['appt_id', 'patient_id', 'nhood_id', 'scheduled_at', 
                              'appt_date', 'scheduled_time', 'is_noshow', 'sms_received', 'lead_time_days']
    
    return neighbourhood_df, patients_df, appointment_df


def save_tables_to_csv(neighbourhood_df, patients_df, appointment_df, output_dir='./'):
    """    
    neighbourhood_df: Neighbourhood table
    patients_df: Patients table
    appointment_df: Appointment table
    output_dir: Output directory
    """
    
    neighbourhood_df.to_csv(f'{output_dir}Neighbourhood.csv', index=False)
    patients_df.to_csv(f'{output_dir}Patients.csv', index=False)
    appointment_df.to_csv(f'{output_dir}Appointment.csv', index=False)
    
    print(f"Neighbourhood.csv: {len(neighbourhood_df)} rows")
    print(f"Patients.csv: {len(patients_df)} rows") 
    print(f"Appointment.csv: {len(appointment_df)} rows")


def check_data_consistency(df):
    """
    환자별 Handicap 값의 일관성 검사
    """
    p_handcap_check = df.groupby('PatientId')['Handcap'].nunique()
    inconsistent = p_handcap_check[p_handcap_check > 1]
    
    print(f"Handicap 값 변화가 있는 환자 수: {len(inconsistent)}")
    
    if len(inconsistent) > 0:
        print("일부 환자들의 Handicap 값 변화:")
        for patient_id in inconsistent.head(3).index:
            patient_data = df[df['PatientId'] == patient_id][['PatientId', 'AppointmentID', 'Handcap']]
            print(f"환자 {patient_id}:")
            print(patient_data.to_string(index=False))
            print()
    else:
        print("모든 환자의 Handicap 값이 일관적이다.")


def main():    
    try:
        neighbourhood_df, patients_df, appointment_df = preprocess_data()
        
        save_tables_to_csv(neighbourhood_df, patients_df, appointment_df)
        
        df = pd.read_csv('KaggleV2-May-2016.csv')
        check_data_consistency(df)
        
    except FileNotFoundError:
        print("ERROR: 파일이 없습니다.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    main()