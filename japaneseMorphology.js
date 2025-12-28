// 일본어 형태소 분석 모듈 (kuromoji.js 기반)
// 한자 텍스트를 히라가나(후리가나)로 변환

let kuromojiTokenizer = null;
let isKuromojiLoading = false;
let kuromojiLoadPromise = null;

/**
 * kuromoji.js 라이브러리를 동적으로 로드
 * @returns {Promise} kuromoji tokenizer 인스턴스
 */
async function loadKuromoji() {
  console.log('🟡 [kuromoji] loadKuromoji 호출됨');
  
  // 이미 로드 중이면 기존 Promise 반환
  if (isKuromojiLoading && kuromojiLoadPromise) {
    console.log('🟡 [kuromoji] 이미 로딩 중...');
    return kuromojiLoadPromise;
  }

  // 이미 로드되었으면 바로 반환
  if (kuromojiTokenizer) {
    console.log('🟡 [kuromoji] 이미 로드됨, tokenizer 반환');
    return kuromojiTokenizer;
  }

  console.log('🟡 [kuromoji] 새로 로드 시작...');
  
  // kuromoji.js가 manifest.json의 content_scripts로 로드되었는지 확인
  console.log('🟡 [kuromoji] typeof kuromoji:', typeof kuromoji);
  
  if (typeof kuromoji === 'undefined') {
    console.error('❌ [kuromoji] kuromoji.js가 로드되지 않음');
    console.error('❌ [kuromoji] manifest.json의 content_scripts에 lib/kuromoji.js가 포함되어 있는지 확인하세요');
    throw new Error('kuromoji.js가 로드되지 않았습니다. Extension을 다시 로드하세요.');
  }
  
  console.log('🟢 [kuromoji] kuromoji.js 로드 확인됨');
  
  isKuromojiLoading = true;
  kuromojiLoadPromise = new Promise((resolve, reject) => {
    try {
      initializeKuromoji(resolve, reject);
    } catch (error) {
      console.error('❌ [kuromoji] loadKuromoji 예외:', error);
      isKuromojiLoading = false;
      kuromojiLoadPromise = null;
      reject(error);
    }
  });

  return kuromojiLoadPromise;
}

/**
 * kuromoji tokenizer 초기화
 */
function initializeKuromoji(resolve, reject) {
  try {
    // kuromoji 객체 찾기 (여러 방법 시도)
    let kuromojiObj = null;
    if (typeof kuromoji !== 'undefined') {
      kuromojiObj = kuromoji;
    } else if (typeof window !== 'undefined' && typeof window.kuromoji !== 'undefined') {
      kuromojiObj = window.kuromoji;
    } else if (typeof globalThis !== 'undefined' && typeof globalThis.kuromoji !== 'undefined') {
      kuromojiObj = globalThis.kuromoji;
    }
    
    if (!kuromojiObj) {
      const error = new Error('kuromoji.js가 로드되지 않았습니다');
      console.error('❌ [kuromoji] 초기화 오류:', error);
      console.error('❌ [kuromoji] typeof kuromoji:', typeof kuromoji);
      console.error('❌ [kuromoji] typeof window.kuromoji:', typeof window !== 'undefined' ? typeof window.kuromoji : 'window 없음');
      isKuromojiLoading = false;
      kuromojiLoadPromise = null;
      reject(error);
      return;
    }

    // 사전 파일 경로 설정 (Chrome Extension의 리소스 경로)
    const dicPath = chrome.runtime.getURL('dict/');
    console.log('🟡 [kuromoji] 사전 경로:', dicPath);

    kuromojiObj.builder({ dicPath: dicPath }).build((err, tokenizer) => {
      if (err) {
        console.error('kuromoji 초기화 오류:', err);
        console.error('사전 경로:', dicPath);
        isKuromojiLoading = false;
        kuromojiLoadPromise = null;
        reject(err);
        return;
      }

      kuromojiTokenizer = tokenizer;
      isKuromojiLoading = false;
      console.log('kuromoji.js 로드 완료');
      resolve(tokenizer);
    });
  } catch (error) {
    console.error('kuromoji 초기화 중 예외 발생:', error);
    isKuromojiLoading = false;
    kuromojiLoadPromise = null;
    reject(error);
  }
}

/**
 * 일본어 텍스트에서 후리가나 추출
 * @param {string} text - 분석할 일본어 텍스트
 * @returns {Promise<string|null>} 후리가나 문자열 또는 null
 */
