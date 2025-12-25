// 말풍선 팝업 상태 관리
let speechBubble = null;
let settingsIconImg = null; // 설정 아이콘 이미지 참조
let homeIconImg = null; // 홈 아이콘 이미지 참조
let messageIconImg = null; // 메시지 아이콘 이미지 참조

// HTML 이스케이프 함수
function escapeHtml(text) {
  if (!text && text !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// 아이콘 상태 업데이트 함수들
function updateSettingsIcon(isActive) {
  if (settingsIconImg) {
    if (isActive) {
      settingsIconImg.src = chrome.runtime.getURL('resource/settings.png');
    } else {
      settingsIconImg.src = chrome.runtime.getURL('resource/settings_unclicked.png');
    }
  }
}

function updateHomeIcon(isActive) {
  if (homeIconImg) {
    if (isActive) {
      homeIconImg.src = chrome.runtime.getURL('resource/home_clicked.png');
    } else {
      homeIconImg.src = chrome.runtime.getURL('resource/home_unclicked.png');
    }
  }
}

function updateMessageIcon(isActive) {
  if (messageIconImg) {
    if (isActive) {
      messageIconImg.src = chrome.runtime.getURL('resource/chat_clicked.png');
    } else {
      messageIconImg.src = chrome.runtime.getURL('resource/chat_unclicked.png');
    }
  }
}

// 모든 아이콘 비활성화 (특정 아이콘만 활성화)
function resetAllIcons() {
  updateSettingsIcon(false);
  updateHomeIcon(false);
  updateMessageIcon(false);
}

// 채팅 화면 표시 함수
function showChatScreen(contentArea) {
  // 기존 내용 제거
  contentArea.innerHTML = '';
  
  // 채팅 화면 컨테이너
  const chatContainer = document.createElement('div');
  chatContainer.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: Arial, sans-serif;
    overflow-y: auto;
    padding: 10px;
    box-sizing: border-box;
  `;
  
  // 제목 영역 (제목 + 삭제 버튼)
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e0e0e0;
  `;
  
  const title = document.createElement('div');
  title.textContent = '번역 기록';
  title.style.cssText = `
    font-size: 18px;
    font-weight: bold;
    color: #333;
  `;
  
  // 삭제 버튼
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '전체 삭제';
  deleteButton.style.cssText = `
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    background: white;
    color: #666;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  
  deleteButton.addEventListener('mouseenter', function() {
    this.style.background = '#f5f5f5';
    this.style.borderColor = '#bbb';
  });
  
  deleteButton.addEventListener('mouseleave', function() {
    this.style.background = 'white';
    this.style.borderColor = '#ddd';
  });
  
  deleteButton.addEventListener('click', function() {
    if (confirm('모든 번역 기록을 삭제하시겠습니까?')) {
      chrome.storage.local.set({ translations: [] }, function() {
        // 리스트 초기화
        translationsList.innerHTML = '';
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = '번역 기록이 없습니다.';
        emptyMessage.style.cssText = `
          text-align: center;
          color: #999;
          padding: 40px 20px;
          font-size: 14px;
        `;
        translationsList.appendChild(emptyMessage);
      });
    }
  });
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(deleteButton);
  
  // 번역 기록 리스트 컨테이너
  const translationsList = document.createElement('div');
  translationsList.id = 'chat-translations-list';
  translationsList.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;
  
  chatContainer.appendChild(titleContainer);
  chatContainer.appendChild(translationsList);
  contentArea.appendChild(chatContainer);
  
  // 저장된 번역 기록 불러오기
  loadTranslations(translationsList);
}

// 번역 기록 불러오기 함수 (전역 접근 가능)
function loadTranslations(container) {
  chrome.storage.local.get(['translations'], function(result) {
    const translations = result.translations || [];
    
    if (translations.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = '번역 기록이 없습니다.';
      emptyMessage.style.cssText = `
        text-align: center;
        color: #999;
        padding: 40px 20px;
        font-size: 14px;
      `;
      container.appendChild(emptyMessage);
      return;
    }
    
    // 최신순으로 정렬 (최신이 위)
    const sortedTranslations = translations.slice().reverse();
    
    sortedTranslations.forEach((item, index) => {
      const translationItem = document.createElement('div');
      translationItem.style.cssText = `
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
      `;
      
      // 버튼 컨테이너 (우측 상단)
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 4px;
        align-items: center;
      `;
      
      // 파파고 버튼
      const papagoButton = document.createElement('button');
      papagoButton.textContent = '파파고';
      papagoButton.style.cssText = `
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        color: #666;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      papagoButton.addEventListener('mouseenter', function() {
        this.style.background = '#e3f2fd';
        this.style.borderColor = '#2196f3';
        this.style.color = '#2196f3';
      });
      
      papagoButton.addEventListener('mouseleave', function() {
        this.style.background = 'white';
        this.style.borderColor = '#ddd';
        this.style.color = '#666';
      });
      
      papagoButton.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        // 파파고로 이동
        const sourceLang = item.sourceLanguage || 'auto';
        const targetLang = item.targetLanguage || 'ko';
        const originalText = item.original || '';
        
        // 함수 호출 시도
        if (typeof openPapago === 'function') {
          openPapago(originalText, sourceLang, targetLang);
        } else if (typeof window.openPapago === 'function') {
          window.openPapago(originalText, sourceLang, targetLang);
        } else {
          // 함수가 없으면 직접 구현
          try {
            const encodedText = encodeURIComponent(originalText);
            const langMap = {
              'ko': 'ko',
              'en': 'en',
              'ja': 'ja',
              'zh': 'zh-CN'
            };
            const papagoSourceLang = sourceLang === 'auto' ? 'ko' : (langMap[sourceLang] || 'ko');
            const papagoTargetLang = langMap[targetLang] || 'ko';
            const papagoUrl = `https://papago.naver.com/?sk=${papagoSourceLang}&tk=${papagoTargetLang}&hn=0&st=${encodedText}`;
            window.open(papagoUrl, '_blank');
          } catch (error) {
            console.error('파파고 열기 오류:', error);
          }
        }
      });
      
      // 삭제 버튼
      const deleteItemButton = document.createElement('button');
      deleteItemButton.innerHTML = '×';
      deleteItemButton.style.cssText = `
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #999;
        font-size: 20px;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s ease;
      `;
      
      deleteItemButton.addEventListener('mouseenter', function() {
        this.style.background = '#ffebee';
        this.style.color = '#f44336';
      });
      
      deleteItemButton.addEventListener('mouseleave', function() {
        this.style.background = 'transparent';
        this.style.color = '#999';
      });
      
      deleteItemButton.addEventListener('click', function(e) {
        e.stopPropagation();
        // 해당 항목 삭제
        chrome.storage.local.get(['translations'], function(result) {
          const translations = result.translations || [];
          // 원래 인덱스 찾기 (reverse된 상태이므로 원래 인덱스 계산)
          const originalIndex = translations.length - 1 - index;
          // 해당 항목 제거
          translations.splice(originalIndex, 1);
          
          // 저장
          chrome.storage.local.set({ translations: translations }, function() {
            // 리스트 다시 로드
            container.innerHTML = '';
            loadTranslations(container);
          });
        });
      });
      
      buttonContainer.appendChild(papagoButton);
      buttonContainer.appendChild(deleteItemButton);
      
      // 원본 텍스트
      const originalText = document.createElement('div');
      originalText.textContent = item.original || '';
      originalText.style.cssText = `
        font-size: 14px;
        color: #666;
        font-weight: 500;
        padding-right: 100px;
      `;
      
      // 번역 텍스트
      const translatedText = document.createElement('div');
      translatedText.textContent = item.translated || '';
      translatedText.style.cssText = `
        font-size: 16px;
        color: #333;
        font-weight: 600;
        padding-right: 100px;
      `;
      
      // 메타 정보 (언어, 시간)
      const metaInfo = document.createElement('div');
      metaInfo.style.cssText = `
        font-size: 11px;
        color: #999;
        display: flex;
        gap: 10px;
        margin-top: 4px;
      `;
      
      const languageInfo = document.createElement('span');
      languageInfo.textContent = `${item.sourceLanguage || 'auto'} → ${item.targetLanguage || 'ko'}`;
      
      const timeInfo = document.createElement('span');
      timeInfo.textContent = item.timestamp || '';
      
      metaInfo.appendChild(languageInfo);
      metaInfo.appendChild(timeInfo);
      
      translationItem.appendChild(buttonContainer);
      translationItem.appendChild(originalText);
      translationItem.appendChild(translatedText);
      translationItem.appendChild(metaInfo);
      
      container.appendChild(translationItem);
    });
  });
}

