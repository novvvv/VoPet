// 번역 팝업 공통 함수

/**
 * HTML 이스케이프 함수
 */
function escapeHtml(text) {
  if (!text && text !== 0) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * 파파고 언어 매핑 함수
 */
function getPapagoLang(lang) {
  const langMap = {
    'ko': 'ko',
    'en': 'en',
    'ja': 'ja',
    'zh': 'zh-CN'
  };
  return langMap[lang] || 'ko';
}

/**
 * 번역 팝업 표시 (공통 함수)
 * 
 * @param {string} originalText - 원문 텍스트
 * @param {string|null} translatedText - 번역 텍스트 (null 가능)
 * @param {string} sourceLang - 원문 언어 코드
 * @param {string} targetLanguage - 타겟 언어 코드
 * @param {string|null} furigana - 후리가나 (null 가능)
 * @param {string} popupId - 팝업 ID (기본값: 'vopet-translation-popup')
 * @param {string|Object} position - 위치 설정 ('center' 또는 {x, y} 객체, 기본값: 'center')
 * @returns {HTMLElement} 생성된 팝업 요소
 */
function showTranslationPopup(originalText, translatedText, sourceLang, targetLanguage, furigana = null, popupId = 'vopet-translation-popup', position = 'center') {
  // 기존 팝업 제거
  document.getElementById(popupId)?.remove();
  // 다른 번역 팝업도 제거 (충돌 방지)
  document.getElementById('vopet-translation-popup')?.remove();
  document.getElementById('vopet-screenshot-translation-popup')?.remove();
  
  const popup = document.createElement('div');
  popup.id = popupId;
  
  // 위치 설정
  let positionStyle = '';
  if (position === 'center') {
    positionStyle = `
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    `;
  } else if (typeof position === 'object' && position.x !== undefined && position.y !== undefined) {
    // 마우스 위치 기반
    let x = position.x;
    let y = position.y;
    
    // 화면 밖으로 나가지 않도록 조정
    if (x > window.innerWidth - 420) x = window.innerWidth - 440;
    if (x < 20) x = 20;
    if (y < 100) y = 100;
    if (y > window.innerHeight - 200) y = window.innerHeight - 220;
    
    positionStyle = `
      left: ${x}px;
      top: ${y - 100}px;
    `;
  } else {
    // 기본값: 중앙
    positionStyle = `
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    `;
  }
  
  popup.style.cssText = `
    position: fixed;
    ${positionStyle}
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
  
  const hasTranslation = translatedText !== null && translatedText.trim().length > 0;
  const cleanFurigana = furigana ? furigana.replace(/^\[|\]$/g, '') : '';
  
  const papagoSourceLang = sourceLang === 'auto' ? 'ko' : getPapagoLang(sourceLang);
  const papagoTargetLang = getPapagoLang(targetLanguage);
  const papagoUrl = `https://papago.naver.com/?sk=${papagoSourceLang}&tk=${papagoTargetLang}&hn=0&st=${encodeURIComponent(originalText)}`;
  
  let popupHTML = '';
  if (hasTranslation) {
    if (cleanFurigana) {
      popupHTML = `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">원문</div>
          <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(originalText)}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">후리가나</div>
          <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f0f8ff; padding: 12px; border-left: 3px solid #4169e1;">${escapeHtml(cleanFurigana)}</div>
        </div>
        <div style="padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">번역</div>
            <div style="display: flex; gap: 6px;">
              <a href="${papagoUrl}" target="_blank" class="vopet-papago-link" style="
                background: #fff;
                color: #000;
                border: 1px solid #000;
                padding: 6px 12px;
                font-size: 11px;
                border-radius: 0;
                text-decoration: none;
                font-weight: 500;
                transition: background 0.2s;
                display: inline-block;
              ">파파고</a>
              <button class="vopet-save-to-file-btn" data-word="${escapeHtml(originalText)}" data-translation="${escapeHtml(translatedText)}" data-furigana="${escapeHtml(cleanFurigana)}" style="
                background: #fff;
                color: #000;
                border: 1px solid #000;
                padding: 6px 12px;
                font-size: 11px;
                border-radius: 0;
                cursor: pointer;
                font-weight: 500;
                transition: background 0.2s;
              ">💾 CSV 저장</button>
            </div>
          </div>
          <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(translatedText)}</div>
        </div>
      `;
    } else {
      popupHTML = `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">원문</div>
          <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(originalText)}</div>
        </div>
        <div style="padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">번역</div>
            <div style="display: flex; gap: 6px;">
              <a href="${papagoUrl}" target="_blank" class="vopet-papago-link" style="
                background: #fff;
                color: #000;
                border: 1px solid #000;
                padding: 6px 12px;
                font-size: 11px;
                border-radius: 0;
                text-decoration: none;
                font-weight: 500;
                transition: background 0.2s;
                display: inline-block;
              ">파파고</a>
              <button class="vopet-save-to-file-btn" data-word="${escapeHtml(originalText)}" data-translation="${escapeHtml(translatedText)}" data-furigana="" style="
                background: #fff;
                color: #000;
                border: 1px solid #000;
                padding: 6px 12px;
                font-size: 11px;
                border-radius: 0;
                cursor: pointer;
                font-weight: 500;
                transition: background 0.2s;
              ">💾 CSV 저장</button>
            </div>
          </div>
          <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-left: 3px solid #000;">${escapeHtml(translatedText)}</div>
        </div>
      `;
    }
  } else {
    popupHTML = `
      <div style="font-size: 15px; line-height: 1.7; color: #000; white-space: pre-wrap;">${escapeHtml(originalText)}</div>
    `;
  }
  
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 2px solid #000; background: #000; color: #fff;">
      <span style="font-size: 13px; font-weight: 600;">번역</span>
      <button class="vopet-close-btn" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #fff;">×</button>
    </div>
    <div style="padding: 20px; max-height: 60vh; overflow-y: auto;">
      ${popupHTML}
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // 닫기 버튼 이벤트
  const closeBtn = popup.querySelector('.vopet-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popup.remove();
    });
  }
  
  // ESC 키로 팝업 닫기
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape' && document.getElementById(popupId)) {
      popup.remove();
      document.removeEventListener('keydown', esc);
    }
  });
  
  // 파파고 링크 호버 효과 (번역이 있을 때만)
  if (hasTranslation) {
    const papagoLink = popup.querySelector('.vopet-papago-link');
    if (papagoLink) {
      papagoLink.addEventListener('mouseenter', function() {
        this.style.background = '#e3f2fd';
        this.style.borderColor = '#2196f3';
        this.style.color = '#2196f3';
      });
      papagoLink.addEventListener('mouseleave', function() {
        this.style.background = '#fff';
        this.style.borderColor = '#000';
        this.style.color = '#000';
      });
    }
  }
  
  // CSV 저장 버튼 이벤트 (번역이 있을 때만)
  if (hasTranslation) {
    const saveButton = popup.querySelector('.vopet-save-to-file-btn');
    if (saveButton) {
      saveButton.addEventListener('mouseenter', function() {
        this.style.background = '#000';
        this.style.color = '#fff';
      });
      saveButton.addEventListener('mouseleave', function() {
        this.style.background = '#fff';
        this.style.color = '#000';
      });
      
      saveButton.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const word = this.getAttribute('data-word');
        const translation = this.getAttribute('data-translation');
        const furigana = this.getAttribute('data-furigana') || '';
        
        console.log('CSV 저장 버튼 클릭:', { word, translation, furigana });
        
        // 저장 전 확인 팝업 표시
        if (typeof window.showSaveConfirmPopup === 'function') {
          window.showSaveConfirmPopup(word, translation, furigana, saveButton);
        } else {
          // fallback: 직접 저장 (showSaveConfirmPopup이 없는 경우)
          console.warn('showSaveConfirmPopup 함수를 찾을 수 없습니다. 직접 저장합니다.');
          saveButton.disabled = true;
          saveButton.textContent = '저장 중...';
          saveButton.style.background = '#6c757d';
          
          const timeoutId = setTimeout(() => {
            console.warn('저장 타임아웃 - 버튼 복구');
            saveButton.disabled = false;
            saveButton.textContent = '💾 CSV 저장';
            saveButton.style.background = '#fff';
            saveButton.style.color = '#000';
            alert('저장이 시간 초과되었습니다. 다시 시도해주세요.');
          }, 10000);
          
          // executeSave 함수 호출 (translationSidebar.js에 있음)
          if (typeof window.executeSave === 'function') {
            window.executeSave(word, translation, furigana, saveButton);
            clearTimeout(timeoutId);
          } else if (typeof saveToCSV === 'function') {
            // screenshotTranslation.js의 saveToCSV 함수 사용
            saveToCSV(word, translation, furigana, saveButton, timeoutId);
          } else {
            alert('저장 기능이 준비되지 않았습니다. 페이지를 새로고침해주세요.');
            clearTimeout(timeoutId);
            saveButton.disabled = false;
            saveButton.textContent = '💾 CSV 저장';
            saveButton.style.background = '#fff';
            saveButton.style.color = '#000';
          }
        }
      });
    }
  }
  
  return popup;
}

// 전역 함수로 노출
if (typeof window !== 'undefined') {
  window.showTranslationPopup = showTranslationPopup;
  window.escapeHtml = escapeHtml;
}