async function getFuriganaFromKuromoji(text) {
  try {
    // 한자가 포함되어 있지 않으면 후리가나 불필요
    if (!/[\u4e00-\u9fff]/.test(text)) {
      return null;
    }

    // kuromoji 로드
    const tokenizer = await loadKuromoji();

    // 형태소 분석
    const tokens = tokenizer.tokenize(text);

    // 후리가나 생성
    let furigana = '';
    let originalIndex = 0;

    for (const token of tokens) {
      const surface = token.surface_form; // 표면형 (원본 텍스트)
      const reading = token.reading || token.pronunciation || surface; // 읽기 (히라가나)

      // 한자가 포함된 토큰만 후리가나 표시
      if (/[\u4e00-\u9fff]/.test(surface)) {
        // 한자 부분에 후리가나 추가
        furigana += surface;
        // 후리가나를 괄호로 표시 (또는 루비 태그 형식)
        if (reading && reading !== surface) {
          // 히라가나만 추출 (가타카나를 히라가나로 변환)
          const hiragana = katakanaToHiragana(reading);
          furigana += `(${hiragana})`;
        }
      } else {
        // 한자가 없는 토큰은 그대로 추가
        furigana += surface;
      }
    }

    // 원본과 동일하면 null 반환
    if (furigana === text || !furigana) {
      return null;
    }

    return furigana;
  } catch (error) {
    console.error('후리가나 추출 오류:', error);
    return null;
  }
}

/**
 * 가타카나를 히라가나로 변환
 * @param {string} text - 가타카나 텍스트
 * @returns {string} 히라가나 텍스트
 */
function katakanaToHiragana(text) {
  if (!text) return text;
  return text.replace(/[\u30A1-\u30F6\u30FC]/g, (match) => {
    // 장음 기호(ー)는 그대로 유지
    if (match === '\u30FC') {
      return '\u30FC';
    }
    const code = match.charCodeAt(0);
    // 가타카나를 히라가나로 변환 (코드 포인트 차이: 0x60)
    return String.fromCharCode(code - 0x60);
  });
}

/**
 * 일본어 텍스트에서 히라가나 발음만 추출 (후리가나 형식)
 * 예: "日本語" -> "にほんご"
 * @param {string} text - 분석할 일본어 텍스트
 * @returns {Promise<string|null>} 히라가나 발음 또는 null
 */
async function getHiraganaReading(text) {
  try {
    // 한자가 포함되어 있지 않으면 null
    if (!text || !/[\u4e00-\u9fff]/.test(text)) {
      return null;
    }

    console.log('히라가나 추출 시도:', text);

    // kuromoji 로드
    const tokenizer = await loadKuromoji();
    
    if (!tokenizer) {
      console.error('kuromoji tokenizer를 가져올 수 없습니다');
      return null;
    }

    // 형태소 분석
    const tokens = tokenizer.tokenize(text);
    console.log('형태소 분석 결과:', tokens);

    // 히라가나 발음 추출
    let hiragana = '';
    for (const token of tokens) {
      const reading = token.reading || token.pronunciation || token.surface_form;
      if (reading) {
        // 가타카나를 히라가나로 변환
        hiragana += katakanaToHiragana(reading);
      } else {
        hiragana += token.surface_form;
      }
    }

    // 원본과 동일하면 null 반환
    if (hiragana === text || !hiragana) {
      console.log('히라가나 추출 결과가 원본과 동일하거나 비어있음');
      return null;
    }

    console.log('히라가나 추출 성공:', hiragana);
    return hiragana;
  } catch (error) {
    console.error('히라가나 발음 추출 오류:', error);
    console.error('에러 스택:', error.stack);
    return null;
  }
}

/**
 * 후리가나를 루비 태그 형식으로 변환
 * @param {string} text - 원본 텍스트
 * @param {string} furigana - 후리가나
 * @returns {string} HTML 루비 태그
 */
function formatFuriganaRuby(text, furigana) {
  // 간단한 형식: 텍스트(후리가나)
  return `${text}(${furigana})`;
}

// Chrome Extension 환경에서 전역 스코프에 함수 노출
// content.js에서 접근할 수 있도록
console.log('🟢 [japaneseMorphology] 모듈 로드 완료, 전역 함수 노출 시작...');
if (typeof window !== 'undefined') {
  window.getHiraganaReading = getHiraganaReading;
  window.getFuriganaFromKuromoji = getFuriganaFromKuromoji;
  window.loadKuromoji = loadKuromoji;
  window.katakanaToHiragana = katakanaToHiragana;
  window.formatFuriganaRuby = formatFuriganaRuby;
  console.log('🟢 [japaneseMorphology] 전역 함수 노출 완료');
  console.log('🟢 [japaneseMorphology] window.getHiraganaReading:', typeof window.getHiraganaReading);
} else {
  console.warn('⚠️ [japaneseMorphology] window 객체를 찾을 수 없음');
}

// 직접 전역 스코프에도 노출 (content script 환경)
if (typeof getHiraganaReading === 'undefined') {
  // eval을 사용하지 않고 직접 할당 시도
  try {
    this.getHiraganaReading = getHiraganaReading;
    this.getFuriganaFromKuromoji = getFuriganaFromKuromoji;
    this.loadKuromoji = loadKuromoji;
    console.log('🟢 [japaneseMorphology] 직접 전역 스코프에 노출 완료');
  } catch (e) {
    console.warn('⚠️ [japaneseMorphology] 직접 전역 스코프 노출 실패:', e);
  }
}

// Node.js 환경 지원 (테스트용)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getFuriganaFromKuromoji,
    getHiraganaReading,
    loadKuromoji,
    katakanaToHiragana,
    formatFuriganaRuby
  };
}