// 전역 스코프에 명시적으로 할당 (Chrome Extension 호환성)
if (typeof window !== 'undefined') {
  window.loadTranslations = loadTranslations;
}

// 설정 화면 표시 함수
function showSettingsScreen(contentArea) {
  // 기존 내용 제거
  contentArea.innerHTML = '';
  
  // 설정 아이콘 활성화
  updateSettingsIcon(true);
  
  // 설정 화면 컨테이너
  const settingsContainer = document.createElement('div');
  settingsContainer.style.cssText = `
    width: 100%;
    height: 100%;
  `;
  
  // 키 변경 섹션
  const keySection = document.createElement('div');
  keySection.style.cssText = `
    margin-bottom: 20px;
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
  
  // 해석 언어 섹션
  const languageSection = document.createElement('div');
  languageSection.style.cssText = `
    margin-bottom: 20px;
  `;
  
  const languageLabel = document.createElement('label');
  languageLabel.textContent = '해석 언어';
  languageLabel.style.cssText = `
    display: block;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #555;
  `;
  
  // 언어 버튼 컨테이너
  const languageButtonContainer = document.createElement('div');
  languageButtonContainer.style.cssText = `
    display: flex;
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
  `;
  
  const languageOptions = [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '中文' }
  ];
  
  // 저장된 언어 불러오기
  let selectedLanguageValue = 'ko';
  chrome.storage.sync.get(['language'], function(result) {
    selectedLanguageValue = result.language || 'ko';
    updateLanguageButtonStates();
  });
  
  // 언어 버튼 상태 업데이트 함수
  function updateLanguageButtonStates() {
    languageOptions.forEach((option, index) => {
      const button = languageButtonContainer.children[index];
      if (button) {
        if (option.value === selectedLanguageValue) {
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
  
  // 각 언어 옵션에 대한 버튼 생성
  languageOptions.forEach((option) => {
    const languageButton = document.createElement('button');
    languageButton.textContent = option.label;
    languageButton.style.cssText = `
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
    languageButton.addEventListener('click', function() {
      selectedLanguageValue = option.value;
      
      // 저장
      chrome.storage.sync.set({ language: option.value }, function() {
        updateLanguageButtonStates();
        showSaveMessage(settingsContainer);
      });
    });
    
    // 호버 효과
    languageButton.addEventListener('mouseenter', function() {
      if (option.value !== selectedLanguageValue) {
        this.style.background = '#f5f5f5';
        this.style.borderColor = '#bbb';
      }
    });
    languageButton.addEventListener('mouseleave', function() {
      if (option.value !== selectedLanguageValue) {
        this.style.background = 'white';
        this.style.borderColor = '#ddd';
      }
    });
    
    languageButtonContainer.appendChild(languageButton);
  });
  
  // 초기 버튼 상태 설정
  setTimeout(updateLanguageButtonStates, 100);
  
  languageSection.appendChild(languageLabel);
  languageSection.appendChild(languageButtonContainer);
  
  // 번역 서비스 섹션
  const translatorSection = document.createElement('div');
  translatorSection.style.cssText = `
    margin-bottom: 20px;
  `;
  
  const translatorLabel = document.createElement('label');
  translatorLabel.textContent = '번역 서비스';
  translatorLabel.style.cssText = `
    display: block;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #555;
  `;
  
  // 번역 서비스 버튼 컨테이너
  const translatorButtonContainer = document.createElement('div');
  translatorButtonContainer.style.cssText = `
    display: flex;
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;
  `;
  
  const translatorOptions = [
    { value: 'google-free', label: 'Google (무료)' },
    { value: 'deepl', label: 'DeepL' },
    { value: 'google', label: 'Google (유료)' }
  ];
  
  // 저장된 번역 서비스 불러오기
  let selectedTranslatorValue = 'google-free';
  chrome.storage.sync.get(['translatorService'], function(result) {
    selectedTranslatorValue = result.translatorService || 'google-free';
    updateTranslatorButtonStates();
    updateApiKeyVisibility();
  });
  
  // 번역 서비스 버튼 상태 업데이트 함수
  function updateTranslatorButtonStates() {
    translatorOptions.forEach((option, index) => {
      const button = translatorButtonContainer.children[index];
      if (button) {
        if (option.value === selectedTranslatorValue) {
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
  
  // 각 번역 서비스 옵션에 대한 버튼 생성
  translatorOptions.forEach((option) => {
    const translatorButton = document.createElement('button');
    translatorButton.textContent = option.label;
    translatorButton.style.cssText = `
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
    translatorButton.addEventListener('click', function() {
      selectedTranslatorValue = option.value;
      
      // 저장
      chrome.storage.sync.set({ translatorService: option.value }, function() {
        updateTranslatorButtonStates();
        updateApiKeyVisibility();
        showSaveMessage(settingsContainer);
      });
    });
    
    // 호버 효과
    translatorButton.addEventListener('mouseenter', function() {
      if (option.value !== selectedTranslatorValue) {
        this.style.background = '#f5f5f5';
        this.style.borderColor = '#bbb';
      }
    });
    translatorButton.addEventListener('mouseleave', function() {
      if (option.value !== selectedTranslatorValue) {
        this.style.background = 'white';
        this.style.borderColor = '#ddd';
      }
    });
    
    translatorButtonContainer.appendChild(translatorButton);
  });
  
  // 초기 버튼 상태 설정
  setTimeout(updateTranslatorButtonStates, 100);
  
  translatorSection.appendChild(translatorLabel);
  translatorSection.appendChild(translatorButtonContainer);
  
  // API 키 섹션
  const apiKeySection = document.createElement('div');
  apiKeySection.style.cssText = `
    margin-bottom: 0;
  `;
  
  const apiKeyLabel = document.createElement('label');
  apiKeyLabel.id = 'settings-apiKey-label';
  apiKeyLabel.textContent = 'API 키';
  apiKeyLabel.style.cssText = `
    display: block;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #555;
  `;
  
  const apiKeyInput = document.createElement('input');
  apiKeyInput.id = 'settings-apiKey';
  apiKeyInput.type = 'text';
  apiKeyInput.style.cssText = `
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    color: #333;
    box-sizing: border-box;
  `;
  
  const apiKeyHelp = document.createElement('div');
  apiKeyHelp.id = 'settings-apiKey-help';
  apiKeyHelp.style.cssText = `
    font-size: 12px;
    color: #666;
    margin-top: 5px;
    line-height: 1.4;
  `;
  
  // API 키 필드 가시성 업데이트 함수
  function updateApiKeyVisibility() {
    const service = selectedTranslatorValue || 'google-free';
    
    if (service === 'deepl') {
      apiKeyInput.placeholder = 'DeepL API 키를 입력하세요 (필수)';
      apiKeyInput.style.display = 'block';
      apiKeyLabel.innerHTML = 'API 키: <span style="color: red;">*필수</span>';
      apiKeyHelp.innerHTML = '<strong>참고:</strong> <a href="https://www.deepl.com/pro-api" target="_blank" style="color: #007bff;">무료 API 키 발급</a> 필요 (월 50만 자 무료)';
      apiKeyHelp.style.display = 'block';
    } else if (service === 'google') {
      apiKeyInput.placeholder = 'Google Translate API 키를 입력하세요 (필수)';
      apiKeyInput.style.display = 'block';
      apiKeyLabel.innerHTML = 'API 키: <span style="color: red;">*필수</span>';
      apiKeyHelp.style.display = 'none';
    } else {
      apiKeyInput.placeholder = 'API 키 불필요';
      apiKeyInput.style.display = 'none';
      apiKeyLabel.innerHTML = 'API 키: <span style="color: green;">(불필요)</span>';
      apiKeyHelp.innerHTML = '<strong>참고:</strong> Google Translate (무료)는 API 키 불필요합니다.';
      apiKeyHelp.style.display = 'block';
    }
  }
  
  // 저장된 API 키 불러오기
  chrome.storage.sync.get(['apiKey'], function(result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
  
  // API 키 변경 시 저장
  apiKeyInput.addEventListener('change', function() {
    chrome.storage.sync.set({ apiKey: this.value }, function() {
      showSaveMessage(settingsContainer);
    });
  });
  
  apiKeySection.appendChild(apiKeyLabel);
  apiKeySection.appendChild(apiKeyInput);
  apiKeySection.appendChild(apiKeyHelp);
  
  // 번역 설정 컨테이너 (해석언어, 번역서비스, API키를 묶음)
  const translationSettingsContainer = document.createElement('div');
  translationSettingsContainer.style.cssText = `
    margin-bottom: 20px;
  `;
  
  translationSettingsContainer.appendChild(languageSection);
  translationSettingsContainer.appendChild(translatorSection);
  translationSettingsContainer.appendChild(apiKeySection);
  
  // 저장 메시지 표시 함수
  function showSaveMessage(container) {
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
    container.appendChild(saveMsg);
    setTimeout(() => {
      saveMsg.remove();
    }, 2000);
  }
  
  settingsContainer.appendChild(keySection);
  settingsContainer.appendChild(translationSettingsContainer);
  
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
    width: 1000px;
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
  homeImg.src = chrome.runtime.getURL('resource/home_unclicked.png');
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
  
  // 전역 참조 저장
  homeIconImg = homeImg;
  
  // 홈 아이콘 클릭 이벤트
  homeIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    resetAllIcons();
    updateHomeIcon(true);
    
    // 함수 호출 시도
    if (typeof showHomeScreen === 'function') {
      showHomeScreen(contentArea);
    } else if (typeof window.showHomeScreen === 'function') {
      window.showHomeScreen(contentArea);
    } else {
      // 함수가 없으면 직접 구현
      contentArea.innerHTML = '';
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
      
      const versionText = document.createElement('div');
      versionText.textContent = 'Vopet Ver 1.0';
      versionText.style.cssText = `
        font-size: 24px;
        font-weight: bold;
        color: #1C1C1B;
        text-align: center;
      `;
      
      const updatedText = document.createElement('div');
      updatedText.textContent = 'updated 2025.12.26';
      updatedText.style.cssText = `
        font-size: 12px;
        color: #999;
        text-align: center;
      `;
      
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
  });
  
  // 설정 아이콘
  const settingsIcon = document.createElement('div');
  settingsIcon.className = 'vopet-icon-btn';
  const settingsImg = document.createElement('img');
  settingsImg.src = chrome.runtime.getURL('resource/settings_unclicked.png');
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
  
  // 전역 참조 저장
  settingsIconImg = settingsImg;
  
  // 설정 아이콘 클릭 이벤트
  settingsIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    resetAllIcons();
    updateSettingsIcon(true);
    showSettingsScreen(contentArea);
  });
  
  // 메시지 아이콘
  const messageIcon = document.createElement('div');
  messageIcon.className = 'vopet-icon-btn';
  const messageImg = document.createElement('img');
  messageImg.src = chrome.runtime.getURL('resource/chat_unclicked.png');
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
  
  // 전역 참조 저장
  messageIconImg = messageImg;
  
  // 메시지 아이콘 클릭 이벤트
  messageIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    resetAllIcons();
    updateMessageIcon(true);
    showChatScreen(contentArea);
  });
  
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
  
  // 기본적으로 홈 선택 및 홈 화면 표시
  setTimeout(() => {
    resetAllIcons();
    updateHomeIcon(true);
    
    // 함수 호출 시도
    if (typeof showHomeScreen === 'function') {
      showHomeScreen(contentArea);
    } else if (typeof window.showHomeScreen === 'function') {
      window.showHomeScreen(contentArea);
    } else {
      // 함수가 없으면 직접 구현
      contentArea.innerHTML = '';
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
      
      const versionText = document.createElement('div');
      versionText.textContent = 'Vopet Ver 1.0';
      versionText.style.cssText = `
        font-size: 24px;
        font-weight: bold;
        color: #1C1C1B;
        text-align: center;
      `;
      
      const updatedText = document.createElement('div');
      updatedText.textContent = 'updated 2025.12.26';
      updatedText.style.cssText = `
        font-size: 12px;
        color: #999;
        text-align: center;
      `;
      
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
  }, 100);
  
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
function initLottieIcon() {
  // document.body가 준비되었는지 확인
  if (!document.body) {
    // body가 없으면 대기 후 재시도
    setTimeout(initLottieIcon, 100);
    return;
  }
  
  // 이미 아이콘이 생성되었는지 확인
  if (document.getElementById('vopet-bottom-right-icon')) {
    return; // 이미 생성됨
  }
  
  // lottie가 로드되었는지 확인
  if (typeof lottie !== 'undefined') {
    createLottieIcon();
  } else {
    // lottie-web이 아직 로드되지 않은 경우 약간의 지연 후 재시도
    setTimeout(() => {
      if (typeof lottie !== 'undefined') {
        createLottieIcon();
      } else {
        // 최대 5초까지 재시도
        let retryCount = 0;
        const maxRetries = 50; // 5초 (100ms * 50)
        const retryInterval = setInterval(() => {
          retryCount++;
          if (typeof lottie !== 'undefined') {
            createLottieIcon();
            clearInterval(retryInterval);
          } else if (retryCount >= maxRetries) {
            clearInterval(retryInterval);
            console.warn('VoPet: Lottie library failed to load');
          }
        }, 100);
      }
    }, 100);
  }
}

// DOM이 준비되면 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLottieIcon);
} else {
  // 이미 로드된 경우 즉시 실행
  initLottieIcon();
}

// YouTube 같은 SPA를 위해 추가 체크
window.addEventListener('load', function() {
  setTimeout(() => {
    if (!document.getElementById('vopet-bottom-right-icon')) {
      initLottieIcon();
    }
  }, 500);
});

