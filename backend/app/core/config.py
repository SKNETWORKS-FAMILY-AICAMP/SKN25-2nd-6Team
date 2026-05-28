from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    # AWS S3
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "ap-northeast-2"
    S3_BUCKET_NAME: str
    CLOUDFRONT_URL: Optional[str] = ""

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o-mini"

    # 서버 설정
    DEBUG: bool = True
    # 콤마 구분 origins 문자열. docker-compose.yml 또는 .env에서 오버라이드 가능.
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://localhost:5174,"
        "http://127.0.0.1:5173,"
        "http://192.168.0.2:5173,http://192.168.0.32:5173,"
        "http://192.168.0.11:5173,http://192.168.0.2:5174"
    )

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()