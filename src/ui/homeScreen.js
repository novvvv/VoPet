// 홈 화면 표시 함수
function showHomeScreen(contentArea) {
  // 기존 내용 제거
  contentArea.innerHTML = '';
  
  // 홈 화면 컨테이너
  const homeContainer = document.createElement('div');
  homeContainer.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
    gap: 20px;
  `;
  
  // Vopet Ver 1.0 텍스트
  const versionText = document.createElement('div');
  versionText.textContent = 'Vopet Ver 1.0';
  versionText.style.cssText = `
    font-size: 24px;
    font-weight: bold;
    color: #1C1C1B;
    text-align: center;
  `;
  
  // Updated 날짜 텍스트
  const updatedText = document.createElement('div');
  updatedText.textContent = 'updated 2025.12.26';
  updatedText.style.cssText = `
    font-size: 12px;
    color: #999;
    text-align: center;
  `;
  
  // Usage Guide 텍스트
  const helloText = document.createElement('div');
  helloText.textContent = 'Usage Guide \n cmd(ctrl) 키를 누른 상태에서 웹 사이트에서 단어를 드래그 해보세요!';
  helloText.style.cssText = `
    font-size: 16px;
    font-weight: bold;
    color: #1C1C1B;
    text-align: center;
    line-height: 1.5;
  `;
  
  homeContainer.appendChild(versionText);
  homeContainer.appendChild(updatedText);
  homeContainer.appendChild(helloText);
  contentArea.appendChild(homeContainer);
}

// 전역 스코프에 명시적으로 할당 (Chrome Extension 호환성)
if (typeof window !== 'undefined') {
  window.showHomeScreen = showHomeScreen;
}

