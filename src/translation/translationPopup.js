// 번역 팝업 공통 함수 - Cursor-style Dark Theme

// 디자인 토큰
const VOPET_THEME = {
  bgPrimary: '#1e1e1e',
  bgSecondary: '#252526',
  bgTertiary: '#2d2d2d',
  bgHover: '#3c3c3c',
  textPrimary: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textMuted: '#6e6e6e',
  borderPrimary: '#3c3c3c',
  borderSecondary: '#454545',
  accentPrimary: '#0078d4',
  accentHover: '#1a8cff',
  success: '#4ec9b0',
  error: '#f14c4c',
  radiusSm: '4px',
  radiusMd: '6px',
  radiusLg: '8px',
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
};

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
 * 번역 팝업 표시 (공통 함수) - Cursor-style Dark Theme
 */
function showTranslationPopup(originalText, translatedText, sourceLang, targetLanguage, furigana = null, popupId = 'vopet-translation-popup', position = 'center') {
  // 기존 팝업 제거
  document.getElementById(popupId)?.remove();
  document.getElementById('vopet-translation-popup')?.remove();
  document.getElementById('vopet-screenshot-translation-popup')?.remove();
  
  const popup = document.createElement('div');
  popup.id = popupId;
  
  // 위치 설정
  let positionStyle = '';
  if (position === 'center') {
    positionStyle = `left: 50%; top: 50%; transform: translate(-50%, -50%);`;
  } else if (typeof position === 'object' && position.x !== undefined && position.y !== undefined) {
    let x = position.x;
    let y = position.y;
    if (x > window.innerWidth - 420) x = window.innerWidth - 440;
    if (x < 20) x = 20;
    if (y < 100) y = 100;
    if (y > window.innerHeight - 200) y = window.innerHeight - 220;
    positionStyle = `left: ${x}px; top: ${y - 100}px;`;
  } else {
    positionStyle = `left: 50%; top: 50%; transform: translate(-50%, -50%);`;
  }
  
  popup.style.cssText = `
    position: fixed;
    ${positionStyle}
    background: ${VOPET_THEME.bgPrimary};
    border: 1px solid ${VOPET_THEME.borderPrimary};
    border-radius: ${VOPET_THEME.radiusLg};
    z-index: 2147483647;
    max-width: 420px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    font-family: ${VOPET_THEME.font};
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
    color: ${VOPET_THEME.textPrimary};
  `;
  
  const hasTranslation = translatedText !== null && translatedText.trim().length > 0;
  const cleanFurigana = furigana ? furigana.replace(/^\[|\]$/g, '') : '';
  
  const papagoSourceLang = sourceLang === 'auto' ? 'ko' : getPapagoLang(sourceLang);
  const papagoTargetLang = getPapagoLang(targetLanguage);
  const papagoUrl = `https://papago.naver.com/?sk=${papagoSourceLang}&tk=${papagoTargetLang}&hn=0&st=${encodeURIComponent(originalText)}`;
  
  // 공통 버튼 스타일
  const buttonStyle = `
    background: ${VOPET_THEME.bgTertiary};
    color: ${VOPET_THEME.textPrimary};
    border: 1px solid ${VOPET_THEME.borderPrimary};
    padding: 6px 12px;
    font-size: 11px;
    border-radius: ${VOPET_THEME.radiusSm};
    cursor: pointer;
    font-weight: 500;
    transition: all 0.15s;
    font-family: ${VOPET_THEME.font};
  `;
  
  // 라벨 스타일
  const labelStyle = `
    font-size: 10px;
    color: ${VOPET_THEME.textMuted};
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  `;
  
  // 텍스트 박스 스타일
  const textBoxStyle = `
    font-size: 14px;
    line-height: 1.7;
    color: ${VOPET_THEME.textPrimary};
    white-space: pre-wrap;
    background: ${VOPET_THEME.bgSecondary};
    padding: 12px 14px;
    border-radius: ${VOPET_THEME.radiusMd};
    border-left: 3px solid ${VOPET_THEME.accentPrimary};
  `;
  
  let popupHTML = '';
  if (hasTranslation) {
    // 원문
    popupHTML = `
      <div style="margin-bottom: 16px;">
        <div style="${labelStyle}">원문</div>
        <div style="${textBoxStyle}">${escapeHtml(originalText)}</div>
      </div>
    `;
    
    // 후리가나 (있는 경우)
    if (cleanFurigana) {
      popupHTML += `
        <div style="margin-bottom: 16px;">
          <div style="${labelStyle}">후리가나</div>
          <div style="${textBoxStyle} border-left-color: ${VOPET_THEME.success};">${escapeHtml(cleanFurigana)}</div>
        </div>
      `;
    }
    
    // 번역
    popupHTML += `
      <div style="padding-top: 16px; border-top: 1px solid ${VOPET_THEME.borderPrimary};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="${labelStyle} margin-bottom: 0;">번역</div>
          <div style="display: flex; gap: 6px;">
            <a href="${papagoUrl}" target="_blank" class="vopet-papago-link" style="${buttonStyle} text-decoration: none; display: inline-flex; align-items: center;">
              <span style="font-size: 10px; margin-right: 4px;">🌐</span> 파파고
            </a>
            <button class="vopet-save-to-file-btn" data-word="${escapeHtml(originalText)}" data-translation="${escapeHtml(translatedText)}" data-furigana="${escapeHtml(cleanFurigana)}" style="${buttonStyle}">
              💾 CSV 저장
            </button>
          </div>
        </div>
        <div style="${textBoxStyle}">${escapeHtml(translatedText)}</div>
      </div>
    `;
  } else {
    popupHTML = `
      <div style="${textBoxStyle}">${escapeHtml(originalText)}</div>
    `;
  }
  
  popup.innerHTML = `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid ${VOPET_THEME.borderPrimary};
      background: ${VOPET_THEME.bgSecondary};
    ">
      <span style="font-size: 13px; font-weight: 600; color: ${VOPET_THEME.textPrimary};">🐾 번역</span>
      <button class="vopet-close-btn" style="
        background: transparent;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: ${VOPET_THEME.textSecondary};
        padding: 4px 8px;
        border-radius: ${VOPET_THEME.radiusSm};
        transition: all 0.15s;
        line-height: 1;
      ">✕</button>
    </div>
    <div style="padding: 16px; max-height: 60vh; overflow-y: auto;">
      ${popupHTML}
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // 닫기 버튼 이벤트
  const closeBtn = popup.querySelector('.vopet-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('mouseenter', function() {
      this.style.background = VOPET_THEME.bgHover;
      this.style.color = VOPET_THEME.textPrimary;
    });
    closeBtn.addEventListener('mouseleave', function() {
      this.style.background = 'transparent';
      this.style.color = VOPET_THEME.textSecondary;
    });
    closeBtn.addEventListener('click', () => popup.remove());
  }
  
  // ESC 키로 팝업 닫기
  const escHandler = (e) => {
    if (e.key === 'Escape' && document.getElementById(popupId)) {
      popup.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  // 파파고 링크 호버 효과
  if (hasTranslation) {
    const papagoLink = popup.querySelector('.vopet-papago-link');
    if (papagoLink) {
      papagoLink.addEventListener('mouseenter', function() {
        this.style.background = VOPET_THEME.accentPrimary;
        this.style.borderColor = VOPET_THEME.accentPrimary;
        this.style.color = '#fff';
      });
      papagoLink.addEventListener('mouseleave', function() {
        this.style.background = VOPET_THEME.bgTertiary;
        this.style.borderColor = VOPET_THEME.borderPrimary;
        this.style.color = VOPET_THEME.textPrimary;
      });
    }
  }
  
  // CSV 저장 버튼 이벤트
  if (hasTranslation) {
    const saveButton = popup.querySelector('.vopet-save-to-file-btn');
    if (saveButton) {
      saveButton.addEventListener('mouseenter', function() {
        this.style.background = VOPET_THEME.success;
        this.style.borderColor = VOPET_THEME.success;
        this.style.color = '#000';
      });
      saveButton.addEventListener('mouseleave', function() {
        this.style.background = VOPET_THEME.bgTertiary;
        this.style.borderColor = VOPET_THEME.borderPrimary;
        this.style.color = VOPET_THEME.textPrimary;
      });
      
      saveButton.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const word = this.getAttribute('data-word');
        const translation = this.getAttribute('data-translation');
        const furigana = this.getAttribute('data-furigana') || '';
        
        if (typeof window.showSaveConfirmPopup === 'function') {
          window.showSaveConfirmPopup(word, translation, furigana, saveButton);
        } else {
          console.warn('showSaveConfirmPopup 함수를 찾을 수 없습니다.');
          saveButton.disabled = true;
          saveButton.textContent = '저장 중...';
          
          const timeoutId = setTimeout(() => {
            saveButton.disabled = false;
            saveButton.textContent = '💾 CSV 저장';
            alert('저장이 시간 초과되었습니다.');
          }, 10000);
          
          if (typeof window.executeSave === 'function') {
            window.executeSave(word, translation, furigana, saveButton);
            clearTimeout(timeoutId);
          } else if (typeof saveToCSV === 'function') {
            saveToCSV(word, translation, furigana, saveButton, timeoutId);
          } else {
            alert('저장 기능이 준비되지 않았습니다.');
            clearTimeout(timeoutId);
            saveButton.disabled = false;
            saveButton.textContent = '💾 CSV 저장';
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
  window.VOPET_THEME = VOPET_THEME;
}
