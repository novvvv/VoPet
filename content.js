
// -- [Variable] 변수 선언 -- //
let isActive = true; // VoPet 활성화 상태 추적
let currentPopup = null; // 현재 팝업 저장
let selectedText = ''; // 선택된 텍스트 저장
let isDragging = false; // 드래그 상태 추적
let modifierKey = 'meta'; // 기본값: Cmd/Ctrl

// 크롬 동기화 저장소에서 저장된 키(값) [modifierKey] 불러오기 
// 비동기 콜백 방식 
chrome.storage.sync.get(['modifierKey'], function(result) {
  if (result.modifierKey) {
    modifierKey = result.modifierKey;
  }
});

// 키 변경 감지
chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName === 'sync' && changes.modifierKey) {
    modifierKey = changes.modifierKey.newValue;
  }
});

// 키 체크 함수 (키 조합 지원)
function checkModifierKey(event) {
  if (!modifierKey) {
    return event.metaKey || event.ctrlKey; // 기본값
  }
  
  // 키 조합인지 확인 (예: "meta+c", "alt+v")
  if (modifierKey.includes('+')) {
    const keys = modifierKey.split('+');
    let allKeysPressed = true;
    
    // 각 키가 눌렸는지 확인
    for (const key of keys) {
      const trimmedKey = key.trim().toLowerCase();
      
      // Modifier 키 체크
      if (trimmedKey === 'meta') {
        if (!(event.metaKey || event.ctrlKey)) {
          allKeysPressed = false;
          break;
        }
      } else if (trimmedKey === 'alt') {
        if (!event.altKey) {
          allKeysPressed = false;
          break;
        }
      } else if (trimmedKey === 'shift') {
        if (!event.shiftKey) {
          allKeysPressed = false;
          break;
        }
      } else {
        // 일반 키 체크
        if (event.key.toLowerCase() !== trimmedKey) {
          allKeysPressed = false;
          break;
        }
      }
    }
    
    return allKeysPressed;
  }
  
  // 단일 키인 경우
  const key = modifierKey.toLowerCase();
  
  // Modifier 키만
  if (key === 'meta') {
    return event.metaKey || event.ctrlKey;
  }
  if (key === 'alt') {
    return event.altKey;
  }
  if (key === 'shift') {
    return event.shiftKey;
  }
  
  // 일반 키 (알파벳, 숫자 등)
  return event.key.toLowerCase() === key;
}


// 페이지에 VoPet 로드 표시를 위한 강력한 방법
const loadBanner = document.createElement('div');
loadBanner.id = 'vopet-load-banner';
loadBanner.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #4CAF50;
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 12px;
  z-index: 999999;
  font-family: Arial, sans-serif;
`;
loadBanner.textContent = 'VoPet Loaded ✓';
document.body.appendChild(loadBanner);

// 3초 후 배너 제거
setTimeout(() => {
  if (loadBanner.parentNode) {
    loadBanner.remove();
  }
}, 3000);

// VoPet 로드 표시를 위한 CSS 변수 추가
document.documentElement.style.setProperty('--vopet-loaded', 'true');

// 페이지에 VoPet 로드 표시 추가
const loadIndicator = document.createElement('div');
loadIndicator.id = 'vopet-load-indicator';
loadIndicator.style.display = 'none';
loadIndicator.textContent = 'VoPet Loaded';
document.body.appendChild(loadIndicator);

// 전역 함수로 VoPet 상태 확인 가능하게 만들기
window.vopetStatus = {
  loaded: true,
  active: isActive,
  version: '1.0'
};

// Background Script 깨우기 - Service Worker가 비활성화되지 않도록 (강화)
(function wakeUpBackgroundScript() {
  const wakeUp = () => {
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        // Background Script를 깨우기 위해 ping 메시지 전송
        chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message;
            if (error.includes('Receiving end does not exist')) {
              console.warn('⚠️ Background Script 미로드 - 200ms 후 재시도...');
              setTimeout(wakeUp, 200);
            } else {
              // Background Script 깨우기 실패
            }
          } else {
            // Background Script 활성화됨
          }
        });
      }
    } catch (error) {
      // Background Script 깨우기 오류
    }
  };
  
  // 즉시 시도
  wakeUp();
  
  // 500ms 후에도 한 번 더 시도 (확실하게)
  setTimeout(wakeUp, 500);
  
  // 1초 후에도 한 번 더 시도
  setTimeout(wakeUp, 1000);
})();

// -- 드래그 시작 감지 mouse down-- //
document.addEventListener('mousedown', function(event) {
  isDragging = true;
});

// -- 드래그 종료 감지 mouse up 100ms 지연 -- //
// -- [Function] 드래그 종료 감지 mouse up 100ms 지연 -- //
// -- 전체 문장 드래그 & 해석 처리 -- //
document.addEventListener('mouseup', function(event) {

  // [Exception] isActive가 false인 경우 드래그 종료
  if (!isActive) return;
  
  // [Exception] isDragging이 false인 경우 드래그 종료
  if (!isDragging) return;
  
  // [Exception] 설정된 키가 눌려있지 않으면 무시
  if (!checkModifierKey(event)) return;
  
  // [Exception] 약간의 지연을 두고 텍스트 선택 확인
  setTimeout(() => {

    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    // [Exception] text가 있고 길이가 0보다 큰 경우 팝업 표시
    // ** 단순 클릭 했을 때 팝업 표시를 방지 ** 
    if (text && text.length > 0) {
      selectedText = text; // 선택된 텍스트 저장
      showTranslationPopup(event, text); // 팝업 표시
    }
    
    isDragging = false; // 드래그 상태 초기화

  }, 100);
});

// 드래그 상태 추적
let dragStartPos = null;
let dragEndPos = null;

// 마우스 다운에서 드래그 시작 위치 기록
document.addEventListener('mousedown', function(e) {
  dragStartPos = { x: e.clientX, y: e.clientY };
});

// -- [Function] 짧은 단어 처리 리스너  -- //
document.addEventListener('mouseup', function(e) {

  // [Exception] 설정된 키가 눌려있지 않으면 무시
  if (!checkModifierKey(e)) return;

  dragEndPos = { x: e.clientX, y: e.clientY };
  // 드래그가 끝난 후 정확한 단어만 선택하도록 처리
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    // [Exception] currentPopup이 null인 경우 팝업 표시
    if (text && text.length > 0 && !currentPopup) {
      // [Exception] 드래그 거리 확인
      // 드래그 거리 확인
      if (dragStartPos && dragEndPos) {
        const deltaX = Math.abs(dragEndPos.x - dragStartPos.x);
        const deltaY = Math.abs(dragEndPos.y - dragStartPos.y);
        
        // 세로 드래그가 너무 크면 무시
        if (deltaY > 20) {
          return;
        }
        
        // 가로 드래그가 너무 크면 무시
        if (deltaX > 200) {
          return;
        }
      }
      
      // 텍스트에 줄바꿈이나 탭이 있는지 확인
      const hasLineBreaks = text.includes('\n') || text.includes('\t') || text.includes('\r');
      
      // 단일 단어만 처리
      if (!hasLineBreaks && text.length < 50 && text.split(' ').length <= 3) {
        // 마우스 위치를 대략적으로 추정
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const mockEvent = {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          target: selection.anchorNode.parentElement
        };
        showTranslationPopup(mockEvent, text);
      }
    }
  }, 50);
});


// -- [Function] 팝업 표시 함수 -- //
function showTranslationPopup(event, text) {

  // [Exception] 기존 팝업 제거
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
  
  // 새 팝업 생성 (화면 캡처 번역과 동일한 스타일)
  const popup = document.createElement('div');
  popup.id = 'vopet-translation-popup';
  popup.style.cssText = `
    position: fixed;
    background: #fff;
    border: 2px solid #000;
    z-index: 2147483647;
    max-width: 420px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  `;
  
  // 팝업 위치 설정 (더 안전한 위치 계산)
  let x = event.clientX || window.innerWidth / 2;
  let y = event.clientY || window.innerHeight / 2;
  
  // 화면 밖으로 나가지 않도록 조정
  if (x > window.innerWidth - 420) x = window.innerWidth - 440;
  if (x < 20) x = 20;
  if (y < 100) y = 100;
  if (y > window.innerHeight - 200) y = window.innerHeight - 220;
  
  popup.style.left = `${x}px`;
  popup.style.top = `${y - 100}px`;
  
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #000; background: #000; color: #fff;">
      <span style="font-size: 13px; font-weight: 600;">번역</span>
      <button class="vopet-close-btn" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #fff;">×</button>
    </div>
    <div style="padding: 20px; max-height: 60vh; overflow-y: auto;">
      <div class="vopet-loading" style="text-align: center; color: #666; font-size: 14px;">해석 중...</div>
      <div class="vopet-result" style="display: none;"></div>
    </div>
  `;
  
  document.body.appendChild(popup);
  currentPopup = popup;
  
  // -- [Function] 닫기 버튼 이벤트 (최강력한 방법) -- //
  const closeBtn = popup.querySelector('.vopet-close-btn');
  if (closeBtn) {
    // 모든 이벤트 차단
    closeBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // 팝업 강제 제거
      if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
      }
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      
      // 이벤트 전파 완전 차단
      return false;
    };
    
    // mousedown 이벤트도 차단
    closeBtn.onmousedown = function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };
    
    // 추가 이벤트 리스너 (capture 단계에서)
    closeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
      }
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, true);
  }
  
  
  // 단어 해석 요청
  translateWord(text);
  
}

