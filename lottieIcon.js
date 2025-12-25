// 말풍선 팝업 상태 관리
let speechBubble = null;

// HTML 이스케이프 함수
function escapeHtml(text) {
  if (!text && text !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// 설정 화면 표시 함수
function showSettingsScreen(contentArea) {
  // 기존 내용 제거
  contentArea.innerHTML = '';
  
  // 설정 화면 컨테이너
  const settingsContainer = document.createElement('div');
  settingsContainer.style.cssText = `
    width: 100%;
    height: 100%;
  `;
  
  // 제목
  const title = document.createElement('h2');
  title.textContent = '설정';
  title.style.cssText = `
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 20px;
    color: #333;
  `;
  
  // 키 변경 섹션
  const keySection = document.createElement('div');
  keySection.style.cssText = `
    margin-bottom: 30px;
  `;
  
  const keyLabel = document.createElement('label');
  keyLabel.textContent = 'Shortcut';
  keyLabel.style.cssText = `
    display: block;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #555;
  `;
  
  // 키 선택 버튼 컨테이너
  const keyButtonContainer = document.createElement('div');
  keyButtonContainer.style.cssText = `
    display: flex;
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
  `;
  
  // 키 옵션 정의
  const keyOptions = [
    { value: 'meta', label: 'cmd(ctrl)' },
    { value: 'alt', label: 'option(alt)' },
    { value: 'meta+alt', label: 'cmd(ctrl) + option(alt)' }
  ];
  
  // 저장된 키 불러오기
  let selectedKeyValue = 'meta';
  chrome.storage.sync.get(['modifierKey'], function(result) {
    selectedKeyValue = result.modifierKey || 'meta';
    updateButtonStates();
  });
  
  // 버튼 상태 업데이트 함수
  function updateButtonStates() {
    keyOptions.forEach((option, index) => {
      const button = keyButtonContainer.children[index];
      if (button) {
        if (option.value === selectedKeyValue) {
          button.style.background = '#333';
          button.style.color = 'white';
          button.style.borderColor = '#333';
        } else {
          button.style.background = 'white';
          button.style.color = '#333';
          button.style.borderColor = '#ddd';
        }
      }
    });
  }
  
  // 각 키 옵션에 대한 버튼 생성
  keyOptions.forEach((option) => {
    const keyButton = document.createElement('button');
    keyButton.textContent = option.label;
    keyButton.style.cssText = `
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 11px;
      background: white;
      color: #333;
      cursor: pointer;
      box-sizing: border-box;
      text-align: center;
      transition: all 0.2s ease;
      font-weight: 500;
      white-space: nowrap;
    `;
    
    // 버튼 클릭 이벤트
    keyButton.addEventListener('click', function() {
      selectedKeyValue = option.value;
      
      // 저장
      chrome.storage.sync.set({ modifierKey: option.value }, function() {
        updateButtonStates();
        
        // 저장 성공 메시지
        const saveMsg = document.createElement('div');
        saveMsg.textContent = '저장되었습니다!';
        saveMsg.style.cssText = `
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: #4caf50;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000001;
        `;
        settingsContainer.appendChild(saveMsg);
        setTimeout(() => {
          saveMsg.remove();
        }, 2000);
      });
    });
    
    // 호버 효과
    keyButton.addEventListener('mouseenter', function() {
      if (option.value !== selectedKeyValue) {
        this.style.background = '#f5f5f5';
        this.style.borderColor = '#bbb';
      }
    });
    keyButton.addEventListener('mouseleave', function() {
      if (option.value !== selectedKeyValue) {
        this.style.background = 'white';
        this.style.borderColor = '#ddd';
      }
    });
    
    keyButtonContainer.appendChild(keyButton);
  });
  
  // 초기 버튼 상태 설정
  setTimeout(updateButtonStates, 100);
  
  keySection.appendChild(keyLabel);
  keySection.appendChild(keyButtonContainer);
  
  settingsContainer.appendChild(title);
  settingsContainer.appendChild(keySection);
  
  contentArea.appendChild(settingsContainer);
}

// 말풍선 팝업 생성 함수
function createSpeechBubble(iconElement) {
  // 기존 팝업이 있으면 제거
  if (speechBubble) {
    speechBubble.remove();
    speechBubble = null;
    return;
  }
  
  speechBubble = document.createElement('div');
  speechBubble.id = 'vopet-speech-bubble';
  speechBubble.style.cssText = `
    position: fixed;
    bottom: 150px;
    right: 10px;
    width: 360px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1000000;
    animation: slideUpFromDog 0.4s ease;
    overflow: visible;
  `;
  
  // 말풍선 뾰족한 부분 (강아지 머리 방향) - 직각삼각형
  const bubbleTail = document.createElement('div');
  bubbleTail.style.cssText = `
    position: absolute;
    bottom: -25px;
    right: 30px;
    width: 0;
    height: 0;
    border-top: 25px solid white;
    border-right: 25px solid transparent;
    border-left: 0;
    border-bottom: 0;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    z-index: 1000001;
  `;
  
  // 말풍선 내용 컨테이너
  const bubbleContent = document.createElement('div');
  bubbleContent.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: Arial, sans-serif;
  `;
  
  // 하단 아이콘 바
  const iconBar = document.createElement('div');
  iconBar.style.cssText = `
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    padding: 15px 0;
    border-top: 1px solid #e0e0e0;
    background: #f8f9fa;
  `;
  
  // 홈 아이콘
  const homeIcon = document.createElement('div');
  homeIcon.className = 'vopet-icon-btn';
  const homeImg = document.createElement('img');
  homeImg.src = chrome.runtime.getURL('resource/home.png');
  homeImg.alt = 'Home';
  homeImg.style.cssText = `
    width: 24px;
    height: 24px;
    object-fit: contain;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  `;
  homeImg.addEventListener('mouseenter', function() {
    this.style.opacity = '1';
  });
  homeImg.addEventListener('mouseleave', function() {
    this.style.opacity = '0.7';
  });
  homeIcon.appendChild(homeImg);
  
  // 설정 아이콘
  const settingsIcon = document.createElement('div');
  settingsIcon.className = 'vopet-icon-btn';
  const settingsImg = document.createElement('img');
  settingsImg.src = chrome.runtime.getURL('resource/settings.png');
  settingsImg.alt = 'Settings';
  settingsImg.style.cssText = `
    width: 24px;
    height: 24px;
    object-fit: contain;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  `;
  settingsImg.addEventListener('mouseenter', function() {
    this.style.opacity = '1';
  });
  settingsImg.addEventListener('mouseleave', function() {
    this.style.opacity = '0.7';
  });
  settingsIcon.appendChild(settingsImg);
  
  // 설정 아이콘 클릭 이벤트
  settingsIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    showSettingsScreen(contentArea);
  });
  
  // 메시지 아이콘
  const messageIcon = document.createElement('div');
  messageIcon.className = 'vopet-icon-btn';
  const messageImg = document.createElement('img');
  messageImg.src = chrome.runtime.getURL('resource/message.png');
  messageImg.alt = 'Message';
  messageImg.style.cssText = `
    width: 24px;
    height: 24px;
    object-fit: contain;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  `;
  messageImg.addEventListener('mouseenter', function() {
    this.style.opacity = '1';
  });
  messageImg.addEventListener('mouseleave', function() {
    this.style.opacity = '0.7';
  });
  messageIcon.appendChild(messageImg);
  
  iconBar.appendChild(homeIcon);
  iconBar.appendChild(messageIcon);
  iconBar.appendChild(settingsIcon);
  
  // 콘텐츠 영역 (빈 영역)
  const contentArea = document.createElement('div');
  contentArea.style.cssText = `
    flex: 1;
    padding: 20px;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
  `;
  
  bubbleContent.appendChild(contentArea);
  bubbleContent.appendChild(iconBar);
  
  speechBubble.appendChild(bubbleTail);
  speechBubble.appendChild(bubbleContent);
  
  // 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    font-size: 24px;
    cursor: pointer;
    color: #999;
    line-height: 1;
    padding: 0;
  `;
  closeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    speechBubble.remove();
    speechBubble = null;
  });
  speechBubble.appendChild(closeBtn);
  
  // CSS 애니메이션 추가
  if (!document.getElementById('vopet-bubble-animation-style')) {
    const style = document.createElement('style');
    style.id = 'vopet-bubble-animation-style';
    style.textContent = `
      @keyframes slideUpFromDog {
        from {
          opacity: 0;
          transform: translateY(50px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(speechBubble);
  
  // 팝업 외부 클릭 시 닫기
  setTimeout(() => {
    document.addEventListener('click', function closeBubble(e) {
      if (speechBubble && !speechBubble.contains(e.target) && !iconElement.contains(e.target)) {
        speechBubble.remove();
        speechBubble = null;
        document.removeEventListener('click', closeBubble);
      }
    });
  }, 100);
}

// 우측 하단에 Lottie 애니메이션 아이콘 추가 (계속 표시)
function createLottieIcon() {
  // 외부 컨테이너 (애니메이션 표시용)
  const bottomRightIcon = document.createElement('div');
  bottomRightIcon.id = 'vopet-bottom-right-icon';
  bottomRightIcon.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 180px;
    height: 180px;
    z-index: 999999;
    pointer-events: none;
  `;
  
  // Lottie 애니메이션 컨테이너 (전체 크기로 표시)
  const lottieContainer = document.createElement('div');
  lottieContainer.style.cssText = `
    width: 180px;
    height: 180px;
    pointer-events: none;
  `;
  
  // 클릭 가능한 영역 (강아지 크기에 맞게 축소, 오버레이)
  const clickableArea = document.createElement('div');
  clickableArea.id = 'vopet-clickable-area';
  clickableArea.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    cursor: pointer;
    pointer-events: auto;
    z-index: 1;
  `;
  
  // 클릭 이벤트 - 말풍선 팝업 토글
  clickableArea.addEventListener('click', function(e) {
    e.stopPropagation();
    createSpeechBubble(bottomRightIcon);
  });
  
  bottomRightIcon.appendChild(lottieContainer);
  bottomRightIcon.appendChild(clickableArea);
  document.body.appendChild(bottomRightIcon);
  
  // Lottie 애니메이션 로드
  const animationPath = chrome.runtime.getURL('resource/dog_lottie.json');
  lottie.loadAnimation({
    container: lottieContainer,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: animationPath
  });
}

// Lottie 애니메이션 초기화 (lottie-web이 manifest.json에서 로드됨)
if (typeof lottie !== 'undefined') {
  createLottieIcon();
} else {
  // lottie-web이 아직 로드되지 않은 경우 약간의 지연 후 재시도
  setTimeout(() => {
    if (typeof lottie !== 'undefined') {
      createLottieIcon();
    }
  }, 100);
}

