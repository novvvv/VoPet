// Content Script - 웹페이지에서 실행되는 스크립트
let isActive = true;
let currentPopup = null;
let selectedText = '';
let isDragging = false;

// 강력한 디버깅과 실행 확인
// console.log('🐾 VoPet Content Script 로드됨!');

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

// console.log('VoPet 상태:', window.vopetStatus);

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
              console.log('Background Script 깨우기 실패:', error);
            }
          } else {
            console.log('✅ Background Script 활성화됨!', response);
          }
        });
      }
    } catch (error) {
      console.log('Background Script 깨우기 오류:', error);
    }
  };
  
  // 즉시 시도
  wakeUp();
  
  // 500ms 후에도 한 번 더 시도 (확실하게)
  setTimeout(wakeUp, 500);
  
  // 1초 후에도 한 번 더 시도
  setTimeout(wakeUp, 1000);
})();

// 드래그 시작 감지
document.addEventListener('mousedown', function(event) {
  isDragging = true;
  // console.log('마우스 다운 감지');
});

// 드래그 종료 감지
document.addEventListener('mouseup', function(event) {
  if (!isActive) {
    // console.log('VoPet 비활성화 상태');
    return;
  }
  
  if (!isDragging) return;
  
  // 약간의 지연을 두고 텍스트 선택 확인
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    // console.log('선택된 텍스트:', text);
    
    if (text && text.length > 0) {
      selectedText = text;
      // console.log('팝업 표시 시작:', text);
      showTranslationPopup(event, text);
    }
    
    isDragging = false;
  }, 100);
});

// 드래그 상태 추적
let dragStartPos = null;
let dragEndPos = null;

// 마우스 다운에서 드래그 시작 위치 기록
document.addEventListener('mousedown', function(e) {
  dragStartPos = { x: e.clientX, y: e.clientY };
  // console.log('드래그 시작 위치:', dragStartPos);
});

// 마우스 업에서 드래그 끝 위치 기록
document.addEventListener('mouseup', function(e) {
  dragEndPos = { x: e.clientX, y: e.clientY };
  // console.log('드래그 끝 위치:', dragEndPos);
  
  // 드래그가 끝난 후 정확한 단어만 선택하도록 처리
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0 && !currentPopup) {
      // 드래그 거리 확인
      if (dragStartPos && dragEndPos) {
        const deltaX = Math.abs(dragEndPos.x - dragStartPos.x);
        const deltaY = Math.abs(dragEndPos.y - dragStartPos.y);
        
        // 세로 드래그가 너무 크면 무시
        if (deltaY > 20) {
          // console.log('세로 드래그 너무 큼, 무시:', text);
          return;
        }
        
        // 가로 드래그가 너무 크면 무시
        if (deltaX > 200) {
          // console.log('가로 드래그 너무 큼, 무시:', text);
          return;
        }
      }
      
      // 텍스트에 줄바꿈이나 탭이 있는지 확인
      const hasLineBreaks = text.includes('\n') || text.includes('\t') || text.includes('\r');
      
      // 단일 단어만 처리
      if (!hasLineBreaks && text.length < 50 && text.split(' ').length <= 3) {
        // console.log('정확한 단어 선택 감지:', text);
        // 마우스 위치를 대략적으로 추정
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const mockEvent = {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          target: selection.anchorNode.parentElement
        };
        showTranslationPopup(mockEvent, text);
      } else {
        // console.log('잘못된 선택 무시:', text);
      }
    }
  }, 50);
});

// 텍스트 선택 이벤트 (비활성화 - mouseup에서 처리)
// document.addEventListener('selectionchange', function(event) {
//   // 이제 mouseup에서 처리하므로 비활성화
// });

