@echo off
chcp 65001 > nul
title 심재고 (心齋庫) 로컬 서버
echo ========================================================
echo   심재고 (心齋庫) 로컬 앱 런처
echo ========================================================
echo.

echo 브라우저 앱 화면 실행 준비 중...
start /B cmd /c "timeout /t 5 /nobreak > nul && (start msedge.exe --app=http://localhost:3000 --profile-directory=Default || start chrome.exe --app=http://localhost:3000 --profile-directory=Default)"

echo.
echo ========================================================
echo  ⚠️ 앱 사용 종료 안내
echo ========================================================
echo  이전과 달리 백그라운드에 프로세스를 숨기지 않습니다.
echo  앱 사용을 마치셨다면, 
echo  반드시 **이 검은색 콘솔 창의 'X' 버튼을 눌러 닫아주세요.**
echo  창을 닫는 즉시 이 앱이 실행한 Next.js 프로세스만 안전하게 종료됩니다.
echo ========================================================
echo.

echo Next.js 로컬 서버 시작... (포트 3000)
npm run dev