// Extension context 유효성 확인 헬퍼 함수
function isExtensionContextValid() {
  try {
    // chrome.runtime.id가 있으면 유효함
    return chrome.runtime && chrome.runtime.id !== undefined;
  } catch (e) {
    return false;
  }
}

// 파일 핸들 요청 처리 함수
function processFileHandleRequest(getRequest, db, csvContent, fileData, saveButton, timeoutId) {
  getRequest.onsuccess = async () => {
    console.log('파일 핸들 조회 결과:', getRequest.result);
    const data = getRequest.result;
    
    if (data && data.handle) {
      // 저장된 파일 핸들을 사용하여 파일에 직접 쓰기
      try {
        console.log('파일 핸들 사용하여 저장 시도...');
        const writable = await data.handle.createWritable();
        const BOM = '\uFEFF';
        // CSV 내용의 앞뒤 공백 및 빈 줄 제거 후 저장
        const cleanCsv = csvContent.trim();
        await writable.write(BOM + cleanCsv);
        await writable.close();
        
        console.log('파일 저장 완료:', data.fileName);
        
        // 성공 처리
        clearTimeout(timeoutId);
        saveButton.textContent = '✓ 저장됨';
        saveButton.style.background = '#000';
        saveButton.style.color = '#fff';
        saveButton.disabled = false;
        
        setTimeout(() => {
          saveButton.textContent = '💾 저장';
          saveButton.style.background = '#fff';
          saveButton.style.color = '#000';
        }, 2000);
      } catch (error) {
        console.error('파일 쓰기 오류:', error);
        clearTimeout(timeoutId);
        saveButton.disabled = false;
        saveButton.textContent = '💾 저장';
        saveButton.style.background = '#fff';
        saveButton.style.color = '#000';
        alert('파일 저장 중 오류가 발생했습니다: ' + error.message);
      }
    } else {
      console.log('파일 핸들이 없음, 저장 다이얼로그 열기');
      // 파일 핸들이 없으면 파일 저장 다이얼로그 열기
      if ('showSaveFilePicker' in window) {
        window.showSaveFilePicker({
          suggestedName: fileData.syncedFileName,
          types: [{
            description: 'CSV 파일',
            accept: {
              'text/csv': ['.csv']
            }
          }]
        }).then(async (handle) => {
          console.log('새 파일 핸들 받음, IndexedDB에 저장...');
          // 새 파일 핸들을 IndexedDB에 저장
          // object store가 존재하는지 다시 확인
          if (!db.objectStoreNames.contains('fileHandles')) {
            console.error('fileHandles object store가 여전히 없습니다.');
            clearTimeout(timeoutId);
            saveButton.disabled = false;
            saveButton.textContent = '💾 저장';
            saveButton.style.background = '#fff';
            saveButton.style.color = '#000';
            alert('파일 저장 중 오류가 발생했습니다: object store를 찾을 수 없습니다.');
            return;
          }
          const writeTransaction = db.transaction(['fileHandles'], 'readwrite');
          const writeStore = writeTransaction.objectStore('fileHandles');
          writeStore.put({ id: 'current', handle: handle, fileName: handle.name });
          
          const writable = await handle.createWritable();
          const BOM = '\uFEFF';
          const cleanCsv = csvContent.trim();
          await writable.write(BOM + cleanCsv);
          await writable.close();
          
          console.log('파일 저장 완료');
          clearTimeout(timeoutId);
          saveButton.textContent = '✓ 저장됨';
          saveButton.style.background = '#000';
          saveButton.style.color = '#fff';
          saveButton.disabled = false;
          
          setTimeout(() => {
            saveButton.textContent = '💾 저장';
            saveButton.style.background = '#fff';
            saveButton.style.color = '#000';
          }, 2000);
        }).catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('파일 저장 오류:', error);
            clearTimeout(timeoutId);
            saveButton.disabled = false;
            saveButton.textContent = '💾 저장';
            saveButton.style.background = '#fff';
            saveButton.style.color = '#000';
            alert('파일 저장 중 오류가 발생했습니다: ' + error.message);
          } else {
            console.log('사용자가 저장 취소');
            clearTimeout(timeoutId);
            saveButton.disabled = false;
            saveButton.textContent = '💾 저장';
            saveButton.style.background = '#fff';
            saveButton.style.color = '#000';
          }
        });
      } else {
        console.log('File System Access API 미지원, 다운로드로 대체');
        // File System Access API를 지원하지 않는 경우 다운로드
        const BOM = '\uFEFF';
        const cleanCsv = csvContent.trim();
        const blob = new Blob([BOM + cleanCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileData.syncedFileName;
        link.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
        
        clearTimeout(timeoutId);
        saveButton.textContent = '✓ 저장됨';
        saveButton.style.background = '#000';
        saveButton.style.color = '#fff';
        saveButton.disabled = false;
        
        setTimeout(() => {
          saveButton.textContent = '💾 저장';
          saveButton.style.background = '#fff';
          saveButton.style.color = '#000';
        }, 2000);
      }
    }
  };
  
  getRequest.onerror = () => {
    console.error('파일 핸들 가져오기 오류:', getRequest.error);
    clearTimeout(timeoutId);
    saveButton.disabled = false;
    saveButton.textContent = '💾 저장';
    saveButton.style.background = '#fff';
    saveButton.style.color = '#000';
    alert('파일 핸들을 가져올 수 없습니다. 파일을 다시 선택해주세요.');
  };
}

