// 상세 해석 창 컴포넌트

/**
 * 상세 해석 창을 여는 함수
 * @param {string} word - 단어
 * @param {object} translationData - 번역 데이터 (선택사항)
 */
function openDetailWindow(word, translationData = null) {

  const detailWindow = window.open('', '_blank', 'width=600,height=400');
  
  // HTML 이스케이프 함수
  // 개별 단어를 클릭 시 번역을 예문으로 사용한다?
  // TODO: 분석
  
  function escapeHtml(text) {
    if (!text && text !== 0) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  
  const escapedWord = escapeHtml(word);
  const escapedTranslation = escapeHtml(translationData?.translation || '');
  const escapedPronunciation = escapeHtml(translationData?.pronunciation || '');
  const escapedExamples = escapeHtml(translationData?.examples || '');
  
  // HTML 작성 (인라인 스크립트 제거 - CSP 위반 방지)
  detailWindow.document.write(`
    <html>
    <head>
      <title>VoPet - ${escapedWord} 상세 정보</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .word { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .section h3 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
      </style>
    </head>
    <body>
      <div class="word">${escapedWord}</div>
      <div class="section">
        <h3>번역</h3>
        <input type="text" id="translation" value="${escapedTranslation}" placeholder="번역을 입력하세요" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
      </div>

      <div class="section">
        <h3>발음</h3>
        <input type="text" id="pronunciation" value="${escapedPronunciation}" placeholder="발음을 입력하세요" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
      </div>

      <div class="section">
        <h3>예문</h3>
        <textarea id="examples" placeholder="예문을 입력하세요" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-height: 80px; resize: vertical;">${escapedExamples}</textarea>
      </div>

      <div style="margin-top: 20px; text-align: center;">
        <button id="saveButton" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">
          저장
        </button>
      </div>
    </body>
    </html>
  `);
  
  // document.write() 후 document.close() 호출
  detailWindow.document.close();
  
  // 인라인 스크립트 대신 외부에서 스크립트 실행 (CSP 위반 방지)
  // detailWindow의 document가 준비될 때까지 대기 후 실행
  function setupSaveButton() {
    const word = escapedWord;
    
    function saveChanges() {
      console.log('saveChanges() 함수 호출됨!');
      
      const translation = detailWindow.document.getElementById('translation').value;
      const pronunciation = detailWindow.document.getElementById('pronunciation').value;
      const examples = detailWindow.document.getElementById('examples').value;
      
      console.log('저장할 데이터:', { word, translation, pronunciation, examples });
      
      const wordData = {
        word: word,
        translation: translation,
        pronunciation: pronunciation,
        examples: examples,
        savedAt: new Date().toISOString()
      };
      
      // 1. 로컬 스토리지에 먼저 저장
      chrome.storage.local.get(['savedWords'], function(result) {
        const savedWords = result.savedWords || [];
        const existingIndex = savedWords.findIndex(w => w.word === word);
        
        if (existingIndex >= 0) {
          savedWords[existingIndex] = wordData;
        } else {
          savedWords.push(wordData);
        }
        
        chrome.storage.local.set({ savedWords: savedWords });
      });
      
      // 2. EC2 API로도 저장 시도
      chrome.runtime.sendMessage({
        action: 'saveWord',
        wordData: wordData
      }, function(response) {
        if (response && response.success) {
          console.log('서버 저장 성공:', response);
          alert('저장되었습니다!');
          detailWindow.close();
        } else {
          console.error('서버 저장 실패:', response?.error);
          // 서버 저장 실패해도 로컬은 저장되었으므로 성공 메시지 표시
          alert('로컬에 저장되었습니다. (서버 연결 실패)');
          detailWindow.close();
        }
      });
    }
    
    // 저장 버튼 이벤트 리스너 추가
    const saveButton = detailWindow.document.getElementById('saveButton');
    if (saveButton) {
      saveButton.addEventListener('click', saveChanges);
      console.log('저장 버튼 이벤트 리스너 연결 완료');
    } else {
      console.error('저장 버튼을 찾을 수 없습니다!');
    }
  }
  
  // DOM이 준비될 때까지 대기
  if (detailWindow.document.readyState === 'loading') {
    detailWindow.document.addEventListener('DOMContentLoaded', setupSaveButton);
  } else {
    // 이미 로드되었으면 즉시 실행
    setTimeout(setupSaveButton, 0);
  }
}

// 브라우저 환경에서 글로벌 함수로 등록
window.detailWindow = {
  open: openDetailWindow
};