// 팝업 표시 함수
function showTranslationPopup(event, text) {
  // console.log('팝업 표시 함수 호출됨:', text);
  
  // 기존 팝업 제거
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
  
  // 새 팝업 생성
  const popup = document.createElement('div');
  popup.id = 'vopet-translation-popup';
  
  popup.innerHTML = `
    <div class="vopet-popup-content">
      <div class="vopet-popup-header">
        <span class="vopet-word">${text}</span>
        <button class="vopet-close-btn">&times;</button>
      </div>
      <div class="vopet-popup-body">
        <div class="vopet-loading">해석 중...</div>
        <div class="vopet-result" style="display: none;"></div>
      </div>
    </div>
  `;
  
  // 팝업 위치 설정 (더 안전한 위치 계산)
  let x = event.clientX || window.innerWidth / 2;
  let y = event.clientY || window.innerHeight / 2;
  
  // 화면 밖으로 나가지 않도록 조정
  if (x > window.innerWidth - 300) x = window.innerWidth - 320;
  if (y < 100) y = 100;
  if (y > window.innerHeight - 200) y = window.innerHeight - 220;
  
  popup.style.position = 'fixed';
  popup.style.left = `${x}px`;
  popup.style.top = `${y - 100}px`;
  popup.style.zIndex = '999999';
  
  // console.log('팝업 DOM에 추가 중...');
  document.body.appendChild(popup);
  currentPopup = popup;
  // console.log('팝업 추가 완료');
  
  // 닫기 버튼 이벤트 (최강력한 방법)
  const closeBtn = popup.querySelector('.vopet-close-btn');
  if (closeBtn) {
    // 모든 이벤트 차단
    closeBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('닫기 버튼 클릭됨 - 최강력 제거');
      
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
      console.log('닫기 버튼 클릭됨 - 캡처 단계');
      
      if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
      }
      if (popup && popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, true);
  }
  
  // 팝업 클릭 시 상세 정보 표시 (닫기 버튼 제외)
  popup.addEventListener('click', function(e) {
    if (e.target.classList.contains('vopet-close-btn') || e.target.closest('.vopet-close-btn')) {
      return; // 닫기 버튼 클릭 시 아무것도 하지 않음
    }
    
    // 현재 팝업에서 번역 정보 가져오기
    const translationEl = popup.querySelector('.vopet-translation-full');
    const translation = translationEl ? translationEl.textContent : '';
    
    // translationData 구성 - 전체 문장 클릭 시
    const translationData = {
      translation: translation || '',
      examples: text || '' // 드래그한 전체 문장을 예문으로
    };
    
    window.detailWindow.open(text, translationData);
  });
  
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
    console.log('번역 설정:', { translatorService, hasApiKey: !!apiKey, text });
    
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
      console.log('Google Translate 무료 버전 사용');
      translation = await translateWithGoogleFree(text, targetLanguage);
    }
    
    // 일본어 관련 후리가나 확인 (한자가 포함된 짧은 단어만)
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
      
      // 먼저 전체 번역 문장 표시 (파파고 방식: 전체 번역 우선)
      let initialHTML = '';
      if (furigana) {
        initialHTML = `
          <div class="vopet-translation-full">${escapeHtml(translation)}</div>
          <small class="furigana">${escapeHtml(furigana)}</small>
          <div class="vopet-word-translations">개별 단어 번역 중...</div>
        `;
      } else {
        initialHTML = `
          <div class="vopet-translation-full">${escapeHtml(translation)}</div>
          <div class="vopet-word-translations">개별 단어 번역 중...</div>
        `;
      }
      resultDiv.innerHTML = initialHTML;
      
      // 원본 텍스트에서 단어를 추출하고 개별 번역 가져오기 (에러가 발생해도 메인 번역은 유지)
      try {
        const originalWords = extractWords(text);
        displayWordTranslations(resultDiv, originalWords, targetLanguage, apiKey, text, translatorService).catch(err => {
          console.error('단어별 번역 처리 오류:', err);
          const wordTranslationsDiv = resultDiv.querySelector('.vopet-word-translations');
          if (wordTranslationsDiv) {
            wordTranslationsDiv.textContent = '개별 번역을 불러올 수 없습니다';
          }
        });
      } catch (err) {
        console.error('단어 추출 오류:', err);
        const wordTranslationsDiv = resultDiv.querySelector('.vopet-word-translations');
        if (wordTranslationsDiv) {
          wordTranslationsDiv.textContent = '개별 번역을 불러올 수 없습니다';
        }
      }
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
    console.log('DeepL API 사용 (Background Script 통해):', text, '→', targetLanguage);
    
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
      console.log('Background Script로 메시지 전송 시작');
      
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
              console.log('✅ Background Script 활성화 확인!');
              resolveCheck(true);
            } else {
              if (retries > 0) {
                console.log(`Background Script 대기 중... (남은 시도: ${retries})`);
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
        // Background Script가 활성화된 후 번역 요청 전송
        console.log('번역 요청 전송 중...');
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
            console.log('✅ DeepL 번역 성공:', response.translation);
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
    console.log('Google Translate API 사용 (Background Script 통해):', text, '→', targetLanguage);
    
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
              console.log('✅ Background Script 활성화 확인!');
              resolveCheck(true);
            } else {
              if (retries > 0) {
                console.log(`Background Script 대기 중... (남은 시도: ${retries})`);
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
            console.log('✅ Google Translate 번역 성공:', response.translation);
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
    console.log('Google Translate 무료 API 사용:', text, '→', targetLanguage);
    
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
    console.log('Google API URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    console.log('Google API 응답 상태:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Google API 응답 데이터:', data);
      
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const translation = data[0][0][0];
        console.log('Google 번역 성공:', translation);
        return translation;
      } else {
        console.log('Google API 응답 형식 오류');
        throw new Error('번역 결과를 가져올 수 없습니다');
      }
    } else {
      console.log('Google API 실패');
      throw new Error('번역 API 호출에 실패했습니다');
    }
  } catch (error) {
    console.log('Google Translate 무료 API 오류:', error);
    throw error;
  }
}