// 단어 해석 함수
async function translateWord(text) {
  try {
    // Extension context 유효성 확인
    if (!isExtensionContextValid()) {
      throw new Error('확장 프로그램이 다시 로드되었습니다. 페이지를 새로고침해주세요.');
    }
    
    // 저장된 설정 가져오기
    const result = await chrome.storage.sync.get(['language', 'apiKey', 'translatorService']).catch(err => {
      if (err.message && err.message.includes('Extension context invalidated')) {
        throw new Error('확장 프로그램이 다시 로드되었습니다. 페이지를 새로고침해주세요.');
      }
      throw err;
    });
    const targetLanguage = result.language || 'ko';
    const apiKey = result.apiKey;
    const translatorService = result.translatorService || 'google-free'; // 기본값: Google 무료 (API 키 불필요)
    
    let translation = '';
    let furigana = '';
    
    // 선택된 번역 서비스에 따라 번역 실행
    if (translatorService === 'deepl') {
      if (!apiKey) {
        throw new Error('DeepL API 키가 필요합니다. 팝업에서 API 키를 입력해주세요.');
      }
      // DeepL API 사용
      translation = await translateWithDeepL(text, targetLanguage, apiKey);
    } else if (translatorService === 'google') {
      if (!apiKey) {
        throw new Error('Google Translate API 키가 필요합니다. 팝업에서 API 키를 입력해주세요.');
      }
      // Google Translate API 사용
      translation = await translateWithGoogleAPI(text, targetLanguage, apiKey);
    } else {
      // Google Translate 무료 API 사용 (API 키 없이)
      translation = await translateWithGoogleFree(text, targetLanguage);
    }
    
    // 일본어 관련 후리가나 확인 (한자가 포함된 텍스트)
    const sourceLang = detectLanguage(text);
    if ((sourceLang === 'ja' || targetLanguage === 'ja') && isShortKanjiWord(text)) {
      if (sourceLang === 'ja') {
        furigana = await getFurigana(text, sourceLang);
      } else if (targetLanguage === 'ja') {
        furigana = await getFurigana(translation, 'ja');
      }
    }
    
    // 결과 표시
    const resultDiv = currentPopup?.querySelector('.vopet-result');
    const loadingDiv = currentPopup?.querySelector('.vopet-loading');
    
    if (resultDiv && loadingDiv) {
      loadingDiv.style.display = 'none';
      resultDiv.style.display = 'block';
      
      // 번역 결과가 있는지 확인
      if (!translation || translation.trim().length === 0) {
        resultDiv.innerHTML = `
          <div class="vopet-error">해석을 불러올 수 없습니다</div>
        `;
        return;
      }
      
      // 저장 버튼 추가 (파일 연동 여부 확인) - 먼저 확인
      chrome.storage.local.get(['syncedFileName', 'syncedFileContent'], function(fileResult) {
        const hasSyncedFile = !!fileResult.syncedFileName;
        const isNumbers = fileResult.syncedFileName && fileResult.syncedFileName.endsWith('.numbers');
        const hasCsvContent = !!fileResult.syncedFileContent;
        const showSaveButton = hasSyncedFile && !isNumbers && hasCsvContent;
        
        // 전체 번역 문장 표시 (화면 캡처 번역과 동일한 스타일)
        let initialHTML = '';
        if (furigana) {
          initialHTML = `
            <div style="margin-bottom: 20px;">
              <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">원문</div>
              <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(text)}</div>
            </div>
            <div style="margin-bottom: 20px;">
              <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">후리가나</div>
              <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f0f8ff; padding: 12px; border-left: 3px solid #4169e1;">${escapeHtml(furigana.replace(/^\[|\]$/g, ''))}</div>
            </div>
            <div style="padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">번역</div>
                ${showSaveButton ? `<button class="vopet-save-to-file-btn" data-word="${escapeHtml(text)}" data-translation="${escapeHtml(translation)}" data-furigana="${escapeHtml(furigana ? furigana.replace(/^\[|\]$/g, '') : '')}" style="
                  background: #fff;
                  color: #000;
                  border: 1px solid #000;
                  padding: 6px 12px;
                  font-size: 11px;
                  border-radius: 0;
                  cursor: pointer;
                  font-weight: 500;
                  transition: background 0.2s;
                ">💾 CSV 저장</button>` : ''}
              </div>
              <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(translation)}</div>
            </div>
          `;
        } else {
          initialHTML = `
            <div style="margin-bottom: 20px;">
              <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">원문</div>
              <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(text)}</div>
            </div>
            <div style="padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">번역</div>
                ${showSaveButton ? `<button class="vopet-save-to-file-btn" data-word="${escapeHtml(text)}" data-translation="${escapeHtml(translation)}" data-furigana="" style="
                  background: #fff;
                  color: #000;
                  border: 1px solid #000;
                  padding: 6px 12px;
                  font-size: 11px;
                  border-radius: 0;
                  cursor: pointer;
                  font-weight: 500;
                  transition: background 0.2s;
                ">💾 CSV 저장</button>` : ''}
              </div>
              <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(translation)}</div>
            </div>
          `;
        }
        
        if (hasSyncedFile && isNumbers) {
          initialHTML += `
            <div style="margin-top: 12px; text-align: center; padding: 8px; background: #f5f5f5; border: 1px solid #000; border-radius: 0;">
              <small style="color: #000; font-size: 11px;">Numbers 파일은 CSV로 변환 후 사용해주세요</small>
            </div>
          `;
        }
        
        resultDiv.innerHTML = initialHTML;
        
        // 저장 버튼 이벤트 리스너
        const saveButton = resultDiv.querySelector('.vopet-save-to-file-btn');
        if (saveButton) {
          // 호버 효과 (흑백 모노톤)
          saveButton.addEventListener('mouseenter', function() {
            this.style.background = '#000';
            this.style.color = '#fff';
          });
          saveButton.addEventListener('mouseleave', function() {
            this.style.background = '#fff';
            this.style.color = '#000';
          });
          
            // 클릭 이벤트
            saveButton.addEventListener('click', function(e) {
              e.stopPropagation();
              e.preventDefault();
              
              const word = this.getAttribute('data-word');
              const translation = this.getAttribute('data-translation');
              const furigana = this.getAttribute('data-furigana') || '';
              
              console.log('저장 버튼 클릭:', { word, translation, furigana });
              
              // 버튼 비활성화 (중복 클릭 방지)
              saveButton.disabled = true;
              saveButton.textContent = '저장 중...';
              saveButton.style.background = '#6c757d';
              
              // 타임아웃 설정 (10초 후 자동 복구)
              const timeoutId = setTimeout(() => {
                console.warn('저장 타임아웃 - 버튼 복구');
                saveButton.disabled = false;
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#fff';
                saveButton.style.color = '#000';
                alert('저장이 시간 초과되었습니다. 다시 시도해주세요.');
              }, 10000);
            
            // 저장 요청 - 직접 처리 (background script 우회)
            console.log('파일 저장 시작:', { word, translation });
            
            // chrome.storage에서 파일 정보 가져오기
            chrome.storage.local.get(['syncedFileName', 'syncedFileContent'], function(fileData) {
              console.log('파일 데이터:', fileData);
              
              if (!fileData.syncedFileName) {
                clearTimeout(timeoutId);
                saveButton.disabled = false;
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#fff';
                saveButton.style.color = '#000';
                alert('연동된 파일이 없습니다. 설정에서 파일을 선택해주세요.');
                return;
              }
              
              if (fileData.syncedFileName.endsWith('.numbers')) {
                clearTimeout(timeoutId);
                saveButton.disabled = false;
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#fff';
                saveButton.style.color = '#000';
                alert('Numbers 파일은 CSV로 내보낸 후 사용해주세요.');
                return;
              }
              
              if (!fileData.syncedFileContent) {
                clearTimeout(timeoutId);
                saveButton.disabled = false;
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#fff';
                saveButton.style.color = '#000';
                alert('파일 내용을 읽을 수 없습니다. 파일을 다시 선택해주세요.');
                return;
              }
              
              // CSV 처리
              let csvContent = fileData.syncedFileContent;
              
              // BOM 제거 (UTF-8 BOM: \uFEFF)
              if (csvContent && csvContent.length > 0 && csvContent.charCodeAt(0) === 0xFEFF) {
                csvContent = csvContent.slice(1);
              }
              
              // 앞뒤 공백 및 줄바꿈 제거
              csvContent = csvContent.trim();
              
              // 모든 줄을 분리
              const allLines = csvContent.split(/\r?\n/);
              
              // 빈 줄 제거하고 각 줄의 앞뒤 공백 제거
              const cleanLines = allLines
                .map(line => line.trim())
                .filter(line => line.length > 0);
              
              let hasHeader = false;
              let headerLine = '';
              let dataLines = [];
              
              if (cleanLines.length === 0) {
                // 완전히 빈 파일인 경우
                headerLine = '순서,단어,발음,뜻';
                hasHeader = true;
              } else {
                // 첫 줄이 헤더인지 확인
                const firstLine = cleanLines[0].toLowerCase();
                hasHeader = firstLine.includes('순서') || firstLine.includes('단어') || firstLine.includes('뜻') || firstLine.includes('발음') || firstLine.includes('후리가나');
                
                if (hasHeader) {
                  headerLine = cleanLines[0];
                  // 기존 헤더에 발음 컬럼이 없으면 추가
                  if (!firstLine.includes('발음') && !firstLine.includes('후리가나')) {
                    // 기존 헤더 구조에 따라 발음 컬럼 추가
                    // "순서,단어,뜻" -> "순서,단어,발음,뜻"
                    const headerParts = headerLine.split(',');
                    if (headerParts.length === 3) {
                      headerParts.splice(2, 0, '발음');
                      headerLine = headerParts.join(',');
                    }
                  }
                  dataLines = cleanLines.slice(1);
                } else {
                  // 헤더가 없으면 추가
                  headerLine = '순서,단어,발음,뜻';
                  dataLines = cleanLines;
                  hasHeader = true;
                }
              }
              
              // CSV 필드 이스케이프
              function escapeCsvField(field) {
                if (!field) return '';
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                  return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
              }
              
              // 순서 번호 계산: 기존 데이터에서 가장 큰 번호 찾기
              let maxNumber = 0;
              dataLines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                  // 첫 번째 필드(순서 번호) 추출
                  const match = trimmedLine.match(/^(\d+),/);
                  if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNumber) {
                      maxNumber = num;
                    }
                  }
                }
              });
              
              // 새 순서 번호는 기존 최대값 + 1 (데이터가 없으면 1부터 시작)
              const newLineNumber = maxNumber + 1;
              
              // 기존 데이터가 3컬럼 형식이면 발음 컬럼 추가 필요
              // 기존 데이터 형식 확인 (첫 번째 데이터 라인으로)
              if (dataLines.length > 0) {
                const firstDataLine = dataLines[0].trim();
                // CSV 파싱: 쉼표로 분리 (큰따옴표 안의 쉼표는 무시)
                const fields = firstDataLine.match(/("(?:[^"]|"")*"|[^,]+)(?=\s*,|\s*$)/g);
                if (fields && fields.length === 3) {
                  // 기존이 3컬럼이면 모든 데이터에 빈 발음 컬럼 추가
                  dataLines = dataLines.map(line => {
                    const lineFields = line.match(/("(?:[^"]|"")*"|[^,]+)(?=\s*,|\s*$)/g);
                    if (lineFields && lineFields.length === 3) {
                      lineFields.splice(2, 0, '""');
                      return lineFields.join(',');
                    }
                    return line;
                  });
                }
              }
              
              const newLine = `${newLineNumber},"${escapeCsvField(word)}","${escapeCsvField(furigana)}","${escapeCsvField(translation)}"`;
              
              // 새 데이터 추가
              dataLines.push(newLine);
              
              // CSV 재구성 (헤더 + 데이터, 빈 줄 없이)
              csvContent = headerLine;
              if (dataLines.length > 0) {
                csvContent += '\n' + dataLines.join('\n');
              }
              
              // 파일 내용 업데이트
              chrome.storage.local.set({ syncedFileContent: csvContent }, function() {
                console.log('CSV 내용 저장 완료, 파일 핸들 찾는 중...');
                
                // IndexedDB에서 파일 핸들 가져오기
                const dbName = 'vopet_file_handles';
                const request = indexedDB.open(dbName, 1);
                
                request.onerror = () => {
                  console.error('IndexedDB 열기 오류:', request.error);
                  clearTimeout(timeoutId);
                  saveButton.disabled = false;
                  saveButton.textContent = '💾 저장';
                  saveButton.style.background = '#fff';
                  saveButton.style.color = '#000';
                  alert('파일 저장 중 오류가 발생했습니다: ' + request.error.message);
                };
                
                request.onupgradeneeded = (event) => {
                  const db = event.target.result;
                  if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                  }
                };
                
                request.onsuccess = async () => {
                  console.log('IndexedDB 열기 성공');
                  const db = request.result;
                  
                  try {
                    // object store가 존재하는지 확인
                    if (!db.objectStoreNames.contains('fileHandles')) {
                      console.warn('fileHandles object store가 없습니다. 데이터베이스를 재생성합니다.');
                      db.close();
                      // 데이터베이스 삭제 후 다시 생성
                      const deleteRequest = indexedDB.deleteDatabase(dbName);
                      deleteRequest.onsuccess = () => {
                        console.log('데이터베이스 삭제 완료, 재생성 중...');
                        const recreateRequest = indexedDB.open(dbName, 1);
                        recreateRequest.onupgradeneeded = (event) => {
                          const newDb = event.target.result;
                          if (!newDb.objectStoreNames.contains('fileHandles')) {
                            newDb.createObjectStore('fileHandles', { keyPath: 'id' });
                          }
                        };
                        recreateRequest.onsuccess = () => {
                          const newDb = recreateRequest.result;
                          const transaction = newDb.transaction(['fileHandles'], 'readonly');
                          const store = transaction.objectStore('fileHandles');
                          const getRequest = store.get('current');
                          processFileHandleRequest(getRequest, newDb, csvContent, fileData, saveButton, timeoutId);
                        };
                        recreateRequest.onerror = () => {
                          console.error('데이터베이스 재생성 오류:', recreateRequest.error);
                          clearTimeout(timeoutId);
                          saveButton.disabled = false;
                          saveButton.textContent = '💾 저장';
                          saveButton.style.background = '#fff';
                          saveButton.style.color = '#000';
                          alert('파일 저장 중 오류가 발생했습니다: ' + recreateRequest.error.message);
                        };
                      };
                      deleteRequest.onerror = () => {
                        console.error('데이터베이스 삭제 오류:', deleteRequest.error);
                        clearTimeout(timeoutId);
                        saveButton.disabled = false;
                        saveButton.textContent = '💾 저장';
                        saveButton.style.background = '#fff';
                        saveButton.style.color = '#000';
                        alert('파일 저장 중 오류가 발생했습니다: ' + deleteRequest.error.message);
                      };
                      return;
                    }
                    
                    const transaction = db.transaction(['fileHandles'], 'readonly');
                    const store = transaction.objectStore('fileHandles');
                    const getRequest = store.get('current');
                    
                    processFileHandleRequest(getRequest, db, csvContent, fileData, saveButton, timeoutId);
                  } catch (error) {
                    console.error('트랜잭션 오류:', error);
                    clearTimeout(timeoutId);
                    saveButton.disabled = false;
                    saveButton.textContent = '💾 저장';
                    saveButton.style.background = '#fff';
                    saveButton.style.color = '#000';
                    alert('파일 저장 중 오류가 발생했습니다: ' + error.message);
                  }
                };
              });
            });
            
            // 타임아웃 ID를 버튼에 저장 (나중에 clearTimeout 사용)
            saveButton._timeoutId = timeoutId;
          });
        }
      });
      
      // 번역 기록 저장 (한 번만)
      saveTranslationToChat(text, translation, targetLanguage, translatorService, sourceLang);
    }
  } catch (error) {
    console.error('번역 오류:', error);
    console.error('에러 상세:', {
      message: error.message,
      stack: error.stack,
      text: text,
      currentPopup: !!currentPopup
    });
    
    const resultDiv = currentPopup?.querySelector('.vopet-result');
    const loadingDiv = currentPopup?.querySelector('.vopet-loading');
    
    if (resultDiv && loadingDiv) {
      loadingDiv.style.display = 'none';
      resultDiv.style.display = 'block';
      // 에러 메시지를 사용자 친화적으로 표시
      let errorMessage = error.message || '알 수 없는 오류';
      if (error.message && error.message.includes('Background Script')) {
        errorMessage = error.message.replace(/\n/g, '<br>');
      }
      
      resultDiv.innerHTML = `
        <div class="vopet-error">해석을 불러올 수 없습니다</div>
        <div style="font-size: 11px; color: #999; margin-top: 5px; white-space: pre-line;">${escapeHtml(errorMessage)}</div>
      `;
    }
  }
}

// DeepL API 사용 (무료 플랜: 월 50만 자) - Background Script를 통해 호출 (CORS 문제 해결)
async function translateWithDeepL(text, targetLanguage, apiKey) {
  try {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('DeepL API 키가 입력되지 않았습니다');
    }
    
    // 같은 언어면 번역하지 않음 (언어 감지)
    const sourceLang = detectLanguage(text);
    const deepLLangMap = {
      'ko': 'KO',
      'en': 'EN',
      'ja': 'JA',
      'zh': 'ZH'
    };
    const targetLang = deepLLangMap[targetLanguage] || 'KO';
    const sourceLangCode = deepLLangMap[sourceLang] || 'AUTO';
    
    if (sourceLang === targetLanguage && sourceLangCode !== 'AUTO') {
      return `${text} (이미 ${targetLang === 'KO' ? '한국어' : targetLang === 'EN' ? '영어' : targetLang === 'JA' ? '일본어' : '중국어'}입니다)`;
    }
    
    // Background Script를 통해 API 호출 (CORS 문제 해결)
    return new Promise((resolve, reject) => {
      // Background Script 연결 확인 및 활성화
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        reject(new Error('Chrome Runtime API를 사용할 수 없습니다. 확장 프로그램이 제대로 로드되었는지 확인하세요.'));
        return;
      }
      
      // Background Script 존재 확인 및 깨우기
      const waitForBackground = (retries = 10) => {
        return new Promise((resolveCheck, rejectCheck) => {
          chrome.runtime.sendMessage({ action: 'ping' }, (pingResponse) => {
            if (!chrome.runtime.lastError) {
              resolveCheck(true);
            } else {
              if (retries > 0) {
                setTimeout(() => waitForBackground(retries - 1).then(resolveCheck).catch(rejectCheck), 200);
              } else {
                console.error('❌ Background Script 연결 실패');
                rejectCheck(new Error('Background Script를 시작할 수 없습니다. 확장 프로그램을 완전히 재로드해주세요:\n1. chrome://extensions/ 열기\n2. VoPet 확장 프로그램 찾기\n3. 확장 프로그램 끄기 → 켜기\n4. 페이지 새로고침'));
              }
            }
          });
        });
      };
      
      waitForBackground().then(() => {
        // 소스 언어 감지 결과도 함께 전달
        chrome.runtime.sendMessage({
          action: 'translate',
          translatorService: 'deepl',
          text: text,
          targetLanguage: targetLanguage,
          sourceLanguage: sourceLang, // 감지된 소스 언어 전달
          apiKey: apiKey
        }, (response) => {
          if (chrome.runtime.lastError) {
            const errorMessage = chrome.runtime.lastError.message;
            console.error('❌ 번역 요청 실패:', errorMessage);
            reject(new Error(`Background Script 통신 오류: ${errorMessage}\n\n해결 방법:\n1. chrome://extensions/ 에서 확장 프로그램 재로드\n2. 페이지 완전히 새로고침 (Cmd+Shift+R 또는 Ctrl+Shift+R)`));
            return;
          }
          
          if (!response) {
            console.error('❌ 응답이 없습니다');
            reject(new Error('Background Script에서 응답을 받지 못했습니다.\n확장 프로그램을 재로드하고 페이지를 새로고침해주세요.'));
            return;
          }
          
          if (response && response.success) {
            resolve(response.translation);
          } else {
            console.error('❌ DeepL 번역 실패:', response?.error);
            reject(new Error(response?.error || '번역 실패'));
          }
        });
      }).catch((checkError) => {
        reject(checkError);
      });
    });
  } catch (error) {
    console.error('DeepL API 오류:', error);
    throw error;
  }
}

