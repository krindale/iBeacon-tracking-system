# 🩺 서버 자가 진단 가이드 (DIAGNOSTICS.md)

서버에 문제가 생겼을 때 직접 로그를 확인하고 조치하는 방법입니다.

## 1. 서버 로그 확인하기 (가장 중요)

문제가 발생하면 터미널을 열고 다음 명령어를 입력하여 무엇이 잘못되었는지 확인할 수 있습니다.

### 백엔드 (API) 로그 확인
이번 500 에러와 같은 서버 내부 오류를 확인할 때 사용합니다.
```bash
ssh -i ibeacon-key.pem ubuntu@15.165.169.154 "docker logs ibeacon-tracking-system-ibeacon-backend-1 --tail 50"
```

### 프론트엔드 (대시보드) 로그 확인
화면이 안 나오거나 웹사이트 접속이 안 될 때 사용합니다.
```bash
ssh -i ibeacon-key.pem ubuntu@15.165.169.154 "docker logs ibeacon-tracking-system-ibeacon-frontend-1 --tail 50"
```

---

## 2. 서비스 상태 확인하기

현재 서버에서 실행 중인 프로그램들이 모두 정상인지 확인합니다.
```bash
ssh -i ibeacon-key.pem ubuntu@15.165.169.154 "docker ps"
```
*   `STATUS` 열이 `Up ...`으로 되어 있으면 정상입니다.
*   `Exited (...)`로 되어 있으면 프로그램이 죽은 상태입니다.

---

## 3. 긴급 조치: 서버 재시작

알 수 없는 이유로 서버가 눈에 띄게 느려지거나 멈췄을 때 사용할 수 있는 방법입니다.
```bash
ssh -i ibeacon-key.pem ubuntu@15.165.169.154 "cd ~/iBeacon-tracking-system && sudo docker-compose restart"
```

---

## 4. 에러 메시지 읽는 팁
로그 결과에서 다음과 같은 키워드를 찾아보세요:
- **`Error`**: 오류의 핵심 내용 (예: `PrismaClientKnownRequestError`)
- **`Unique constraint failed`**: 중복된 정보를 저장하려고 할 때 발생 (오늘 발생한 문제)
- **`Connection refused`**: 데이터베이스나 다른 서비스와 연결이 끊겼을 때 발생
- **`500 Internal Server Error`**: 서버 내부 프로그램에서 예외 처리가 안 된 오류 발생

---

**도움이 필요하시면 언제든 로그 내용을 복사해서 저에게 전달해 주세요!**
