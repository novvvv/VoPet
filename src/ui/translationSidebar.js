// 번역 기록 사이드바 컴포넌트

let translationSidebar = null;
let isSidebarExpanded = false; // 기본값: 닫힌 상태
let sidebarOpacity = 0.95; // 기본 투명도
const SIDEBAR_WIDTH = 350;

/**
 * 번역 기록 사이드바 생성
 */
function createTranslationSidebar() {
  // 기존 사이드바가 있으면 제거
  const existingSidebar = document.getElementById('vopet-translation-sidebar');
  if (existingSidebar) {
    existingSidebar.remove();
  }
  
  // 기존 토글 버튼도 제거
  const existingToggle = document.getElementById('vopet-sidebar-toggle-tab');
  if (existingToggle) {
    existingToggle.remove();
  }

  // 저장된 투명도 불러오기
  chrome.storage.local.get(['sidebarOpacity'], function(result) {
    if (result.sidebarOpacity !== undefined) {
      sidebarOpacity = result.sidebarOpacity;
      if (translationSidebar) {
        translationSidebar.style.opacity = sidebarOpacity;
      }
    }
  });

  // 사이드바 컨테이너
  const sidebar = document.createElement('div');
  sidebar.id = 'vopet-translation-sidebar';
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: ${SIDEBAR_WIDTH}px;
    height: 100vh;
    background: #fff;
    border-left: 2px solid #000;
    z-index: 2147483646;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.15);
    transition: transform 0.3s ease, opacity 0.2s ease;
    opacity: ${sidebarOpacity};
  `;

  // 헤더 영역
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 2px solid #000;
    background: #000;
    color: #fff;
    flex-shrink: 0;
  `;

  const title = document.createElement('div');
  title.textContent = '번역 기록';
  title.style.cssText = `
    font-size: 15px;
    font-weight: 600;
  `;

  const headerButtons = document.createElement('div');
  headerButtons.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;

  // 전체 삭제 버튼
  const deleteAllButton = document.createElement('button');
  deleteAllButton.textContent = '전체 삭제';
  deleteAllButton.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #fff;
    font-size: 11px;
    cursor: pointer;
    padding: 5px 10px;
    border-radius: 4px;
    transition: background 0.2s;
  `;
  deleteAllButton.addEventListener('mouseenter', function() {
    this.style.background = 'rgba(255, 255, 255, 0.2)';
  });
  deleteAllButton.addEventListener('mouseleave', function() {
    this.style.background = 'rgba(255, 255, 255, 0.1)';
  });

  deleteAllButton.addEventListener('click', function() {
    if (confirm('모든 번역 기록을 삭제하시겠습니까?')) {
      chrome.storage.local.set({ translations: [] }, function() {
        const listContainer = document.getElementById('vopet-sidebar-translations-list');
        if (listContainer) {
          listContainer.innerHTML = '';
          showEmptyMessage(listContainer);
        }
      });
    }
  });

  headerButtons.appendChild(deleteAllButton);
  header.appendChild(title);
  header.appendChild(headerButtons);

  // 투명도 조절 영역
  const opacityControl = document.createElement('div');
  opacityControl.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
  `;

  const opacityLabel = document.createElement('span');
  opacityLabel.textContent = '투명도';
  opacityLabel.style.cssText = `
    font-size: 12px;
    color: #666;
    white-space: nowrap;
  `;

  const opacitySlider = document.createElement('input');
  opacitySlider.type = 'range';
  opacitySlider.min = '0.3';
  opacitySlider.max = '1';
  opacitySlider.step = '0.05';
  opacitySlider.value = sidebarOpacity;
  opacitySlider.style.cssText = `
    flex: 1;
    height: 4px;
    cursor: pointer;
    accent-color: #000;
  `;

  const opacityValue = document.createElement('span');
  opacityValue.textContent = `${Math.round(sidebarOpacity * 100)}%`;
  opacityValue.style.cssText = `
    font-size: 11px;
    color: #999;
    min-width: 35px;
    text-align: right;
  `;

  opacitySlider.addEventListener('input', function() {
    sidebarOpacity = parseFloat(this.value);
    sidebar.style.opacity = sidebarOpacity;
    opacityValue.textContent = `${Math.round(sidebarOpacity * 100)}%`;
    // 저장
    chrome.storage.local.set({ sidebarOpacity: sidebarOpacity });
  });

  opacityControl.appendChild(opacityLabel);
  opacityControl.appendChild(opacitySlider);
  opacityControl.appendChild(opacityValue);

  // 번역 기록 리스트 컨테이너
  const listContainer = document.createElement('div');
  listContainer.id = 'vopet-sidebar-translations-list';
  listContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;

  sidebar.appendChild(header);
  sidebar.appendChild(opacityControl);
  sidebar.appendChild(listContainer);
  document.body.appendChild(sidebar);

  translationSidebar = sidebar;

  // 초기 상태: 닫힌 상태로 설정
  if (!isSidebarExpanded) {
    sidebar.style.transform = `translateX(${SIDEBAR_WIDTH}px)`;
  }

  // 우측 토글 탭 생성 (화살표 박스)
  createToggleTab();

  // 번역 기록 로드
  loadSidebarTranslations(listContainer);

  // 번역 저장 시 업데이트 리스너
  chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName === 'local' && changes.translations) {
      listContainer.innerHTML = '';
      loadSidebarTranslations(listContainer);
    }
  });
}