// Google Translate API 사용 (유료) - Background Script를 통해 호출
async function translateWithGoogleAPI(text, targetLanguage, apiKey) {
  try {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('Google Translate API 키가 입력되지 않았습니다');
    }
    
    // Background Script를 통해 API 호출
    return new Promise((resolve, reject) => {
      // Background Script 존재 확인 및 깨우기
      const waitForBackground = (retries = 10) => {
        return new Promise((resolveCheck, rejectCheck) => {
          chrome.runtime.sendMessage({ action: 'ping' }, (pingResponse) => {
            if (!chrome.runtime.lastError) {
              resolveCheck(true);
            } else {
              if (retries > 0) {
                setTimeout(() => waitForBackground(retries - 1).then(resolveCheck).catch(rejectCheck), 200);
              } else {
                console.error('❌ Background Script 연결 실패');
                rejectCheck(new Error('Background Script를 시작할 수 없습니다. 확장 프로그램을 완전히 재로드해주세요.'));
              }
            }
          });
        });
      };
      
      waitForBackground().then(() => {
        chrome.runtime.sendMessage({
          action: 'translate',
          translatorService: 'google',
          text: text,
          targetLanguage: targetLanguage,
          apiKey: apiKey
        }, (response) => {
          if (chrome.runtime.lastError) {
            const errorMessage = chrome.runtime.lastError.message;
            console.error('❌ 번역 요청 실패:', errorMessage);
            reject(new Error(`Background Script 통신 오류: ${errorMessage}`));
            return;
          }
          
          if (!response) {
            console.error('❌ 응답이 없습니다');
            reject(new Error('Background Script에서 응답을 받지 못했습니다'));
            return;
          }
          
          if (response && response.success) {
            resolve(response.translation);
          } else {
            console.error('❌ Google Translate 번역 실패:', response?.error);
            reject(new Error(response?.error || '번역 실패'));
          }
        });
      }).catch((checkError) => {
        reject(checkError);
      });
    });
  } catch (error) {
    console.error('Google Translate API 오류:', error);
    throw error;
  }
}

