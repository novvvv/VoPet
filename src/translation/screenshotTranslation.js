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

/**
 * 화면 캡처 모드 시작
 */
async function startCaptureMode(imageDataUrl) {
  removeOverlay();
  
  if (!imageDataUrl) return;
  
  // 저장된 OCR 언어 읽기
  const result = await chrome.storage.sync.get(['ocrLanguage']).catch(() => ({}));
  const ocrLanguage = result.ocrLanguage || 'eng';
  
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
  helpText.textContent = `${langNames[ocrLanguage]} · 드래그로 영역 선택 · ESC 취소`;
  captureOverlay.appendChild(helpText);
  
  // OCR 언어를 데이터 속성으로 저장
  captureOverlay.dataset.ocrLanguage = ocrLanguage;
  
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
  
  // OCR 언어 가져오기 (overlay에서 또는 저장소에서)
  let ocrLanguage = 'eng';
  if (captureOverlay && captureOverlay.dataset.ocrLanguage) {
    ocrLanguage = captureOverlay.dataset.ocrLanguage;
  } else {
    const result = await chrome.storage.sync.get(['ocrLanguage']).catch(() => ({}));
    ocrLanguage = result.ocrLanguage || 'eng';
  }
  
  removeOverlay();
  
  const loadingPopup = showLoadingPopup();
  
  try {
    loadingPopup.querySelector('.vopet-loading-text').textContent = '이미지 처리 중...';
    const croppedBase64 = await cropImage(imageToProcess, left, top, width, height);
    
    loadingPopup.querySelector('.vopet-loading-text').textContent = '텍스트 추출 중...';
    const extractedText = await extractTextFromImage(croppedBase64, ocrLanguage);
    
    console.log('🔵 [DEBUG] OCR 추출 결과:', extractedText);
    console.log('🔵 [DEBUG] 선택된 OCR 언어:', ocrLanguage);
    
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
    const sourceLang = langCodeMap[ocrLanguage] || 'en';
    
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
    
    // 후리가나 가져오기 (일본어인 경우)
    let furigana = null;
    if (sourceLang === 'ja' && typeof isShortKanjiWord !== 'undefined' && isShortKanjiWord(extractedText)) {
      if (typeof getFurigana !== 'undefined') {
        furigana = await getFurigana(extractedText, sourceLang);
      }
    } else if (targetLanguage === 'ja' && translatedText && typeof isShortKanjiWord !== 'undefined' && isShortKanjiWord(translatedText)) {
      if (typeof getFurigana !== 'undefined') {
        furigana = await getFurigana(translatedText, 'ja');
      }
    }
    
    // 번역 기록 저장 (번역이 있을 때만)
    if (translatedText) {
      const cleanFurigana = furigana ? furigana.replace(/^\[|\]$/g, '') : '';
      saveScreenshotTranslationToChat(extractedText, translatedText, targetLanguage, sourceLang, cleanFurigana);
    }
    
    loadingPopup.remove();
    showScreenshotPopup(extractedText, translatedText, sourceLang, targetLanguage, furigana);
    
  } catch (error) {
    loadingPopup.remove();
    
    // Rate limit 에러인 경우 친절한 메시지 표시
    if (error.message === 'OCR_API_RATE_LIMIT') {
      showErrorPopup(
        'OCR API 사용 한도에 도달했습니다.\n\n' +
        '무료 플랜은 10분에 10번만 요청할 수 있습니다.\n' +
        '잠시 후 다시 시도해주세요.\n\n' +
        '더 많은 요청이 필요하시면 OCR.space에서 유료 플랜을 이용하세요.'
      );
    } else {
      showErrorPopup(error.message || '알 수 없는 오류');
    }
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
  try {
    let result = await tryOCR(base64Image, '2', language);
    if (result) return result;
  } catch (error) {
    if (error.message === 'OCR_API_RATE_LIMIT') {
      throw error; // Rate limit 에러는 바로 전달
    }
    console.warn('OCR Engine 2 실패:', error);
  }
  
  // Engine 1로 재시도
  try {
    let result = await tryOCR(base64Image, '1', language);
    if (result) return result;
  } catch (error) {
    if (error.message === 'OCR_API_RATE_LIMIT') {
      throw error; // Rate limit 에러는 바로 전달
    }
    console.warn('OCR Engine 1 실패:', error);
  }
  
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
      
      // Rate limit 에러인 경우 특별 처리
      if (response.status === 403 && errorText.includes('maximum 10 number of times')) {
        throw new Error('OCR_API_RATE_LIMIT');
      }
      
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

/**
 * CSV 파일에 저장
 */
function saveToCSV(word, translation, furigana, saveButton, timeoutId) {
  chrome.storage.local.get(['syncedFileName', 'syncedFileContent'], function(fileData) {
    if (!fileData.syncedFileName) {
      clearTimeout(timeoutId);
      saveButton.disabled = false;
      saveButton.textContent = '💾 CSV 저장';
      saveButton.style.background = '#fff';
      saveButton.style.color = '#000';
      alert('연동된 파일이 없습니다. 설정에서 파일을 선택해주세요.');
      return;
    }
    
    if (fileData.syncedFileName.endsWith('.numbers')) {
      clearTimeout(timeoutId);
      saveButton.disabled = false;
      saveButton.textContent = '💾 CSV 저장';
      saveButton.style.background = '#fff';
      saveButton.style.color = '#000';
      alert('Numbers 파일은 CSV로 내보낸 후 사용해주세요.');
      return;
    }
    
    if (!fileData.syncedFileContent) {
      clearTimeout(timeoutId);
      saveButton.disabled = false;
      saveButton.textContent = '💾 CSV 저장';
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
      headerLine = '순서,단어,발음,뜻';
      hasHeader = true;
    } else {
      const firstLine = cleanLines[0].toLowerCase();
      hasHeader = firstLine.includes('순서') || firstLine.includes('단어') || firstLine.includes('뜻') || firstLine.includes('발음') || firstLine.includes('후리가나');
      
      if (hasHeader) {
        headerLine = cleanLines[0];
        // 기존 헤더에 발음 컬럼이 없으면 추가
        if (!firstLine.includes('발음') && !firstLine.includes('후리가나')) {
          // 기존 헤더 구조에 따라 발음 컬럼 추가
          const headerParts = headerLine.split(',');
          if (headerParts.length === 3) {
            headerParts.splice(2, 0, '발음');
            headerLine = headerParts.join(',');
          }
        }
        dataLines = cleanLines.slice(1);
      } else {
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
    
    // 순서 번호 계산
    let maxNumber = 0;
    dataLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        const match = trimmedLine.match(/^(\d+),/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });
    
    const newLineNumber = maxNumber + 1;
    
    // 기존 데이터가 3컬럼 형식이면 발음 컬럼 추가 필요
    if (dataLines.length > 0) {
      const firstDataLine = dataLines[0].trim();
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
    
    dataLines.push(newLine);
    
    csvContent = headerLine;
    if (dataLines.length > 0) {
      csvContent += '\n' + dataLines.join('\n');
    }
    
    // 파일 내용 업데이트
    chrome.storage.local.set({ syncedFileContent: csvContent }, function() {
      // background.js에 저장 요청
      chrome.runtime.sendMessage({
        action: 'saveWordToFile',
        word: word,
        translation: translation
      }, function(response) {
        clearTimeout(timeoutId);
        saveButton.disabled = false;
        saveButton.textContent = '💾 CSV 저장';
        saveButton.style.background = '#fff';
        saveButton.style.color = '#000';
        
        if (chrome.runtime.lastError) {
          alert('CSV 저장 중 오류가 발생했습니다: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          saveButton.textContent = '✓ 저장됨';
          saveButton.style.background = '#000';
          saveButton.style.color = '#fff';
          setTimeout(() => {
            saveButton.textContent = '💾 CSV 저장';
            saveButton.style.background = '#fff';
            saveButton.style.color = '#000';
          }, 2000);
        } else {
          alert('CSV 저장에 실패했습니다: ' + (response?.error || '알 수 없는 오류'));
        }
      });
    });
  });
}

/**
 * 스크린샷 번역 기록 저장
 */
function saveScreenshotTranslationToChat(original, translated, targetLanguage, sourceLanguage, furigana = '') {
  try {
    // 현재 시간 생성
    const now = new Date();
    const timestamp = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // 번역 기록 객체 생성
    const translationRecord = {
      original: original,
      translated: translated,
      sourceLanguage: sourceLanguage || 'en',
      targetLanguage: targetLanguage || 'ko',
      translatorService: 'screenshot',
      furigana: furigana || '',
      timestamp: timestamp
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
          // 사이드바도 업데이트
          const sidebarList = document.getElementById('vopet-sidebar-translations-list');
          if (sidebarList && typeof loadSidebarTranslations === 'function') {
            sidebarList.innerHTML = '';
            loadSidebarTranslations(sidebarList);
          } else if (sidebarList && typeof window.loadSidebarTranslations === 'function') {
            sidebarList.innerHTML = '';
            window.loadSidebarTranslations(sidebarList);
          }
        });
      }
    });
  } catch (error) {
    console.error('스크린샷 번역 기록 저장 오류:', error);
  }
}

function showScreenshotPopup(originalText, translatedText, sourceLang, targetLanguage, furigana = null) {
  console.log('🟣 [POPUP] showScreenshotPopup 호출됨');
  console.log('🟣 [POPUP] 원문:', originalText);
  console.log('🟣 [POPUP] 번역:', translatedText);
  console.log('🟣 [POPUP] 후리가나:', furigana);
  
  // 공통 팝업 함수 사용
  if (typeof window.showTranslationPopup === 'function') {
    window.showTranslationPopup(
      originalText,
      translatedText,
      sourceLang,
      targetLanguage,
      furigana,
      'vopet-screenshot-translation-popup',
      'center'
    );
  } else {
    console.error('showTranslationPopup 함수를 찾을 수 없습니다. translationPopup.js가 로드되었는지 확인하세요.');
  }
}

// 전역 함수
window.vopetScreenshotTranslation = {
  startCaptureMode: startCaptureMode
};

