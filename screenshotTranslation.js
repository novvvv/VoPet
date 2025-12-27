// 화면 캡처 번역 기능

// OCR.space API 설정
const OCR_API_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = 'helloworld';

// 캡처 상태 관리
let captureOverlay = null;
let isSelecting = false;
let startX = 0;
let startY = 0;
let selectionBox = null;
let capturedImage = null;
let selectedOCRLanguage = 'eng'; // 기본값: 영어

/**
 * 언어 선택 팝업 표시
 */
function showLanguageSelector(imageDataUrl) {
  const selector = document.createElement('div');
  selector.id = 'vopet-language-selector';
  selector.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border: 1px solid #e0e0e0;
    padding: 24px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    text-align: center;
  `;
  
  selector.innerHTML = `
    <div style="font-size: 14px; font-weight: 600; color: #000; margin-bottom: 20px;">인식할 언어 선택</div>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button class="vopet-lang-btn" data-lang="eng" style="
        padding: 12px 24px;
        border: 1px solid #000;
        background: #000;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
      ">English</button>
      <button class="vopet-lang-btn" data-lang="jpn" style="
        padding: 12px 24px;
        border: 1px solid #e0e0e0;
        background: #fff;
        color: #000;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
      ">日本語</button>
      <button class="vopet-lang-btn" data-lang="kor" style="
        padding: 12px 24px;
        border: 1px solid #e0e0e0;
        background: #fff;
        color: #000;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
      ">한국어</button>
    </div>
    <div style="margin-top: 16px; font-size: 11px; color: #888;">ESC 취소</div>
  `;
  
  document.body.appendChild(selector);
  
  // 버튼 클릭 이벤트
  selector.querySelectorAll('.vopet-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedOCRLanguage = btn.dataset.lang;
      selector.remove();
      startCaptureMode(imageDataUrl);
    });
  });
  
  // ESC 키로 닫기
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      selector.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * 화면 캡처 모드 시작
 */
function startCaptureMode(imageDataUrl) {
  removeOverlay();
  
  if (!imageDataUrl) return;
  
  capturedImage = imageDataUrl;
  
  captureOverlay = document.createElement('div');
  captureOverlay.id = 'vopet-capture-overlay';
  captureOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    cursor: crosshair;
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
  `;
  captureOverlay.style.backgroundImage = `url("${imageDataUrl}")`;
  
  const darkOverlay = document.createElement('div');
  darkOverlay.id = 'vopet-dark-overlay';
  darkOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    pointer-events: none;
  `;
  captureOverlay.appendChild(darkOverlay);
  
  const langNames = { eng: 'English', jpn: '日本語', kor: '한국어' };
  const helpText = document.createElement('div');
  helpText.id = 'vopet-help-text';
  helpText.style.cssText = `
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #000;
    color: #fff;
    padding: 10px 20px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 500;
    pointer-events: none;
    z-index: 10;
  `;
  helpText.textContent = `${langNames[selectedOCRLanguage]} · 드래그로 영역 선택 · ESC 취소`;
  captureOverlay.appendChild(helpText);
  
  selectionBox = document.createElement('div');
  selectionBox.id = 'vopet-selection-box';
  selectionBox.style.cssText = `
    position: absolute;
    border: 1px solid #fff;
    background: transparent;
    display: none;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  `;
  captureOverlay.appendChild(selectionBox);
  
  document.body.appendChild(captureOverlay);
  
  captureOverlay.addEventListener('mousedown', handleMouseDown);
  captureOverlay.addEventListener('mousemove', handleMouseMove);
  captureOverlay.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keydown', handleKeyDown);
}

function handleMouseDown(e) {
  e.preventDefault();
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  
  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0';
  selectionBox.style.height = '0';
  selectionBox.style.display = 'block';
  
  const darkOverlay = document.getElementById('vopet-dark-overlay');
  if (darkOverlay) darkOverlay.style.display = 'none';
}

function handleMouseMove(e) {
  if (!isSelecting) return;
  e.preventDefault();
  
  const left = Math.min(startX, e.clientX);
  const top = Math.min(startY, e.clientY);
  const width = Math.abs(e.clientX - startX);
  const height = Math.abs(e.clientY - startY);
  
  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
}

function handleMouseUp(e) {
  if (!isSelecting) return;
  e.preventDefault();
  isSelecting = false;
  
  const left = Math.min(startX, e.clientX);
  const top = Math.min(startY, e.clientY);
  const width = Math.abs(e.clientX - startX);
  const height = Math.abs(e.clientY - startY);
  
  if (width < 10 || height < 10) {
    removeOverlay();
    return;
  }
  
  cropAndTranslate(left, top, width, height);
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    removeOverlay();
  }
}

function removeOverlay() {
  if (captureOverlay) {
    captureOverlay.remove();
    captureOverlay = null;
  }
  selectionBox = null;
  isSelecting = false;
  capturedImage = null;
  document.removeEventListener('keydown', handleKeyDown);
}

/**
 * 선택 영역 크롭 및 번역
 */
async function cropAndTranslate(left, top, width, height) {
  if (!capturedImage) {
    removeOverlay();
    return;
  }
  
  const imageToProcess = capturedImage;
  removeOverlay();
  
  const loadingPopup = showLoadingPopup();
  
  try {
    loadingPopup.querySelector('.vopet-loading-text').textContent = '이미지 처리 중...';
    const croppedBase64 = await cropImage(imageToProcess, left, top, width, height);
    
    loadingPopup.querySelector('.vopet-loading-text').textContent = '텍스트 추출 중...';
    const extractedText = await extractTextFromImage(croppedBase64, selectedOCRLanguage);
    
    console.log('🔵 [DEBUG] OCR 추출 결과:', extractedText);
    console.log('🔵 [DEBUG] 선택된 OCR 언어:', selectedOCRLanguage);
    
    if (!extractedText || extractedText.trim().length === 0) {
      loadingPopup.remove();
      showErrorPopup('텍스트를 찾을 수 없습니다.');
      return;
    }
    
    loadingPopup.querySelector('.vopet-loading-text').textContent = '번역 중...';
    const result = await chrome.storage.sync.get(['language']).catch(() => ({}));
    const targetLanguage = result.language || 'ko';
    
    // 사용자가 선택한 OCR 언어를 원문 언어로 간주
    const langCodeMap = { eng: 'en', jpn: 'ja', kor: 'ko' };
    const sourceLang = langCodeMap[selectedOCRLanguage] || 'en';
    
    console.log('🔵 [DEBUG] sourceLang:', sourceLang, '/ targetLanguage:', targetLanguage);
    
    let translatedText = null;
    
    // 원문 언어와 타겟 언어가 다르면 번역
    if (sourceLang !== targetLanguage) {
      translatedText = await translateText(extractedText, targetLanguage, sourceLang);
      console.log('🔵 [DEBUG] 번역 결과:', translatedText);
    } else {
      console.log('🔵 [DEBUG] 같은 언어라서 번역 스킵');
    }
    
    console.log('🔵 [DEBUG] 팝업에 전달: 원문=', extractedText, '/ 번역=', translatedText);
    
    loadingPopup.remove();
    showScreenshotPopup(extractedText, translatedText);
    
  } catch (error) {
    loadingPopup.remove();
    showErrorPopup(error.message || '알 수 없는 오류');
  }
}

function cropImage(imageDataUrl, left, top, width, height) {
  return new Promise((resolve, reject) => {
    if (!imageDataUrl) {
      reject(new Error('이미지 없음'));
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      try {
        const scaleX = img.width / window.innerWidth;
        const scaleY = img.height / window.innerHeight;
        
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scaleX));
        canvas.height = Math.max(1, Math.round(height * scaleY));
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, left * scaleX, top * scaleY, width * scaleX, height * scaleY, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      } catch (err) {
        reject(new Error('크롭 실패'));
      }
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = imageDataUrl;
  });
}

/**
 * OCR - 사용자가 선택한 언어로만 수행
 */
async function extractTextFromImage(base64Image, language) {
  // Engine 2 먼저 시도
  let result = await tryOCR(base64Image, '2', language);
  if (result) return result;
  
  // Engine 1로 재시도
  result = await tryOCR(base64Image, '1', language);
  if (result) return result;
  
  throw new Error('텍스트를 찾을 수 없습니다.');
}

async function tryOCR(base64Image, engine, language) {
  try {
    console.log('🟡 [OCR] 시도 중... engine:', engine, 'language:', language);
    console.log('🟡 [OCR] 이미지 크기:', base64Image.length, 'bytes');
    
    const formData = new FormData();
    formData.append('apikey', OCR_API_KEY);
    formData.append('base64Image', `data:image/png;base64,${base64Image}`);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', engine);
    formData.append('scale', 'true');
    formData.append('detectOrientation', 'true');
    
    console.log('🟡 [OCR] fetch 요청 시작...');
    const response = await fetch(OCR_API_URL, { 
      method: 'POST', 
      body: formData 
    });
    console.log('🟡 [OCR] 응답 받음 - 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔴 [OCR] 응답 실패:', errorText);
      return null;
    }
    
    const result = await response.json();
    console.log('🟡 [OCR] 결과:', JSON.stringify(result).substring(0, 500));
    
    if (result.OCRExitCode === 1 && result.ParsedResults?.[0]?.ParsedText?.trim()) {
      const text = result.ParsedResults[0].ParsedText.trim();
      console.log('🟢 [OCR] 성공:', text);
      return text;
    }
    
    if (result.ErrorMessage) {
      console.log('🔴 [OCR] API 에러:', result.ErrorMessage);
    }
    console.log('🔴 [OCR] 텍스트 없음');
    return null;
  } catch (err) {
    console.error('🔴 [OCR] 예외 발생:', err.message, err);
    return null;
  }
}

function detectLanguage(text) {
  if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) return 'ko';
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) return 'ja';
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  return 'en';
}

async function translateText(text, targetLanguage = 'ko', sourceLang = 'en') {
  // 사용자 설정에서 번역 서비스와 API 키 가져오기
  const settings = await chrome.storage.sync.get(['translatorService', 'apiKey']).catch(() => ({}));
  const translatorService = settings.translatorService || 'google';
  const apiKey = settings.apiKey || '';
  
  console.log('🔵 [번역] 서비스:', translatorService, '/ 원문 언어:', sourceLang, '/ 타겟:', targetLanguage);
  
  // DeepL API 사용
  if (translatorService === 'deepl' && apiKey) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'translate',
        translatorService: 'deepl',
        text: text,
        targetLanguage: targetLanguage,
        sourceLanguage: sourceLang,
        apiKey: apiKey
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('🔴 [번역] 메시지 오류:', chrome.runtime.lastError);
          reject(new Error('번역 서비스 연결 실패'));
          return;
        }
        if (response && response.success) {
          console.log('🟢 [번역] DeepL 성공:', response.translation);
          resolve(response.translation);
        } else {
          console.error('🔴 [번역] DeepL 실패:', response?.error);
          reject(new Error(response?.error || 'DeepL 번역 실패'));
        }
      });
    });
  }
  
  // Google Translate 무료 API (fallback)
  console.log('🔵 [번역] Google Translate 사용');
  const langMap = { 'ko': 'ko', 'en': 'en', 'ja': 'ja', 'zh': 'zh-CN' };
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${langMap[sourceLang] || 'auto'}&tl=${langMap[targetLanguage] || 'ko'}&dt=t&q=${encodeURIComponent(text)}`;
  
  const response = await fetch(url);
  if (response.ok) {
    const data = await response.json();
    if (data?.[0]) {
      const result = data[0].map(p => p[0]).filter(Boolean).join('');
      console.log('🟢 [번역] Google 성공:', result);
      return result;
    }
  }
  throw new Error('번역 실패');
}