// Google Translate 무료 API 사용 (API 키 없이)
async function translateWithGoogleFree(text, targetLanguage) {
  try {
    // 언어 코드 매핑
    const languageMap = {
      'ko': 'ko',
      'en': 'en',
      'ja': 'ja',
      'zh': 'zh-CN'
    };
    
    const targetLang = languageMap[targetLanguage] || 'ko';
    const sourceLang = detectLanguage(text);
    
    // 같은 언어면 번역하지 않음
    if (sourceLang === targetLang) {
      return `${text} (이미 ${targetLang === 'ko' ? '한국어' : targetLang === 'en' ? '영어' : targetLang === 'ja' ? '일본어' : '중국어'}입니다)`;
    }
    
    // Google Translate 무료 API 호출 (후리가나 정보 포함)
    const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(apiUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const translation = data[0][0][0];
        return translation;
      } else {
        throw new Error('번역 결과를 가져올 수 없습니다');
      }
    } else {
      throw new Error('번역 API 호출에 실패했습니다');
    }
  } catch (error) {
    throw error;
  }
}

// 언어 감지 함수
function detectLanguage(text) {
  // 한글 감지
  if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
    return 'ko';
  }
  // 일본어 감지 (히라가나, 가타카나, 한자 포함)
  // 히라가나: \u3040-\u309F
  // 가타카나: \u30A0-\u30FF
  // 일본어 한자도 포함
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    // 히라가나나 가타카나가 있으면 일본어로 확실
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return 'ja';
    }
    // 한자만 있는 경우, 히라가나/가타카나가 함께 있으면 일본어
    // 단독 한자는 중국어일 수도 있지만, 일본어로 우선 처리
    return 'ja';
  }
  // 중국어 감지 (한자만 있고 히라가나/가타카나가 없는 경우)
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'zh';
  }
  // 기본적으로 영어로 간주
  return 'en';
}

