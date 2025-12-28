// 팝업 스크립트
document.addEventListener('DOMContentLoaded', function() {
  const languageSelect = document.getElementById('language');
  const apiKeyInput = document.getElementById('apiKey');
  const statusDiv = document.getElementById('status');
  
  const translatorServiceSelect = document.getElementById('translatorService');
  
  // 저장된 설정 불러오기
  chrome.storage.sync.get(['language', 'apiKey', 'translatorService'], function(result) {
    if (result.language) {
      languageSelect.value = result.language;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.translatorService) {
      translatorServiceSelect.value = result.translatorService;
    }
    
    // 설정을 불러온 후에 UI 업데이트
    updateApiKeyPlaceholder();
  });
  
  // 언어 설정 저장
  languageSelect.addEventListener('change', function() {
    chrome.storage.sync.set({language: this.value}, function() {
      console.log('언어 설정이 저장되었습니다:', this.value);
    });
  });
  
  // 번역 서비스 선택 저장
  translatorServiceSelect.addEventListener('change', function() {
    chrome.storage.sync.set({translatorService: this.value}, function() {
      console.log('번역 서비스 설정이 저장되었습니다:', this.value);
    });
    // 서비스에 따라 API 키 입력 필드 업데이트
    updateApiKeyPlaceholder();
  });
  
  // API 키 저장
  apiKeyInput.addEventListener('change', function() {
    chrome.storage.sync.set({apiKey: this.value}, function() {
      console.log('API 키가 저장되었습니다');
    });
  });
  
  // 서비스에 따라 API 키 플레이스홀더 업데이트
  function updateApiKeyPlaceholder() {
    const service = translatorServiceSelect.value || 'google-free'; // 기본값 설정
    const apiKeyLabel = document.querySelector('label[for="apiKey"]');
    const apiKeySmall = apiKeyInput.parentElement.querySelector('small');
    
    console.log('번역 서비스 업데이트:', service);
    
    if (service === 'deepl') {
      apiKeyInput.placeholder = 'DeepL API 키를 입력하세요 (필수)';
      apiKeyInput.style.display = 'block';
      if (apiKeyLabel) apiKeyLabel.innerHTML = 'API 키: <span style="color: red;">*필수</span>';
      if (apiKeySmall) apiKeySmall.style.display = 'block';
    } else if (service === 'google') {
      apiKeyInput.placeholder = 'Google Translate API 키를 입력하세요 (필수)';
      apiKeyInput.style.display = 'block';
      if (apiKeyLabel) apiKeyLabel.innerHTML = 'API 키: <span style="color: red;">*필수</span>';
      if (apiKeySmall) apiKeySmall.style.display = 'none';
    } else {
      // google-free는 API 키 불필요
      apiKeyInput.placeholder = 'API 키 불필요';
      apiKeyInput.style.display = 'none';
      if (apiKeyLabel) apiKeyLabel.innerHTML = 'API 키: <span style="color: green;">(불필요)</span>';
      if (apiKeySmall) apiKeySmall.style.display = 'block';
    }
  }
  
  // 초기 플레이스홀더 설정 (설정 로드 전에 기본값으로 설정)
  // 실제 UI 업데이트는 설정 로드 후에 수행됨
  
  // 상태 업데이트
  function updateStatus() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
        if (response && response.active) {
          statusDiv.textContent = '활성화됨 - 단어를 드래그해보세요!';
          statusDiv.className = 'status active';
        } else {
          statusDiv.textContent = '비활성화됨';
          statusDiv.className = 'status';
        }
      });
    });
  }
  
  // 초기 상태 확인
  updateStatus();
  
  // 1초마다 상태 업데이트
  setInterval(updateStatus, 1000);
});