function escapeHtml(text) {
  if (!text && text !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function showLoadingPopup() {
  document.getElementById('vopet-screenshot-loading-popup')?.remove();
  
  const popup = document.createElement('div');
  popup.id = 'vopet-screenshot-loading-popup';
  popup.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border: 1px solid #e0e0e0;
    padding: 24px 32px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  `;
  popup.innerHTML = `<div class="vopet-loading-text" style="font-size: 13px; color: #333; font-weight: 500;">처리 중...</div>`;
  document.body.appendChild(popup);
  return popup;
}

function showErrorPopup(message) {
  const popup = document.createElement('div');
  popup.id = 'vopet-error-popup';
  popup.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border: 1px solid #e0e0e0;
    padding: 24px 32px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    max-width: 320px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  `;
  popup.innerHTML = `
    <div style="font-size: 13px; color: #333; margin-bottom: 16px;">${escapeHtml(message)}</div>
    <button id="vopet-error-close" style="background: #000; color: #fff; border: none; padding: 8px 20px; font-size: 12px; cursor: pointer;">닫기</button>
  `;
  document.body.appendChild(popup);
  popup.querySelector('#vopet-error-close').addEventListener('click', () => popup.remove());
}

function showScreenshotPopup(originalText, translatedText) {
  console.log('🟣 [POPUP] showTranslationPopup 호출됨');
  console.log('🟣 [POPUP] 원문:', originalText);
  console.log('🟣 [POPUP] 번역:', translatedText);
  
  // 기존 스크린샷 팝업 제거
  document.getElementById('vopet-screenshot-translation-popup')?.remove();
  // content.js의 일반 번역 팝업도 제거 (충돌 방지)
  document.getElementById('vopet-translation-popup')?.remove();
  
  const popup = document.createElement('div');
  popup.id = 'vopet-screenshot-translation-popup';
  popup.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
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
  
  const hasTranslation = translatedText !== null;
  
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #000; background: #000; color: #fff;">
      <span style="font-size: 13px; font-weight: 600;">📷 스크린샷 번역</span>
      <button id="vopet-screenshot-close-popup" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #fff;">×</button>
    </div>
    <div style="padding: 20px; max-height: 60vh; overflow-y: auto;">
      ${hasTranslation ? `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">원문</div>
          <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(originalText)}</div>
        </div>
        <div style="padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">번역</div>
          <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(translatedText)}</div>
        </div>
      ` : `
        <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap;">${escapeHtml(originalText)}</div>
      `}
    </div>
  `;
  
  document.body.appendChild(popup);
  console.log('🟣 [POPUP] 팝업 DOM에 추가됨');
  
  popup.querySelector('#vopet-screenshot-close-popup').addEventListener('click', () => {
    console.log('🟣 [POPUP] 닫기 버튼 클릭');
    popup.remove();
  });
  
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      popup.remove();
      document.removeEventListener('keydown', esc);
    }
  });
}

// 전역 함수
window.vopetScreenshotTranslation = {
  showLanguageSelector: showLanguageSelector
};

console.log('✅ VoPet 화면 캡처 번역 기능 로드됨');
