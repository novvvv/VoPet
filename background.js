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
  console.log('Background Script 메시지 수신:', request.action, request);
  
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
  
  if (request.action === 'setSyncedFile') {
    const { fileName, fileSize, fileType } = request;
    console.log('파일 연동 설정:', fileName);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'clearSyncedFile') {
    console.log('파일 연동 해제');
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'captureScreen') {
    captureAndSendToContentScript(sender.tab?.id);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'saveWordToFile') {
    const { word, translation } = request;
    
    console.log('파일에 단어 저장 요청 받음:', { word, translation });
    console.log('sender:', sender);
    
    // 비동기 처리
    (async () => {
      try {
        // 저장된 파일 정보 가져오기
        const fileData = await new Promise((resolve) => {
          chrome.storage.local.get(['syncedFileName', 'syncedFileContent'], function(result) {
            resolve(result);
          });
        });
        
        console.log('파일 데이터:', fileData);
        
        if (!fileData.syncedFileName) {
          sendResponseToContentScript({ success: false, error: '연동된 파일이 없습니다' });
          return;
        }
        
        // Numbers 파일인 경우
        if (fileData.syncedFileName.endsWith('.numbers')) {
          sendResponseToContentScript({ success: false, error: 'Numbers 파일은 CSV로 내보낸 후 사용해주세요' });
          return;
        }
        
        // CSV 파일인 경우
        if (fileData.syncedFileName.endsWith('.csv')) {
          if (!fileData.syncedFileContent) {
            sendResponseToContentScript({ success: false, error: '파일 내용을 읽을 수 없습니다. 파일을 다시 선택해주세요.' });
            return;
          }
          
          let csvContent = fileData.syncedFileContent;
          
          // 헤더 확인
          const lines = csvContent.split('\n').filter(line => line.trim());
          let hasHeader = false;
          let header = '';
          
          if (lines.length > 0) {
            // 첫 줄이 헤더인지 확인 (순서, 단어, 뜻 등의 키워드 포함)
            const firstLine = lines[0].toLowerCase();
            if (firstLine.includes('순서') || firstLine.includes('단어') || firstLine.includes('뜻')) {
              hasHeader = true;
              header = lines[0];
            }
          }
          
          // 헤더가 없으면 추가
          if (!hasHeader) {
            header = '순서,단어,뜻';
            csvContent = header + '\n' + csvContent;
          }
          
          // 새 단어 추가 (순서는 기존 라인 수)
          const newLineNumber = lines.length > (hasHeader ? 1 : 0) ? lines.length : 1;
          const newLine = `${newLineNumber},"${escapeCsvField(word)}","${escapeCsvField(translation)}"`;
          
          // CSV에 추가
          csvContent += '\n' + newLine;
          
          console.log('CSV 내용 업데이트 완료, 라인 수:', csvContent.split('\n').length);
          
          // 파일 내용 업데이트
          chrome.storage.local.set({ syncedFileContent: csvContent }, function() {
            // 다운로드 가능하도록 파일 생성
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            console.log('파일 다운로드 URL 생성:', url);
            
            // 다운로드 트리거 (content script에 메시지 전송)
            // sender.tab.id를 우선 사용, 없으면 active tab 찾기
            const targetTabId = sender?.tab?.id;
            
            if (targetTabId) {
              console.log('sender.tab.id 사용:', targetTabId);
              sendDownloadAndResponse(targetTabId, fileData.syncedFileName, url);
            } else {
              chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs[0]) {
                  console.log('탭 찾음:', tabs[0].id, tabs[0].url);
                  sendDownloadAndResponse(tabs[0].id, fileData.syncedFileName, url);
                } else {
                  console.error('활성 탭을 찾을 수 없습니다');
                  sendResponseToContentScript({ success: false, error: '활성 탭을 찾을 수 없습니다' });
                }
              });
            }
            
            // 다운로드 및 응답 전송 헬퍼 함수
            function sendDownloadAndResponse(tabId, fileName, fileUrl) {
              // 다운로드 메시지 전송
              chrome.tabs.sendMessage(tabId, {
                action: 'downloadUpdatedFile',
                fileName: fileName,
                fileUrl: fileUrl
              }, function(downloadResponse) {
                if (chrome.runtime.lastError) {
                  console.error('다운로드 메시지 전송 오류:', chrome.runtime.lastError);
                } else {
                  console.log('다운로드 메시지 전송 성공');
                }
              });
              
              // 응답 전송 (여러 번 시도)
              let retryCount = 0;
              const maxRetries = 5;
              
              const sendResponseMessage = () => {
                chrome.tabs.sendMessage(tabId, {
                  action: 'saveWordToFileResponse',
                  success: true,
                  message: '파일에 저장되었습니다'
                }, function(response) {
                  if (chrome.runtime.lastError) {
                    console.error(`응답 메시지 전송 오류 (시도 ${retryCount + 1}/${maxRetries}):`, chrome.runtime.lastError);
                    retryCount++;
                    if (retryCount < maxRetries) {
                      // 500ms 후 재시도
                      setTimeout(sendResponseMessage, 500);
                    } else {
                      console.error('응답 전송 최대 재시도 횟수 초과');
                    }
                  } else {
                    console.log('응답 전송 성공');
                  }
                });
              };
              
              sendResponseMessage();
            }
          });
        } else {
          sendResponseToContentScript({ success: false, error: '지원하지 않는 파일 형식입니다. CSV 파일만 지원됩니다.' });
        }
      } catch (error) {
        console.error('파일 저장 오류:', error);
        sendResponseToContentScript({ success: false, error: error.message || '알 수 없는 오류' });
      }
    })();
    
    // 비동기 응답을 위해 true 반환
    return true;
  }
  
  // Content script에 응답 전송 헬퍼 함수
  function sendResponseToContentScript(responseData) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs[0]) {
        console.log('응답 전송:', responseData);
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'saveWordToFileResponse',
          ...responseData
        }, function(response) {
          if (chrome.runtime.lastError) {
            console.error('응답 전송 오류:', chrome.runtime.lastError);
            // 재시도
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'saveWordToFileResponse',
                ...responseData
              });
            }, 500);
          } else {
            console.log('응답 전송 성공');
          }
        });
      } else {
        console.error('활성 탭을 찾을 수 없습니다');
      }
    });
  }
  
  // 다른 메시지에 대해서는 false 반환
  return false;
});

// 전역 키보드 단축키 처리
chrome.commands.onCommand.addListener((command) => {
  if (command === 'translate-screenshot') {
    captureAndSendToContentScript();
  }
});

// 화면 캡처 후 content script로 전송
async function captureAndSendToContentScript(tabId = null) {
  try {
    // 탭 ID가 없으면 현재 활성 탭 사용
    let targetTabId = tabId;
    if (!targetTabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        targetTabId = tabs[0].id;
      } else {
        console.error('활성 탭을 찾을 수 없습니다');
        return;
      }
    }
    
    // 화면 캡처
    const imageDataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });
    
    console.log('화면 캡처 완료');
    
    // content script로 전송
    chrome.tabs.sendMessage(targetTabId, {
      action: 'startCaptureMode',
      imageDataUrl: imageDataUrl
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('캡처 모드 시작 오류:', chrome.runtime.lastError);
      }
    });
    
  } catch (error) {
    console.error('화면 캡처 오류:', error);
  }
}

// CSV 필드 이스케이프 함수
function escapeCsvField(field) {
  if (!field) return '';
  const str = String(field);
  // 쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표는 두 개로
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return str.replace(/"/g, '""');
  }
  return str;
}

