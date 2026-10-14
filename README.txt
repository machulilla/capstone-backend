1. 받은 코드 압축을 풀고, 인텔리제이(또는 VSCode) 터미널을 열어주세요.

2. 터미널에 npm install 을 입력하여 필요한 라이브러리들을 설치해주세요.

3. 프로젝트 최상단 폴더에 .env 파일을 만들어서 API 키와 포트 번호를 넣어주세요. (예: GEMINI_API_KEY=AIzawn..., PORT=3000)

4. 터미널에 npm run dev 를 입력하여 서버를 켜주세요.

5. 서버가 켜졌다면 터미널을 하나 더 띄워 curl.exe -X POST http://127.0.0.1:3000/api/analyze-paper -H "Content-Type: application/json" --data-binary "@test.json" 를 입력해주세요.