// 언어 감지 함수
function detectLanguage(text) {
  // 한글 감지
  if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
    return 'ko';
  }
  // 일본어 감지
  if (/[ひらがなカタカナ一-龯]/.test(text)) {
    return 'ja';
  }
  // 중국어 감지
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'zh';
  }
  // 기본적으로 영어로 간주
  return 'en';
}

// 한자가 포함된 짧은 단어인지 확인하는 함수
function isShortKanjiWord(text) {
  // 너무 긴 텍스트는 제외 (10자 이상)
  if (text.length > 10) {
    return false;
  }
  
  // 한자가 포함되어 있는지 확인
  if (!/[\u4e00-\u9fff]/.test(text)) {
    return false;
  }
  
  // 히라가나나 가타카나가 너무 많이 포함된 경우 제외 (문장이 아닌 단어여야 함)
  const hiraganaKatakanaCount = (text.match(/[ひらがなカタカナ]/g) || []).length;
  const kanjiCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  
  // 히라가나/가타카나가 한자보다 훨씬 많으면 문장으로 간주
  if (hiraganaKatakanaCount > kanjiCount * 2) {
    return false;
  }
  
  // 공백이나 특수문자가 포함된 경우 제외
  if (/[\s\.,!?。、！？]/.test(text)) {
    return false;
  }
  
  return true;
}

