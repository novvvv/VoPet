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
  
  detailWindow.document.write(`
    <html>
    <head>
      <title>VoPet - ${escapedWord} 상세 정보 (테스트) </title>
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
        <input type="text" value="${escapedTranslation}" placeholder="번역을 입력하세요" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
      </div>

      <div class="section">
        <h3>발음</h3>
        <input type="text" value="${escapedPronunciation}" placeholder="발음을 입력하세요" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
      </div>

      <div class="section">
        <h3>예문</h3>
        <textarea placeholder="예문을 입력하세요" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-height: 80px; resize: vertical;">${escapedExamples}</textarea>
      </div>

      <!-- 저장 관련 스크립트 -->
      <div style="margin-top: 20px; text-align: center;">
        <button onclick="saveChanges()" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">
          저장
        </button>
      </div>

      <script>
        function saveChanges() {
          const translation = document.querySelector('.section input').value;
          const pronunciation = document.querySelectorAll('.section input')[1].value;
          const examples = document.querySelector('textarea').value;
          
          const word = '${escapedWord}';
          console.log('저장할 데이터:', { word, translation, pronunciation, examples });
          
          // 현재는 로컬 스토리지에 저장
          chrome.storage.local.get(['savedWords'], function(result) {
            const savedWords = result.savedWords || [];
            const existingIndex = savedWords.findIndex(w => w.word === word);
            
            const wordData = {
              word: word,
              translation: translation,
              pronunciation: pronunciation,
              examples: examples,
              savedAt: new Date().toISOString()
            };
            
            if (existingIndex >= 0) {
              savedWords[existingIndex] = wordData;
            } else {
              savedWords.push(wordData);
            }
            
            chrome.storage.local.set({ savedWords: savedWords }, function() {
              alert('저장되었습니다!');
              window.close();
            });
          });
        }
      </script>
    </body>
    </html>
  `);
}

// 브라우저 환경에서 글로벌 함수로 등록
window.detailWindow = {
  open: openDetailWindow
};

