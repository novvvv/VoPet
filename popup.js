// 팝업 스크립트

// 저장 메시지 표시 함수
function showSaveMessage() {
  const saveMsg = document.createElement('div');
  saveMsg.className = 'save-message';
  saveMsg.textContent = '✓ 저장되었습니다';
  document.body.appendChild(saveMsg);
  setTimeout(() => {
    saveMsg.remove();
  }, 2000);
}

// 버튼 그룹 상태 업데이트 함수
function updateButtonGroup(buttonGroup, selectedValue) {
  buttonGroup.querySelectorAll('button').forEach(button => {
    if (button.getAttribute('data-value') === selectedValue) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const languageSelect = document.getElementById('language');
  const apiKeyInput = document.getElementById('apiKey');
  const statusDiv = document.getElementById('status');
  const translatorServiceSelect = document.getElementById('translatorService');
  const apiKeyHelp = document.getElementById('apiKeyHelp');
  
  // Shortcut 버튼 그룹
  const shortcutButtons = document.getElementById('shortcut-buttons');
  let selectedShortcut = 'meta';
  
  // OCR 언어 버튼 그룹
  const ocrLanguageButtons = document.getElementById('ocr-language-buttons');
  let selectedOCRLanguage = 'eng';
  
  // 해석 언어 버튼 그룹
  const languageButtons = document.getElementById('language-buttons');
  let selectedLanguage = 'ko';
  
  // 파일 연동 관련
  const fileInfo = document.getElementById('fileInfo');
  const fileSelectBtn = document.getElementById('fileSelectBtn');
  const fileDisconnectBtn = document.getElementById('fileDisconnectBtn');
  const fileInput = document.getElementById('fileInput');
  
  // 저장된 설정 불러오기
  chrome.storage.sync.get(['modifierKey', 'ocrLanguage', 'language', 'apiKey', 'translatorService'], function(result) {
    // Shortcut 설정
    if (result.modifierKey) {
      selectedShortcut = result.modifierKey;
      updateButtonGroup(shortcutButtons, selectedShortcut);
    }
    
    // OCR 언어 설정
    if (result.ocrLanguage) {
      selectedOCRLanguage = result.ocrLanguage;
      updateButtonGroup(ocrLanguageButtons, selectedOCRLanguage);
    }
    
    // 해석 언어 설정
    if (result.language) {
      selectedLanguage = result.language;
      updateButtonGroup(languageButtons, selectedLanguage);
    }
    
    // 번역 서비스 및 API 키
    if (result.translatorService) {
      translatorServiceSelect.value = result.translatorService;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    
    updateApiKeyPlaceholder();
  });
  
  // Shortcut 버튼 클릭 이벤트
  shortcutButtons.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function() {
      selectedShortcut = this.getAttribute('data-value');
      updateButtonGroup(shortcutButtons, selectedShortcut);
      
      chrome.storage.sync.set({ modifierKey: selectedShortcut }, function() {
        showSaveMessage();
      });
    });
  });
  
  // OCR 언어 버튼 클릭 이벤트
  ocrLanguageButtons.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function() {
      selectedOCRLanguage = this.getAttribute('data-value');
      updateButtonGroup(ocrLanguageButtons, selectedOCRLanguage);
      
      chrome.storage.sync.set({ ocrLanguage: selectedOCRLanguage }, function() {
        showSaveMessage();
      });
    });
  });
  
  // 해석 언어 버튼 클릭 이벤트
  languageButtons.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function() {
      selectedLanguage = this.getAttribute('data-value');
      updateButtonGroup(languageButtons, selectedLanguage);
      
      chrome.storage.sync.set({ language: selectedLanguage }, function() {
        showSaveMessage();
      });
    });
  });
  
  // 번역 서비스 선택 저장
  translatorServiceSelect.addEventListener('change', function() {
    chrome.storage.sync.set({translatorService: this.value}, function() {
      console.log('번역 서비스 설정이 저장되었습니다:', this.value);
      updateApiKeyPlaceholder();
    });
  });
  
  // API 키 저장
  apiKeyInput.addEventListener('change', function() {
    chrome.storage.sync.set({apiKey: this.value}, function() {
      console.log('API 키가 저장되었습니다');
    });
  });
  
  // 서비스에 따라 API 키 플레이스홀더 업데이트
  function updateApiKeyPlaceholder() {
    const service = translatorServiceSelect.value || 'google-free';
    
    if (service === 'deepl') {
      apiKeyInput.placeholder = 'DeepL API 키를 입력하세요 (필수)';
      apiKeyInput.style.display = 'block';
      apiKeyHelp.innerHTML = '<strong>참고:</strong> <a href="https://www.deepl.com/pro-api" target="_blank">무료 API 키 발급</a> 필요 (월 50만 자 무료)';
      apiKeyHelp.style.display = 'block';
    } else if (service === 'google') {
      apiKeyInput.placeholder = 'Google Translate API 키를 입력하세요 (필수)';
      apiKeyInput.style.display = 'block';
      apiKeyHelp.innerHTML = '';
      apiKeyHelp.style.display = 'none';
    } else {
      apiKeyInput.placeholder = 'API 키 불필요';
      apiKeyInput.style.display = 'none';
      apiKeyHelp.innerHTML = '<strong>참고:</strong> Google Translate (무료)는 API 키 불필요합니다.';
      apiKeyHelp.style.display = 'block';
    }
  }
  
  // 파일 정보 업데이트 함수
  function updateFileInfo() {
    chrome.storage.local.get(['syncedFileName'], function(result) {
      if (result.syncedFileName) {
        const isNumbers = result.syncedFileName.endsWith('.numbers');
        fileInfo.innerHTML = `
          <strong>연동된 파일:</strong> ${escapeHtml(result.syncedFileName)}<br>
          ${isNumbers ? 
            '<small style="color: #dcdcaa;">⚠️ Numbers 파일은 CSV로 내보낸 후 사용해주세요</small>' :
            '<small style="color: #4ec9b0;">✓ 저장 버튼이 활성화됩니다</small>'
          }
        `;
        fileDisconnectBtn.style.display = 'inline-block';
      } else {
        fileInfo.innerHTML = `
          <span style="color: #6e6e6e;">연동된 파일이 없습니다</span><br>
          <small>CSV 파일을 선택하면 단어 저장 시 자동으로 추가됩니다</small>
        `;
        fileDisconnectBtn.style.display = 'none';
      }
    });
  }
  
  // HTML 이스케이프 함수
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  // 파일 선택 버튼 클릭 - File System Access API 사용
  fileSelectBtn.addEventListener('click', async function() {
    try {
      // File System Access API 사용 (Chrome 86+)
      if ('showOpenFilePicker' in window) {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'CSV 파일',
            accept: {
              'text/csv': ['.csv']
            }
          }],
          excludeAcceptAllOption: false,
          multiple: false
        });
        
        const file = await handle.getFile();
        
        // 파일 핸들을 IndexedDB에 저장
        const dbName = 'vopet_file_handles';
        const dbVersion = 1;
        const request = indexedDB.open(dbName, dbVersion);
        
        request.onerror = () => {
          console.error('IndexedDB 오류:', request.error);
        };
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['fileHandles'], 'readwrite');
          const store = transaction.objectStore('fileHandles');
          
          // 파일 핸들 저장
          store.put({ id: 'current', handle: handle, fileName: file.name });
          
          transaction.oncomplete = () => {
            console.log('파일 핸들 저장 완료');
          };
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('fileHandles')) {
            db.createObjectStore('fileHandles', { keyPath: 'id' });
          }
        };
        
        // CSV 파일 읽기
        if (file.name.endsWith('.csv')) {
          const reader = new FileReader();
          reader.onload = async function(e) {
            const content = e.target.result;
            
            chrome.storage.local.set({
              syncedFileName: file.name,
              syncedFileLastModified: file.lastModified,
              syncedFileContent: content
            }, function() {
              updateFileInfo();
              showSaveMessage();
            });
          };
          reader.readAsText(file, 'UTF-8');
        } else {
          alert('CSV 파일만 지원됩니다.');
        }
      } else {
        // File System Access API를 지원하지 않는 경우 일반 파일 선택 사용
        fileInput.click();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('파일 선택 오류:', error);
        // File System Access API 실패 시 일반 파일 선택으로 폴백
        fileInput.click();
      }
    }
  });
  
  // 파일 선택 input 이벤트 (폴백용)
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.numbers')) {
        alert('Numbers 파일은 직접 읽을 수 없습니다.\n\n사용 방법:\n1. Numbers에서 파일을 열기\n2. "파일" > "다른 이름으로 저장" > "CSV" 선택\n3. CSV 파일로 저장 후 다시 선택해주세요');
        
        chrome.storage.local.set({
          syncedFileName: file.name,
          syncedFileLastModified: file.lastModified,
          syncedFileContent: null
        }, function() {
          updateFileInfo();
        });
        return;
      }
      
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const content = e.target.result;
          
          chrome.storage.local.set({
            syncedFileName: file.name,
            syncedFileLastModified: file.lastModified,
            syncedFileContent: content
          }, function() {
            updateFileInfo();
            showSaveMessage();
            
            chrome.runtime.sendMessage({
              action: 'setSyncedFile',
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type
            });
          });
        };
        reader.onerror = function() {
          alert('파일을 읽는 중 오류가 발생했습니다.');
        };
        reader.readAsText(file, 'UTF-8');
      } else {
        alert('CSV 파일만 지원됩니다.');
      }
    }
  });
  
  // 연결 해제 버튼 클릭
  fileDisconnectBtn.addEventListener('click', function() {
    if (confirm('파일 연동을 해제하시겠습니까?')) {
      chrome.storage.local.remove(['syncedFileName', 'syncedFileContent', 'syncedFileLastModified', 'fileHandleId'], function() {
        updateFileInfo();
        showSaveMessage();
        
        chrome.runtime.sendMessage({
          action: 'clearSyncedFile'
        });
      });
    }
  });
  
  // 초기 파일 정보 로드
  updateFileInfo();
  
  // 상태 업데이트
  function updateStatus() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
        if (response && response.active) {
          statusDiv.innerHTML = '<span class="status-dot"></span>활성화됨 — 단어를 드래그해보세요';
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