/**
 * 우측 토글 탭 (열기/닫기 화살표 박스) 생성
 */
function createToggleTab() {
  const existingTab = document.getElementById('vopet-sidebar-toggle-tab');
  if (existingTab) {
    existingTab.remove();
  }

  const toggleTab = document.createElement('div');
  toggleTab.id = 'vopet-sidebar-toggle-tab';
  toggleTab.style.cssText = `
    position: fixed;
    top: 50%;
    right: ${isSidebarExpanded ? SIDEBAR_WIDTH : 0}px;
    transform: translateY(-50%);
    width: 24px;
    height: 60px;
    background: #000;
    border: 2px solid #000;
    border-right: ${isSidebarExpanded ? 'none' : '2px solid #000'};
    border-radius: 6px 0 0 6px;
    cursor: pointer;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: right 0.3s ease, background 0.2s ease;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  `;

  const arrow = document.createElement('span');
  arrow.id = 'vopet-toggle-arrow';
  arrow.textContent = isSidebarExpanded ? '▶' : '◀'; // 닫힌 상태면 ◀ 표시
  arrow.style.cssText = `
    color: #fff;
    font-size: 12px;
    user-select: none;
  `;

  toggleTab.appendChild(arrow);

  toggleTab.addEventListener('mouseenter', function() {
    this.style.background = '#333';
  });

  toggleTab.addEventListener('mouseleave', function() {
    this.style.background = '#000';
  });

  toggleTab.addEventListener('click', function() {
    toggleSidebar();
  });

  document.body.appendChild(toggleTab);
}

/**
 * 사이드바 접기/펼치기
 */
function toggleSidebar() {
  if (!translationSidebar) return;

  isSidebarExpanded = !isSidebarExpanded;
  
  const toggleTab = document.getElementById('vopet-sidebar-toggle-tab');
  const arrow = document.getElementById('vopet-toggle-arrow');
  
  if (isSidebarExpanded) {
    // 사이드바 열기
    translationSidebar.style.transform = 'translateX(0)';
    if (toggleTab) {
      toggleTab.style.right = `${SIDEBAR_WIDTH}px`;
      toggleTab.style.borderRight = 'none';
    }
    if (arrow) arrow.textContent = '▶';
  } else {
    // 사이드바 닫기
    translationSidebar.style.transform = `translateX(${SIDEBAR_WIDTH}px)`;
    if (toggleTab) {
      toggleTab.style.right = '0px';
      toggleTab.style.borderRight = '2px solid #000';
    }
    if (arrow) arrow.textContent = '◀';
  }
}

/**
 * 빈 메시지 표시
 */
function showEmptyMessage(container) {
  const emptyMessage = document.createElement('div');
  emptyMessage.textContent = '번역 기록이 없습니다.';
  emptyMessage.style.cssText = `
    text-align: center;
    color: #999;
    padding: 40px 20px;
    font-size: 14px;
  `;
  container.appendChild(emptyMessage);
}

/**
 * 저장 전 확인 팝업 표시
 */
