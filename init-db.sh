#!/bin/bash
# ============================================
# PostgreSQL Multi-Database Initialization
# ============================================
# 이 스크립트는 PostgreSQL 컨테이너가 처음 시작될 때 실행됩니다.
# 새 프로젝트 추가 시 여기에 CREATE DATABASE 추가

set -e

# ibeacon_db는 POSTGRES_DB 환경변수로 자동 생성됨

# 추가 데이터베이스 생성 (필요시 주석 해제)
# psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
#     CREATE DATABASE project2_db;
#     CREATE DATABASE project3_db;
# EOSQL

echo "Database initialization complete!"
