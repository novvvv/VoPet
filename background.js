// Background Service Worker - CORS 문제 해결을 위해 API 호출 처리

console.log('🐾 VoPet Background Script 로드됨!');

// DeepL API 호출
async function translateWithDeepL(text, targetLanguage, apiKey, sourceLanguage) {
  try {
    // DeepL 언어 코드 매핑
    const deepLLangMap = {
      'ko': 'KO',
      'en': 'EN',
      'ja': 'JA',
      'zh': 'ZH'
    };
    
    const targetLang = deepLLangMap[targetLanguage] || 'KO';
    
    // 소스 언어 설정 (Content Script에서 감지한 언어 사용 또는 AUTO)
    let sourceLangCode = 'AUTO';
    if (sourceLanguage && deepLLangMap[sourceLanguage]) {
      sourceLangCode = deepLLangMap[sourceLanguage];
    }
    
    console.log('DeepL API 호출:', { sourceLang: sourceLangCode, targetLang: targetLang, textLength: text.length });
    
    // URL 파라미터 생성
    const params = new URLSearchParams({
      text: text,
      target_lang: targetLang
    });
    
    // source_lang은 값이 있고 AUTO가 아닐 때만 추가 (DeepL API는 AUTO를 직접 지원하지 않을 수 있음)
    if (sourceLangCode && sourceLangCode !== 'AUTO') {
      params.append('source_lang', sourceLangCode);
    }
    
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `DeepL-Auth-Key ${apiKey.trim()}`
      },
      body: params
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.translations && data.translations.length > 0) {
        return { success: true, translation: data.translations[0].text };
      } else {
        return { success: false, error: '번역 결과를 가져올 수 없습니다' };
      }
    } else {
      const errorText = await response.text().catch(() => '');
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // 파싱 실패
      }
      
      let errorMessage = '알 수 없는 오류';
      if (response.status === 403) {
        errorMessage = 'DeepL API 키가 유효하지 않습니다. API 키를 확인해주세요.';
      } else if (response.status === 456) {
        errorMessage = 'DeepL 무료 플랜 월 사용량 초과 (월 50만 자)';
      } else if (response.status === 400) {
        errorMessage = `DeepL API 요청 오류: ${errorData.message || '잘못된 요청입니다'}`;
      } else {
        errorMessage = `DeepL API 오류 (${response.status}): ${errorData.message || response.statusText || '알 수 없는 오류'}`;
      }
      
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('DeepL API 오류:', error);
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      return { success: false, error: '네트워크 오류: 인터넷 연결을 확인해주세요.' };
    }
    return { success: false, error: error.message || '알 수 없는 오류' };
  }
}

// Google Translate API 호출 (유료)
async function translateWithGoogleAPI(text, targetLanguage, apiKey) {
  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        format: 'text'
      })
    });
    
    const data = await response.json();
    if (data && data.data && data.data.translations && data.data.translations.length > 0) {
      return { success: true, translation: data.data.translations[0].translatedText };
    } else {
      return { success: false, error: '번역 결과를 가져올 수 없습니다' };
    }
  } catch (error) {
    console.error('Google Translate API 오류:', error);
    return { success: false, error: error.message || '알 수 없는 오류' };
  }
}

// Service Worker가 활성 상태로 유지되도록 ping 메시지 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background Script 메시지 수신:', request.action);
  
  // Ping 메시지로 Service Worker 활성화
  if (request.action === 'ping') {
    console.log('Ping 받음 - Service Worker 활성 상태 유지');
    sendResponse({ status: 'active' });
    return true;
  }
  
  if (request.action === 'translate') {
    const { text, targetLanguage, apiKey, translatorService, sourceLanguage } = request;
    
    console.log('번역 요청:', { translatorService, targetLanguage, sourceLanguage, textLength: text.length });
    
    // 비동기 처리
    (async () => {
      try {
        let result;
        
        if (translatorService === 'deepl' && apiKey) {
          console.log('DeepL 번역 시작');
          result = await translateWithDeepL(text, targetLanguage, apiKey, sourceLanguage);
          console.log('DeepL 번역 결과:', result);
        } else if (translatorService === 'google' && apiKey) {
          console.log('Google Translate 번역 시작');
          result = await translateWithGoogleAPI(text, targetLanguage, apiKey);
          console.log('Google Translate 번역 결과:', result);
        } else {
          // Google Translate 무료는 Content Script에서 직접 처리 가능
          sendResponse({ success: false, error: 'Google Translate 무료는 Content Script에서 처리됩니다' });
          return;
        }
        
        sendResponse(result);
      } catch (error) {
        console.error('번역 오류:', error);
        sendResponse({ success: false, error: error.message || '알 수 없는 오류' });
      }
    })();
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
  
  // 다른 메시지에 대해서는 false 반환
  return false;
});