// 한자가 포함된 짧은 단어인지 확인하는 함수
// 한자가 포함된 텍스트인지 확인하는 함수 (제한 없음)
// kuromoji.js는 로컬에서 무제한으로 처리 가능하므로 길이/비율 제한 제거
function isShortKanjiWord(text) {
  // 한자가 포함되어 있는지만 확인
  // kuromoji.js는 길이 제한 없이 모든 일본어 텍스트를 처리 가능
  return /[\u4e00-\u9fff]/.test(text);
}

// 후리가나 가져오기 함수
// kuromoji.js를 우선 사용하고, 실패 시 Google Translate API를 fallback으로 사용
async function getFurigana(text, sourceLang) {
  try {
    // 한자가 포함되어 있지 않으면 후리가나 불필요
    if (!/[\u4e00-\u9fff]/.test(text)) {
      return null;
    }
    
    // 1단계: kuromoji.js를 사용한 형태소 분석 시도
    console.log('🔵 [후리가나] 추출 시도:', text);
    try {
      // 전역 함수 확인 (window 객체 또는 직접 전역)
      console.log('🔵 [후리가나] 함수 확인 중...');
      console.log('🔵 [후리가나] typeof getHiraganaReading:', typeof getHiraganaReading);
      console.log('🔵 [후리가나] typeof window:', typeof window);
      console.log('🔵 [후리가나] window.getHiraganaReading:', typeof window !== 'undefined' ? typeof window.getHiraganaReading : 'window 없음');
      
      const getHiraganaFunc = typeof getHiraganaReading !== 'undefined' 
        ? getHiraganaReading 
        : (typeof window !== 'undefined' && window.getHiraganaReading);
      
      console.log('🔵 [후리가나] getHiraganaFunc:', typeof getHiraganaFunc);
      
      if (getHiraganaFunc && typeof getHiraganaFunc === 'function') {
        console.log('🔵 [후리가나] 함수 호출 중...');
        const hiragana = await getHiraganaFunc(text);
        console.log('🔵 [후리가나] 함수 결과:', hiragana);
        if (hiragana && hiragana !== text) {
          console.log('✅ [후리가나] kuromoji.js로 히라가나 추출 성공:', hiragana);
          return `[${hiragana}]`;
        } else {
          console.log('⚠️ [후리가나] 결과가 null이거나 원본과 동일함');
        }
      } else {
        console.warn('❌ [후리가나] getHiraganaReading 함수를 찾을 수 없음');
        console.warn('❌ [후리가나] japaneseMorphology.js가 로드되었는지 확인 필요');
      }
    } catch (kuromojiError) {
      // kuromoji.js가 로드되지 않았거나 오류가 발생한 경우
      console.error('❌ [후리가나] kuromoji.js 사용 불가, Google Translate API로 fallback:', kuromojiError);
      console.error('❌ [후리가나] 에러 스택:', kuromojiError.stack);
    }
    
    // 2단계: Google Translate API fallback (기존 방식)
    const furiganaUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=ja&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
    const response = await fetch(furiganaUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      // 후리가나 정보 추출 시도 (여러 가능한 경로 확인)
      let furigana = null;
      
      // Google Translate API 응답 구조:
      // data[0]: 번역 배열 [[번역, 원본, ...], ...]
      // data[1]: 로마자 발음 배열 (dt=rm 사용 시) [[로마자, 원본, ...], ...]
      // data[2]: 언어 감지 정보
      
      // 방법 1: data[1] (로마자 발음 배열) 확인
      if (data && Array.isArray(data[1]) && data[1].length > 0) {
        // data[1]의 첫 번째 항목이 로마자 발음 정보를 포함할 수 있음
        for (let i = 0; i < data[1].length; i++) {
          const item = data[1][i];
          
          if (Array.isArray(item) && item.length > 0) {
            // item[0]이 로마자 발음일 가능성
            const romaji = item[0];
            if (romaji && typeof romaji === 'string' && romaji.trim().length > 0) {
              // 로마자 발음 표시 (히라가나 변환은 kuromoji.js에서 처리)
              furigana = `[${romaji}]`; // 로마자 발음 표시
              break;
            }
          } else if (typeof item === 'string' && item.trim().length > 0) {
            // 직접 문자열인 경우
            furigana = `[${item}]`;
            break;
          }
        }
      }
      
      // 방법 2: data[0]에서 추가 발음 정보 확인 (일부 응답 구조)
      if (!furigana && data && Array.isArray(data[0]) && data[0].length > 0) {
        const firstItem = data[0][0];
        
        if (Array.isArray(firstItem) && firstItem.length > 5) {
          // data[0][0][5] 또는 다른 인덱스에 발음 정보가 있을 수 있음
          for (let i = 0; i < firstItem.length; i++) {
            const field = firstItem[i];
            if (typeof field === 'string' && field.length > 0 && field !== text) {
              // 발음으로 보이는 필드 확인 (로마자 패턴)
              if (/^[a-zA-Z\s'-]+$/.test(field)) {
                furigana = `[${field}]`;
                break;
              }
            }
          }
        }
      }
      
      // 방법 3: data[5] 또는 다른 배열 인덱스 확인
      if (!furigana && data && data.length > 5) {
        if (Array.isArray(data[5]) && data[5].length > 0) {
          const altPron = data[5][0];
          if (Array.isArray(altPron) && altPron.length > 0 && typeof altPron[0] === 'string') {
            furigana = `[${altPron[0]}]`;
          }
        }
      }
      
      if (furigana) {
        return furigana;
      } else {
        return null;
      }
    } else {
      return null;
    }
    
  } catch (error) {
    console.error('후리가나 API 오류:', error);
    console.error('에러 스택:', error.stack);
    return null;
  }
}


// HTML 이스케이프 함수 (먼저 정의하여 호이스팅 문제 방지)
function escapeHtml(text) {
  if (!text && text !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// 번역 결과 캐시 (성능 향상)
const translationCache = new Map();
const CACHE_MAX_SIZE = 100;

// 번역 문장에서 단어 추출하는 함수 (파파고 방식: 중요한 단어만 추출)
function extractWords(text) {
  if (!text) {
    return [];
  }
  
  try {
    const lang = detectLanguage(text);
    const textStr = String(text).trim();
    let words = [];
    
    // 너무 짧은 텍스트는 단어 추출 불필요
    if (textStr.length <= 2) {
      return [];
    }
    
    if (lang === 'ja') {
      // 일본어: 한자 포함 단어 우선 추출 (파파고 방식)
      // 조사는 제외하고 의미 있는 단어만 추출
      
      // 1. 한자 포함 단어 우선 (명사, 동사 등)
      const kanjiWordPattern = /[\u4E00-\u9FAF]+[\u3040-\u309F\u30A0-\u30FF]*|[\u3040-\u309F\u30A0-\u30FF]*[\u4E00-\u9FAF]+/g;
      const kanjiMatches = textStr.match(kanjiWordPattern);
      
      if (kanjiMatches) {
        words = kanjiMatches
          .map(word => word.trim())
          .filter(word => {
            // 조사 패턴 제외
            if (/^[はがをにでとからまでよりへてでのですますだ]+$/.test(word)) {
              return false;
            }
            // 의미 있는 단어만 (최소 2자 이상, 또는 한자 포함)
            return word.length >= 2 || /[\u4E00-\u9FAF]/.test(word);
          });
      }
      
      // 2. 조사 앞 단어만 추가 (한자 포함 단어가 없을 경우)
      if (words.length === 0) {
        const wordBeforeParticle = /([\u4E00-\u9FAF]+[\u3040-\u309F\u30A0-\u30FF]*|[\u3040-\u309F\u30A0-\u30FF]+[\u4E00-\u9FAF]*|[\u4E00-\u9FAF]+)(?=[はがをにでとからまでよりへてでのですますだ])/g;
        const beforeMatches = textStr.match(wordBeforeParticle);
        if (beforeMatches) {
          words = beforeMatches.filter(word => word.length >= 2 && !/^[はがをにでとからまでよりへてでのですますだ]+$/.test(word));
        }
      }
      
      // 3. 짧은 단일 단어인 경우 (한자 포함 단어)
      if (textStr.length <= 5 && /[\u4E00-\u9FAF]/.test(textStr) && !/[はがをにでとからまでよりへてでのですますだ]/.test(textStr)) {
        if (words.length === 0 || !words.includes(textStr)) {
          words = [textStr, ...words];
        }
      }
      
    } else if (lang === 'ko') {
      // 한국어: 조사/어미 제거하고 명사/동사 중심 추출
      
      // 일반 조사 제거
      const koreanParticles = /([은는이가을를에게에서로으로와과의도만까지밖에부터처럼같이]+)/g;
      let cleanedText = textStr.replace(koreanParticles, ' ');
      
      // 어미 제거 (일부만, 너무 많이 제거하면 안 됨)
      const koreanEndings = /(합니다|해요|입니다|이에요|예요|이다|였습니다|했어요|했어|하는|한|하는|된|되는)$/g;
      cleanedText = cleanedText.replace(koreanEndings, ' ');
      
      // 한글 단어 추출 (최소 2자)
      const wordPattern = /([가-힣]{2,})/g;
      const matches = cleanedText.match(wordPattern);
      
      if (matches) {
        words = matches
          .map(word => word.trim())
          .filter(word => word.length >= 2);
      }
      
      // 짧은 단일 단어인 경우
      if (textStr.length <= 4 && /^[가-힣]+$/.test(textStr) && !koreanParticles.test(textStr)) {
        if (words.length === 0 || !words.includes(textStr)) {
          words = [textStr, ...words];
        }
      }
      
    } else {
      // 영어, 중국어 등: 공백으로 분리, 불필요한 단어 필터링
      const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as', 'and', 'or', 'but', 'if', 'it', 'this', 'that', 'these', 'those']);
      
      words = textStr
        .split(/[\s\.,!?。、！？\-]+/)
        .map(word => word.trim().toLowerCase())
        .filter(word => {
          if (word.length < 2) return false;
          if (lang === 'en' && stopWords.has(word)) return false;
          return /^[a-zA-Z가-힣\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]+$/.test(word);
        });
    }
    
    // 필터링: 중복 제거 및 최소 길이 확인
    const seen = new Set();
    const uniqueWords = [];
    for (const word of words) {
      const trimmed = word.trim();
      // 일본어는 1글자도 허용 (한자 등), 다른 언어는 최소 2자
      if (trimmed && (lang === 'ja' || trimmed.length >= 2) && !seen.has(trimmed)) {
        // 불필요한 단어 필터링 (조사만 있는 경우 제외)
        if (lang === 'ja' && /^[はがをにでとからまでよりへてでのですますだ]+$/.test(trimmed)) continue;
        
        seen.add(trimmed);
        uniqueWords.push(trimmed);
      }
    }
    
    // 최대 10개 단어 반환 (원래대로 많이 표시)
    return uniqueWords.slice(0, 10);
    
  } catch (error) {
    console.error('단어 추출 중 오류:', error);
    return [];
  }
}

// 단어별 번역 표시 함수 (성능 최적화)
async function displayWordTranslations(resultDiv, words, targetLanguage, apiKey, originalText, translatorService) {
  const wordTranslationsDiv = resultDiv.querySelector('.vopet-word-translations');
  
  if (!wordTranslationsDiv || words.length === 0) {
    if (wordTranslationsDiv) {
      wordTranslationsDiv.textContent = '번역할 단어가 없습니다';
    }
    return;
  }
  
  try {
    const sourceLang = detectLanguage(originalText);
    
    // 같은 언어면 단어별 번역 불필요
    if (sourceLang === targetLanguage) {
      wordTranslationsDiv.textContent = '같은 언어입니다';
      return;
    }
    
    // 저장된 설정 가져오기 (translatorService)
    const result = await chrome.storage.sync.get(['translatorService']).catch(() => ({}));
    const translatorService = result.translatorService || 'google-free';
    
    // 캐시 사용 및 병렬 번역 (최대 10개 단어)
    const wordsToTranslate = words.slice(0, 10);
    const translationPromises = wordsToTranslate.map(word => 
      translateSingleWordCached(word, targetLanguage, apiKey, translatorService)
    );
    
    const translations = await Promise.all(translationPromises);
    
    // 후리가나는 중요한 단어만 (한자 포함 단어)
    const furiganaPromises = wordsToTranslate.map(async (word) => {
      if (sourceLang === 'ja' && isShortKanjiWord(word)) {
        return await getFurigana(word, 'ja');
      }
      return null;
    });
    
    const furiganas = await Promise.all(furiganaPromises);
    
    // 단어-번역-후리가나 쌍 생성
    const wordTranslationPairs = wordsToTranslate
      .map((word, index) => ({
        word: word,
        translation: translations[index],
        furigana: furiganas[index]
      }))
      .filter(({ word, translation }) => {
        // 같은 단어이거나 의미 없는 번역 제외
        return word !== translation && translation && translation.trim().length > 0;
      });
    
    // 표시할 단어가 없으면 메시지 표시
    if (wordTranslationPairs.length === 0) {
      wordTranslationsDiv.textContent = '번역할 단어가 없습니다';
      return;
    }
    
    // HTML 생성
    const wordItemsHTML = wordTranslationPairs
      .map(({ word, translation, furigana }) => {
        return `<span class="vopet-word-item" data-word="${escapeHtml(word)}" data-translation="${escapeHtml(translation)}" style="cursor: pointer;">
          <div class="vopet-word-content">
            <span class="vopet-word-original">${escapeHtml(word)}</span>
            <span class="vopet-word-separator">→</span>
            <span class="vopet-word-translated">${escapeHtml(translation)}</span>
            ${furigana ? `<small class="furigana-inline">${escapeHtml(furigana)}</small>` : ''}
          </div>
        </span>`;
      })
      .join(' ');
    
    wordTranslationsDiv.innerHTML = wordItemsHTML;
    
    
  } catch (error) {
    console.error('단어별 번역 오류:', error);
    wordTranslationsDiv.textContent = '개별 번역을 불러올 수 없습니다';
  }
}

// 캐시를 사용한 단일 단어 번역 함수
async function translateSingleWordCached(word, targetLanguage, apiKey, translatorService) {
  // 캐시 키 생성
  const cacheKey = `${word}_${targetLanguage}_${apiKey || 'free'}_${translatorService || 'google-free'}`;
  
  // 캐시 확인
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  // 캐시가 없으면 번역 수행
  const translation = await translateSingleWord(word, targetLanguage, apiKey, translatorService);
  
  // 캐시 저장 (크기 제한)
  if (translationCache.size >= CACHE_MAX_SIZE) {
    // 가장 오래된 항목 제거 (FIFO)
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(cacheKey, translation);
  
  return translation;
}

// 단일 단어 번역 함수
async function translateSingleWord(word, targetLanguage, apiKey, translatorService) {
  try {
    // 원본 단어의 언어 감지
    const sourceLang = detectLanguage(word);
    
    // 같은 언어면 원래 단어 반환
    if (sourceLang === targetLanguage) {
      return word;
    }
    
    // 번역 수행 (선택된 서비스 사용)
    let translation = '';
    if (translatorService === 'deepl' && apiKey) {
      translation = await translateWithDeepL(word, targetLanguage, apiKey);
    } else if (translatorService === 'google' && apiKey) {
      translation = await translateWithGoogleAPI(word, targetLanguage, apiKey);
    } else {
      translation = await translateWithGoogleFree(word, targetLanguage);
    }
    
    return translation || word;
  } catch (error) {
    console.error(`단어 "${word}" 번역 오류:`, error);
    return word; // 실패 시 원래 단어 반환
  }
}

// escapeHtml 함수는 이미 위에서 정의됨

// 단어 클릭 이벤트 연결 (더 이상 필요 없음 - 단어별 번역이 자동으로 표시됨)

// 단어별 번역 툴팁 표시
let currentWordTooltip = null;
async function showWordTranslationTooltip(element, word) {
  // 기존 툴팁 제거
  if (currentWordTooltip) {
    currentWordTooltip.remove();
    currentWordTooltip = null;
  }
  
  // 툴팁 생성
  const tooltip = document.createElement('div');
  tooltip.id = 'vopet-word-tooltip';
  tooltip.innerHTML = `<div class="vopet-tooltip-content">번역 중...</div>`;
  
  // 위치 계산
  const rect = element.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.top - 50}px`;
  tooltip.style.zIndex = '9999999';
  
  document.body.appendChild(tooltip);
  currentWordTooltip = tooltip;
  
  // 단어 번역
  try {
    // Extension context 유효성 확인
    if (!isExtensionContextValid()) {
      tooltip.querySelector('.vopet-tooltip-content').textContent = '확장 프로그램이 다시 로드되었습니다';
      return;
    }
    
    const result = await chrome.storage.sync.get(['language', 'apiKey']).catch(err => {
      if (err.message && err.message.includes('Extension context invalidated')) {
        tooltip.querySelector('.vopet-tooltip-content').textContent = '확장 프로그램이 다시 로드되었습니다';
        throw err;
      }
      throw err;
    });
    const targetLanguage = result.language || 'ko';
    const apiKey = result.apiKey;
    
    let translation = '';
    if (apiKey) {
      translation = await translateWithGoogleAPI(word, targetLanguage, apiKey);
  } else {
      translation = await translateWithGoogleFree(word, targetLanguage);
    }
    
    tooltip.querySelector('.vopet-tooltip-content').textContent = translation;
    
    // 3초 후 자동 제거
    setTimeout(() => {
      if (currentWordTooltip === tooltip) {
        tooltip.remove();
        currentWordTooltip = null;
      }
    }, 3000);
    
  } catch (error) {
    console.error('단어 번역 오류:', error);
    tooltip.querySelector('.vopet-tooltip-content').textContent = '번역 불가';
    
    setTimeout(() => {
      if (currentWordTooltip === tooltip) {
        tooltip.remove();
        currentWordTooltip = null;
      }
    }, 2000);
  }
}


// 팝업 외부 클릭 시 닫기
document.addEventListener('click', function(event) {
  // 단어 툴팁은 유지
  if (currentWordTooltip && currentWordTooltip.contains(event.target)) {
    return;
  }
  
  // 단어 세그먼트 클릭은 팝업 닫지 않음
  if (event.target.classList.contains('vopet-word-segment')) {
    return;
  }
  
  if (currentPopup && !currentPopup.contains(event.target)) {
    currentPopup.remove();
    currentPopup = null;
  }
  
  // 단어 툴팁 제거
  if (currentWordTooltip && !currentWordTooltip.contains(event.target)) {
    currentWordTooltip.remove();
    currentWordTooltip = null;
  }
});
// ESC 키로 팝업 닫기
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' && currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
});

// 팝업에서 메시지 수신
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getStatus') {
    sendResponse({active: isActive});
  } else if (request.action === 'toggle') {
    isActive = !isActive;
    if (!isActive && currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }
    sendResponse({active: isActive});
  } else if (request.action === 'startCaptureMode') {
    // 설정에서 선택한 OCR 언어로 바로 캡처 모드 시작
    if (window.vopetScreenshotTranslation && window.vopetScreenshotTranslation.startCaptureMode) {
      window.vopetScreenshotTranslation.startCaptureMode(request.imageDataUrl);
      sendResponse({success: true});
    } else {
      sendResponse({success: false, error: '화면 캡처 번역 기능이 로드되지 않았습니다. 페이지를 새로고침해주세요.'});
    }
  } else if (request.action === 'downloadUpdatedFile') {
    // 업데이트된 파일 다운로드
    const link = document.createElement('a');
    link.href = request.fileUrl;
    link.download = request.fileName;
    link.click();
    
    setTimeout(() => {
      URL.revokeObjectURL(request.fileUrl);
    }, 100);
    
    sendResponse({ success: true });
  } else if (request.action === 'saveWordToFileResponse') {
    console.log('저장 응답 받음:', request);
    // 저장 결과 처리
    const saveButton = currentPopup?.querySelector('.vopet-save-to-file-btn');
    if (saveButton) {
      // 타임아웃 제거
      if (saveButton._timeoutId) {
        clearTimeout(saveButton._timeoutId);
        saveButton._timeoutId = null;
      }
      
      if (request.success) {
        // 버튼 텍스트 변경
        saveButton.textContent = '✓ 저장됨';
        saveButton.style.background = '#000';
        saveButton.style.color = '#fff';
        saveButton.disabled = false;
        
        setTimeout(() => {
          saveButton.textContent = '💾 저장';
          saveButton.style.background = '#fff';
          saveButton.style.color = '#000';
        }, 2000);
      } else {
        saveButton.disabled = false;
        saveButton.textContent = '💾 저장';
        saveButton.style.background = '#fff';
        saveButton.style.color = '#000';
        alert('저장 실패: ' + (request.error || '알 수 없는 오류'));
      }
    } else {
      console.warn('저장 버튼을 찾을 수 없습니다');
    }
    sendResponse({ success: true });
  }
});

// 번역 기록을 Chat에 저장하는 함수 (중복 방지)
let lastSavedTranslation = null;
let saveTranslationTimeout = null;

function saveTranslationToChat(original, translated, targetLanguage, translatorService, sourceLanguage) {
  try {
    // 중복 저장 방지: 같은 번역이 연속으로 들어오는 경우 무시
    const translationKey = `${original}_${translated}_${Date.now()}`;
    
    // 마지막 저장과 비교 (1초 이내 같은 번역이면 무시)
    if (lastSavedTranslation && 
        lastSavedTranslation.original === original && 
        lastSavedTranslation.translated === translated &&
        Date.now() - lastSavedTranslation.timestamp < 1000) {
      return; // 중복 저장 방지
    }
    
    // 타임아웃으로 중복 호출 방지
    if (saveTranslationTimeout) {
      clearTimeout(saveTranslationTimeout);
    }
    
    saveTranslationTimeout = setTimeout(function() {
      // 현재 시간 생성
      const now = new Date();
      const timestamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      // 번역 기록 객체 생성
      const translationRecord = {
        original: original,
        translated: translated,
        sourceLanguage: sourceLanguage || detectLanguage(original),
        targetLanguage: targetLanguage || 'ko',
        translatorService: translatorService || 'google-free',
        timestamp: timestamp
      };
      
      // 마지막 저장 기록 업데이트
      lastSavedTranslation = {
        original: original,
        translated: translated,
        timestamp: Date.now()
      };
      
      // 기존 번역 기록 불러오기
      chrome.storage.local.get(['translations'], function(result) {
        const translations = result.translations || [];
        
        // 중복 체크: 같은 원본과 번역이 이미 있는지 확인
        const isDuplicate = translations.some(t => 
          t.original === original && t.translated === translated
        );
        
        if (!isDuplicate) {
          // 새 번역 기록 추가 (최대 100개까지만 저장)
          translations.push(translationRecord);
          if (translations.length > 100) {
            translations.shift(); // 가장 오래된 기록 제거
          }
          
          // 저장
          chrome.storage.local.set({ translations: translations }, function() {
            // Chat 화면이 열려있으면 업데이트
            const chatList = document.getElementById('chat-translations-list');
            if (chatList) {
              // 기존 내용 제거하고 다시 로드
              chatList.innerHTML = '';
              if (typeof loadTranslations === 'function') {
                loadTranslations(chatList);
              } else if (typeof window.loadTranslations === 'function') {
                window.loadTranslations(chatList);
              }
            }
          });
        }
      });
    }, 100); // 100ms 지연으로 중복 호출 방지
  } catch (error) {
    console.error('번역 기록 저장 오류:', error);
  }
}
