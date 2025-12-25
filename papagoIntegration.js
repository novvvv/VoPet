// 파파고 연동 기능

// 언어 코드를 파파고 언어 코드로 변환
function convertToPapagoLangCode(langCode) {
  const langMap = {
    'ko': 'ko',
    'en': 'en',
    'ja': 'ja',
    'zh': 'zh-CN'
  };
  return langMap[langCode] || 'ko';
}

// 파파고로 이동하는 함수
function openPapago(originalText, sourceLang, targetLang) {
  try {
    if (!originalText || originalText.trim() === '') {
      console.warn('파파고: 원문이 없습니다.');
      return;
    }
    
    // 텍스트를 URL 인코딩
    const encodedText = encodeURIComponent(originalText);
    
    // 언어 코드 변환 (auto는 ko로 처리)
    const papagoSourceLang = sourceLang === 'auto' ? 'ko' : convertToPapagoLangCode(sourceLang);
    const papagoTargetLang = convertToPapagoLangCode(targetLang);
    
    // 파파고 URL 생성
    const papagoUrl = `https://papago.naver.com/?sk=${papagoSourceLang}&tk=${papagoTargetLang}&hn=0&st=${encodedText}`;
    
    // 새 탭에서 열기
    const newWindow = window.open(papagoUrl, '_blank');
    if (!newWindow) {
      console.error('파파고: 팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
    }
  } catch (error) {
    console.error('파파고 열기 오류:', error);
  }
}

// 전역 스코프에 명시적으로 할당 (Chrome Extension 호환성)
if (typeof window !== 'undefined') {
  window.openPapago = openPapago;
}