function showSaveConfirmPopup(initialWord, initialTranslation, initialFurigana, saveButton) {
  // 기존 팝업 제거
  const existingPopup = document.getElementById('vopet-save-confirm-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // 팝업 생성
  const popup = document.createElement('div');
  popup.id = 'vopet-save-confirm-popup';
  popup.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border: 2px solid #000;
    z-index: 2147483648;
    width: 420px;
    max-width: 90vw;
    max-height: 80vh;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;
  
  // HTML 이스케이프 함수
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 2px solid #000; background: #000; color: #fff;">
      <span style="font-size: 15px; font-weight: 600;">CSV 저장 확인</span>
      <button id="vopet-save-confirm-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #fff; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
    </div>
    <div style="padding: 20px; max-height: calc(80vh - 120px); overflow-y: auto;">
      <div style="margin-bottom: 20px; font-size: 12px; color: #666; line-height: 1.6;">
        CSV 파일에 저장될 내용을 확인하고 수정할 수 있습니다.
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #333;">단어 (원문)</label>
        <input type="text" id="vopet-save-word" value="${escapeHtml(initialWord)}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #333;">발음</label>
        <input type="text" id="vopet-save-furigana" value="${escapeHtml(initialFurigana)}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #333;">뜻 (번역)</label>
        <textarea id="vopet-save-translation" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-height: 60px; resize: vertical; box-sizing: border-box; font-family: inherit;">${escapeHtml(initialTranslation)}</textarea>
      </div>
    </div>
    <div style="display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid #e0e0e0; background: #f8f9fa;">
      <button id="vopet-save-confirm-cancel" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: white; color: #666; font-size: 14px; cursor: pointer; transition: all 0.2s ease;">취소</button>
      <button id="vopet-save-confirm-save" style="flex: 1; padding: 10px; border: none; border-radius: 4px; background: #000; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">저장</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // 닫기 버튼
  const closeBtn = popup.querySelector('#vopet-save-confirm-close');
  const cancelBtn = popup.querySelector('#vopet-save-confirm-cancel');
  const saveConfirmBtn = popup.querySelector('#vopet-save-confirm-save');
  
  const closePopup = () => {
    popup.remove();
  };
  
  closeBtn.addEventListener('click', closePopup);
  cancelBtn.addEventListener('click', closePopup);
  
  // 배경 클릭으로 닫기
  popup.addEventListener('click', function(e) {
    if (e.target === popup) {
      closePopup();
    }
  });
  
  // 저장 버튼 클릭
  saveConfirmBtn.addEventListener('click', function() {
    const wordInput = popup.querySelector('#vopet-save-word');
    const translationInput = popup.querySelector('#vopet-save-translation');
    const furiganaInput = popup.querySelector('#vopet-save-furigana');
    
    const word = wordInput.value.trim();
    const translation = translationInput.value.trim();
    const furigana = furiganaInput.value.trim();
    
    // 팝업 제거
    closePopup();
    
    // 실제 저장 실행
    executeSave(word, translation, furigana, saveButton);
  });
  
  // ESC 키로 닫기
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  // 포커스 설정
  setTimeout(() => {
    popup.querySelector('#vopet-save-word').focus();
  }, 100);
}

/**
 * 실제 CSV 저장 실행
 */
function executeSave(word, translation, furigana, saveButton) {
  // 버튼 비활성화 (중복 클릭 방지)
  saveButton.disabled = true;
  saveButton.textContent = '저장 중...';
  saveButton.style.background = '#6c757d';
  saveButton.style.color = '#fff';
  saveButton.style.borderColor = '#6c757d';
  
  // 타임아웃 설정 (10초 후 자동 복구)
  const timeoutId = setTimeout(() => {
    saveButton.disabled = false;
    saveButton.textContent = '💾 저장';
    saveButton.style.background = '#fff';
    saveButton.style.color = '#666';
    saveButton.style.borderColor = '#ddd';
    alert('저장이 시간 초과되었습니다. 다시 시도해주세요.');
  }, 10000);
  
  // CSV 필드 이스케이프 함수
  function escapeCsvField(field) {
    if (!field) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  
  // chrome.storage에서 파일 정보 가져오기
  chrome.storage.local.get(['syncedFileName', 'syncedFileContent'], function(fileData) {
    if (!fileData.syncedFileName) {
      clearTimeout(timeoutId);
      saveButton.disabled = false;
      saveButton.textContent = '💾 저장';
      saveButton.style.background = '#fff';
      saveButton.style.color = '#666';
      saveButton.style.borderColor = '#ddd';
      alert('연동된 파일이 없습니다. 설정에서 파일을 선택해주세요.');
      return;
    }
    
    if (fileData.syncedFileName.endsWith('.numbers')) {
      clearTimeout(timeoutId);
      saveButton.disabled = false;
      saveButton.textContent = '💾 저장';
      saveButton.style.background = '#fff';
      saveButton.style.color = '#666';
      saveButton.style.borderColor = '#ddd';
      alert('Numbers 파일은 CSV로 내보낸 후 사용해주세요.');
      return;
    }
    
    if (!fileData.syncedFileContent) {
      clearTimeout(timeoutId);
      saveButton.disabled = false;
      saveButton.textContent = '💾 저장';
      saveButton.style.background = '#fff';
      saveButton.style.color = '#666';
      saveButton.style.borderColor = '#ddd';
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
      // 완전히 빈 파일인 경우
      headerLine = '순서,단어,발음,뜻';
      hasHeader = true;
    } else {
      // 첫 줄이 헤더인지 확인
      const firstLine = cleanLines[0].toLowerCase();
      hasHeader = firstLine.includes('순서') || firstLine.includes('단어') || firstLine.includes('뜻') || firstLine.includes('발음') || firstLine.includes('후리가나');
      
      if (hasHeader) {
        headerLine = cleanLines[0];
        // 기존 헤더에 발음 컬럼이 없으면 추가
        if (!firstLine.includes('발음') && !firstLine.includes('후리가나')) {
          const headerParts = headerLine.split(',');
          if (headerParts.length === 3) {
            headerParts.splice(2, 0, '발음');
            headerLine = headerParts.join(',');
          }
        }
        dataLines = cleanLines.slice(1);
      } else {
        // 헤더가 없으면 추가
        headerLine = '순서,단어,발음,뜻';
        dataLines = cleanLines;
        hasHeader = true;
      }
    }
    
    // 기존 데이터가 3컬럼 형식이면 발음 컬럼 추가
    if (dataLines.length > 0) {
      const firstDataLine = dataLines[0].trim();
      const fields = firstDataLine.match(/("(?:[^"]|"")*"|[^,]+)(?=\s*,|\s*$)/g);
      if (fields && fields.length === 3) {
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
    
    // 순서 번호 계산
    let maxNumber = 0;
    dataLines.forEach(line => {
      const match = line.match(/^(\d+),/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
    const newLineNumber = maxNumber + 1;
    const newLine = `${newLineNumber},"${escapeCsvField(word)}","${escapeCsvField(furigana)}","${escapeCsvField(translation)}"`;
    
    dataLines.push(newLine);
    csvContent = headerLine;
    if (dataLines.length > 0) {
      csvContent += '\n' + dataLines.join('\n');
    }
    
    // 파일 내용 업데이트
    chrome.storage.local.set({ syncedFileContent: csvContent }, function() {
      console.log('CSV 내용 저장 완료, 파일 핸들 찾는 중...');
      
      // IndexedDB에서 파일 핸들 가져오기
      const dbName = 'vopet_file_handles';
      const dbRequest = indexedDB.open(dbName, 1);
      
      dbRequest.onerror = () => {
        console.error('IndexedDB 열기 오류:', dbRequest.error);
        clearTimeout(timeoutId);
        saveButton.disabled = false;
        saveButton.textContent = '💾 저장';
        saveButton.style.background = '#fff';
        saveButton.style.color = '#666';
        saveButton.style.borderColor = '#ddd';
        alert('파일 저장 중 오류가 발생했습니다: ' + dbRequest.error.message);
      };
      
      dbRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('fileHandles')) {
          db.createObjectStore('fileHandles', { keyPath: 'id' });
        }
      };
      
      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;
        
        if (!db.objectStoreNames.contains('fileHandles')) {
          clearTimeout(timeoutId);
          saveButton.disabled = false;
          saveButton.textContent = '💾 저장';
          saveButton.style.background = '#fff';
          saveButton.style.color = '#666';
          saveButton.style.borderColor = '#ddd';
          alert('파일 저장 중 오류가 발생했습니다: object store를 찾을 수 없습니다.');
          return;
        }
        
        const transaction = db.transaction(['fileHandles'], 'readonly');
        const store = transaction.objectStore('fileHandles');
        const getRequest = store.get('current');
        
        getRequest.onsuccess = async () => {
          const data = getRequest.result;
          
          if (data && data.handle) {
            try {
              const writable = await data.handle.createWritable();
              const BOM = '\uFEFF';
              const cleanCsv = csvContent.trim();
              await writable.write(BOM + cleanCsv);
              await writable.close();
              
              clearTimeout(timeoutId);
              saveButton.textContent = '✓ 저장됨';
              saveButton.style.background = '#000';
              saveButton.style.color = '#fff';
              saveButton.style.borderColor = '#000';
              saveButton.disabled = false;
              
              setTimeout(() => {
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#fff';
                saveButton.style.color = '#666';
                saveButton.style.borderColor = '#ddd';
              }, 2000);
            } catch (error) {
              console.error('파일 쓰기 오류:', error);
              clearTimeout(timeoutId);
              saveButton.disabled = false;
              saveButton.textContent = '💾 저장';
              saveButton.style.background = '#fff';
              saveButton.style.color = '#666';
              saveButton.style.borderColor = '#ddd';
              alert('파일 저장 중 오류가 발생했습니다: ' + error.message);
            }
          } else {
            // 파일 핸들이 없으면 background.js에 저장 요청 (파일 다이얼로그 열기)
            chrome.runtime.sendMessage({
              action: 'saveWordToFile',
              word: word,
              translation: translation,
              furigana: furigana
            }, function(response) {
              clearTimeout(timeoutId);
              saveButton.disabled = false;
              
              if (chrome.runtime.lastError) {
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#fff';
                saveButton.style.color = '#666';
                saveButton.style.borderColor = '#ddd';
                alert('CSV 저장 중 오류가 발생했습니다: ' + chrome.runtime.lastError.message);
                return;
              }
              
              if (response && response.success) {
                saveButton.textContent = '✓ 저장됨';
                saveButton.style.background = '#000';
                saveButton.style.color = '#fff';
                saveButton.style.borderColor = '#000';
                setTimeout(() => {
                  saveButton.textContent = '💾 저장';
                  saveButton.style.background = '#fff';
                  saveButton.style.color = '#666';
                  saveButton.style.borderColor = '#ddd';
                }, 2000);
              } else {
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#fff';
                saveButton.style.color = '#666';
                saveButton.style.borderColor = '#ddd';
                alert('CSV 저장에 실패했습니다: ' + (response?.error || '알 수 없는 오류'));
              }
            });
          }
        };
        
        getRequest.onerror = () => {
          console.error('파일 핸들 조회 오류:', getRequest.error);
          clearTimeout(timeoutId);
          saveButton.disabled = false;
          saveButton.textContent = '💾 저장';
          saveButton.style.background = '#fff';
          saveButton.style.color = '#666';
          saveButton.style.borderColor = '#ddd';
          alert('파일 저장 중 오류가 발생했습니다: ' + getRequest.error.message);
        };
      };
    });
  });
}

/**
 * 사이드바 번역 기록 로드
 */
function loadSidebarTranslations(container) {
  chrome.storage.local.get(['translations'], function(result) {
    const translations = result.translations || [];
    
    if (translations.length === 0) {
      showEmptyMessage(container);
      return;
    }
    
    // 최신순으로 정렬 (최신이 위)
    const sortedTranslations = translations.slice().reverse();
    
    sortedTranslations.forEach((item, index) => {
      const translationItem = document.createElement('div');
      translationItem.style.cssText = `
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: relative;
      `;
      
      // 삭제 버튼 (우측 상단)
      const deleteItemButton = document.createElement('button');
      deleteItemButton.innerHTML = '×';
      deleteItemButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: #999;
        font-size: 16px;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s ease;
      `;
      
      deleteItemButton.addEventListener('mouseenter', function() {
        this.style.background = '#ffebee';
        this.style.color = '#f44336';
      });
      
      deleteItemButton.addEventListener('mouseleave', function() {
        this.style.background = 'transparent';
        this.style.color = '#999';
      });
      
      deleteItemButton.addEventListener('click', function(e) {
        e.stopPropagation();
        chrome.storage.local.get(['translations'], function(result) {
          const translations = result.translations || [];
          const originalIndex = translations.length - 1 - index;
          translations.splice(originalIndex, 1);
          
          chrome.storage.local.set({ translations: translations }, function() {
            container.innerHTML = '';
            loadSidebarTranslations(container);
          });
        });
      });
      
      // 버튼 컨테이너 (우측 하단 - 저장, 파파고)
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        position: absolute;
        bottom: 8px;
        right: 8px;
        display: flex;
        gap: 4px;
        align-items: center;
      `;
      
      // 저장 버튼
      const saveButton = document.createElement('button');
      saveButton.textContent = '💾 저장';
      saveButton.style.cssText = `
        padding: 3px 6px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        color: #666;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      saveButton.addEventListener('mouseenter', function() {
        this.style.background = '#000';
        this.style.color = '#fff';
        this.style.borderColor = '#000';
      });
      
      saveButton.addEventListener('mouseleave', function() {
        if (!this.disabled) {
          this.style.background = 'white';
          this.style.color = '#666';
          this.style.borderColor = '#ddd';
        }
      });
      
      saveButton.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const word = item.original || '';
        const translation = item.translated || '';
        const furigana = item.furigana || '';
        
        // 저장 전 확인 팝업 표시
        showSaveConfirmPopup(word, translation, furigana, saveButton);
      });
      
      // 파파고 버튼
      const papagoButton = document.createElement('button');
      papagoButton.textContent = '파파고';
      papagoButton.style.cssText = `
        padding: 3px 6px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        color: #666;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      papagoButton.addEventListener('mouseenter', function() {
        this.style.background = '#e3f2fd';
        this.style.borderColor = '#2196f3';
        this.style.color = '#2196f3';
      });
      
      papagoButton.addEventListener('mouseleave', function() {
        this.style.background = 'white';
        this.style.borderColor = '#ddd';
        this.style.color = '#666';
      });
      
      papagoButton.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const sourceLang = item.sourceLanguage || 'auto';
        const targetLang = item.targetLanguage || 'ko';
        const originalText = item.original || '';
        
        try {
          const encodedText = encodeURIComponent(originalText);
          const langMap = {
            'ko': 'ko',
            'en': 'en',
            'ja': 'ja',
            'zh': 'zh-CN'
          };
          const papagoSourceLang = sourceLang === 'auto' ? 'ko' : (langMap[sourceLang] || 'ko');
          const papagoTargetLang = langMap[targetLang] || 'ko';
          const papagoUrl = `https://papago.naver.com/?sk=${papagoSourceLang}&tk=${papagoTargetLang}&hn=0&st=${encodedText}`;
          window.open(papagoUrl, '_blank');
        } catch (error) {
          console.error('파파고 열기 오류:', error);
        }
      });
      
      buttonContainer.appendChild(saveButton);
      buttonContainer.appendChild(papagoButton);
      
      // 원본 텍스트
      const originalText = document.createElement('div');
      originalText.textContent = item.original || '';
      originalText.style.cssText = `
        font-size: 13px;
        color: #666;
        font-weight: 500;
        padding-bottom: 30px;
        word-break: break-word;
      `;
      
      // 번역 텍스트
      const translatedText = document.createElement('div');
      translatedText.textContent = item.translated || '';
      translatedText.style.cssText = `
        font-size: 15px;
        color: #333;
        font-weight: 600;
        padding-bottom: 30px;
        word-break: break-word;
      `;
      
      // 메타 정보 (언어, 시간)
      const metaInfo = document.createElement('div');
      metaInfo.style.cssText = `
        font-size: 10px;
        color: #aaa;
        display: flex;
        gap: 8px;
        margin-top: 2px;
      `;
      
      const languageInfo = document.createElement('span');
      languageInfo.textContent = `${item.sourceLanguage || 'auto'} → ${item.targetLanguage || 'ko'}`;
      
      const timeInfo = document.createElement('span');
      timeInfo.textContent = item.timestamp || '';
      
      metaInfo.appendChild(languageInfo);
      metaInfo.appendChild(timeInfo);
      
      translationItem.appendChild(deleteItemButton);
      translationItem.appendChild(buttonContainer);
      translationItem.appendChild(originalText);
      translationItem.appendChild(translatedText);
      translationItem.appendChild(metaInfo);
      
      container.appendChild(translationItem);
    });
  });
}

// 전역 스코프에 노출
if (typeof window !== 'undefined') {
  window.createTranslationSidebar = createTranslationSidebar;
  window.toggleSidebar = toggleSidebar;
  window.loadSidebarTranslations = loadSidebarTranslations;
  window.showSaveConfirmPopup = showSaveConfirmPopup;
  window.executeSave = executeSave;
}