// 후리가나 가져오기 함수
async function getFurigana(text, sourceLang) {
  try {
    console.log('후리가나 요청:', text, 'sourceLang:', sourceLang);
    
    // 한자가 포함되어 있지 않으면 후리가나 불필요
    if (!/[\u4e00-\u9fff]/.test(text)) {
      console.log('한자 없음, 후리가나 불필요');
      return null;
    }
    
    console.log('Google API로 후리가나 요청 시도');
    
    // Google Translate API에서 후리가나 정보 포함하여 요청
    // dt=rm: 로마자 발음, dt=t: 번역
    const furiganaUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=ja&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
    const response = await fetch(furiganaUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log('후리가나 API 전체 응답:', JSON.stringify(data, null, 2));
      
      // 후리가나 정보 추출 시도 (여러 가능한 경로 확인)
      let furigana = null;
      
      // Google Translate API 응답 구조:
      // data[0]: 번역 배열 [[번역, 원본, ...], ...]
      // data[1]: 로마자 발음 배열 (dt=rm 사용 시) [[로마자, 원본, ...], ...]
      // data[2]: 언어 감지 정보
      
      // 방법 1: data[1] (로마자 발음 배열) 확인
      if (data && Array.isArray(data[1]) && data[1].length > 0) {
        console.log('data[1] 배열 발견, 길이:', data[1].length);
        // data[1]의 첫 번째 항목이 로마자 발음 정보를 포함할 수 있음
        for (let i = 0; i < data[1].length; i++) {
          const item = data[1][i];
          console.log(`data[1][${i}]:`, item);
          
          if (Array.isArray(item) && item.length > 0) {
            // item[0]이 로마자 발음일 가능성
            const romaji = item[0];
            if (romaji && typeof romaji === 'string' && romaji.trim().length > 0) {
              console.log('로마자 발음 발견:', romaji);
              // 로마자 발음을 후리가나로 표시 (일단 로마자로 표시)
              // 실제 히라가나 변환은 복잡하므로, 로마자를 표시하거나 
              // 별도의 일본어 사전 API가 필요함
              furigana = `[${romaji}]`; // 로마자 발음 표시
              break;
            }
          } else if (typeof item === 'string' && item.trim().length > 0) {
            // 직접 문자열인 경우
            console.log('직접 문자열 로마자 발견:', item);
            furigana = `[${item}]`;
            break;
          }
        }
      }
      
      // 방법 2: data[0]에서 추가 발음 정보 확인 (일부 응답 구조)
      if (!furigana && data && Array.isArray(data[0]) && data[0].length > 0) {
        const firstItem = data[0][0];
        console.log('data[0][0] 확인:', firstItem);
        
        if (Array.isArray(firstItem) && firstItem.length > 5) {
          // data[0][0][5] 또는 다른 인덱스에 발음 정보가 있을 수 있음
          for (let i = 0; i < firstItem.length; i++) {
            const field = firstItem[i];
            if (typeof field === 'string' && field.length > 0 && field !== text) {
              console.log(`data[0][0][${i}]:`, field);
              // 발음으로 보이는 필드 확인 (로마자 패턴)
              if (/^[a-zA-Z\s'-]+$/.test(field)) {
                console.log('로마자 패턴 매치:', field);
                furigana = `[${field}]`;
                break;
              }
            }
          }
        }
      }
      
      // 방법 3: data[5] 또는 다른 배열 인덱스 확인
      if (!furigana && data && data.length > 5) {
        console.log('data[5] 확인:', data[5]);
        if (Array.isArray(data[5]) && data[5].length > 0) {
          const altPron = data[5][0];
          if (Array.isArray(altPron) && altPron.length > 0 && typeof altPron[0] === 'string') {
            console.log('data[5]에서 발음 발견:', altPron[0]);
            furigana = `[${altPron[0]}]`;
          }
        }
      }
      
      // 방법 4: 간단한 변환 시도 (한자 자체를 키워드로 사용하는 것은 불가)
      // 실제로는 별도의 일본어 사전 API나 MeCab 같은 형태소 분석기가 필요함
      
      if (furigana) {
        console.log('후리가나 추출 성공:', furigana);
        return furigana;
      } else {
        console.log('후리가나를 찾을 수 없음, API 응답 구조:', data);
        // 응답 구조를 자세히 기록
        console.log('응답 타입:', typeof data);
        console.log('data[0] 타입:', typeof data[0]);
        console.log('data[1] 타입:', typeof data[1]);
        return null;
      }
    } else {
      console.log('후리가나 API HTTP 오류:', response.status, response.statusText);
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
    
    // 개별 단어 클릭 이벤트 추가
    const wordItems = wordTranslationsDiv.querySelectorAll('.vopet-word-item');
    wordItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation(); // 팝업 클릭 이벤트 방지
        
        const clickedWord = this.dataset.word;
        const clickedTranslation = this.dataset.translation;
        
        // translationData 구성 - 클릭한 단어만 표시
        const translationData = {
          translation: clickedTranslation || '',
          examples: originalText || '' // 드래그한 전체 문장을 예문으로
        };
        
        window.detailWindow.open(clickedWord, translationData);
      });
    });
    
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
    console.log('팝업 외부 클릭으로 닫기');
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
    console.log('ESC 키로 팝업 닫기');
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
  }
});
