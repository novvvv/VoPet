// 번역 기록 사이드바 컴포넌트

let translationSidebar = null;
let isSidebarExpanded = false; // 기본값: 닫힌 상태
let sidebarOpacity = 0.95; // 기본 투명도
const SIDEBAR_WIDTH = 350;
let currentPage = 1; // 현재 페이지
const ITEMS_PER_PAGE = 5; // 페이지당 항목 수

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

  // 사이드바 컨테이너 - Cursor-style Dark Theme
  const sidebar = document.createElement('div');
  sidebar.id = 'vopet-translation-sidebar';
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: ${SIDEBAR_WIDTH}px;
    height: 100vh;
    background: #1e1e1e;
    border-left: 1px solid #3c3c3c;
    z-index: 2147483646;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
    transition: transform 0.3s ease, opacity 0.2s ease;
    opacity: ${sidebarOpacity};
  `;

  // 헤더 영역 - Cursor-style
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid #3c3c3c;
    background: #252526;
    color: #e0e0e0;
    flex-shrink: 0;
  `;

  const title = document.createElement('div');
  title.textContent = 'Log';
  title.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: #e0e0e0;
  `;

  const headerButtons = document.createElement('div');
  headerButtons.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;

  // 전체 삭제 버튼 - Cursor-style
  const deleteAllButton = document.createElement('button');
  deleteAllButton.textContent = 'Delete All';
  deleteAllButton.style.cssText = `
    background: #2d2d2d;
    border: 1px solid #3c3c3c;
    color: #a0a0a0;
    font-size: 11px;
    cursor: pointer;
    padding: 5px 10px;
    border-radius: 4px;
    transition: all 0.15s;
    font-family: inherit;
  `;
  deleteAllButton.addEventListener('mouseenter', function() {
    this.style.background = '#f14c4c';
    this.style.borderColor = '#f14c4c';
    this.style.color = '#fff';
  });
  deleteAllButton.addEventListener('mouseleave', function() {
    this.style.background = '#2d2d2d';
    this.style.borderColor = '#3c3c3c';
    this.style.color = '#a0a0a0';
  });

  deleteAllButton.addEventListener('click', function() {
    if (confirm('모든 번역 기록을 삭제하시겠습니까?')) {
      chrome.storage.local.set({ translations: [] }, function() {
        currentPage = 1; // 페이지 리셋
        const listContainer = document.getElementById('vopet-sidebar-translations-list');
        if (listContainer) {
          listContainer.innerHTML = '';
          showEmptyMessage(listContainer);
          updatePaginationInfo(0, 0);
          updatePaginationButtons(1, 0);
        }
      });
    }
  });

  headerButtons.appendChild(deleteAllButton);
  header.appendChild(title);
  header.appendChild(headerButtons);

  // 투명도 조절 영역 - Cursor-style
  const opacityControl = document.createElement('div');
  opacityControl.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    flex-shrink: 0;
  `;

  const opacityLabel = document.createElement('span');
  opacityLabel.textContent = '투명도';
  opacityLabel.style.cssText = `
    font-size: 11px;
    color: #6e6e6e;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.5px;
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
    accent-color: #0078d4;
  `;

  const opacityValue = document.createElement('span');
  opacityValue.textContent = `${Math.round(sidebarOpacity * 100)}%`;
  opacityValue.style.cssText = `
    font-size: 11px;
    color: #6e6e6e;
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

  // 페이지네이션 컨트롤 영역 - Cursor-style
  const paginationControl = document.createElement('div');
  paginationControl.id = 'vopet-sidebar-pagination';
  paginationControl.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 16px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    flex-shrink: 0;
  `;

  const paginationInfo = document.createElement('span');
  paginationInfo.id = 'vopet-pagination-info';
  paginationInfo.style.cssText = `
    font-size: 11px;
    color: #6e6e6e;
    white-space: nowrap;
  `;

  const paginationButtons = document.createElement('div');
  paginationButtons.style.cssText = `
    display: flex;
    gap: 6px;
    align-items: center;
  `;

  // 이전 페이지 버튼
  const prevButton = document.createElement('button');
  prevButton.id = 'vopet-pagination-prev';
  prevButton.textContent = '‹';
  prevButton.style.cssText = `
    width: 24px;
    height: 24px;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
    background: #2d2d2d;
    color: #a0a0a0;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: inherit;
    padding: 0;
  `;

  prevButton.addEventListener('mouseenter', function() {
    if (!this.disabled) {
      this.style.background = '#3c3c3c';
      this.style.borderColor = '#505050';
      this.style.color = '#e0e0e0';
    }
  });

  prevButton.addEventListener('mouseleave', function() {
    if (!this.disabled) {
      this.style.background = '#2d2d2d';
      this.style.borderColor = '#3c3c3c';
      this.style.color = '#a0a0a0';
    }
  });

  prevButton.addEventListener('click', function() {
    if (!this.disabled && currentPage > 1) {
      currentPage--;
      const listContainer = document.getElementById('vopet-sidebar-translations-list');
      if (listContainer) {
        listContainer.innerHTML = '';
        loadSidebarTranslations(listContainer);
      }
    }
  });

  // 다음 페이지 버튼
  const nextButton = document.createElement('button');
  nextButton.id = 'vopet-pagination-next';
  nextButton.textContent = '›';
  nextButton.style.cssText = `
    width: 24px;
    height: 24px;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
    background: #2d2d2d;
    color: #a0a0a0;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: inherit;
    padding: 0;
  `;

  nextButton.addEventListener('mouseenter', function() {
    if (!this.disabled) {
      this.style.background = '#3c3c3c';
      this.style.borderColor = '#505050';
      this.style.color = '#e0e0e0';
    }
  });

  nextButton.addEventListener('mouseleave', function() {
    if (!this.disabled) {
      this.style.background = '#2d2d2d';
      this.style.borderColor = '#3c3c3c';
      this.style.color = '#a0a0a0';
    }
  });

  nextButton.addEventListener('click', function() {
    if (!this.disabled) {
      chrome.storage.local.get(['translations'], function(result) {
        const translations = result.translations || [];
        const totalPages = Math.ceil(translations.length / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
          currentPage++;
          const listContainer = document.getElementById('vopet-sidebar-translations-list');
          if (listContainer) {
            listContainer.innerHTML = '';
            loadSidebarTranslations(listContainer);
          }
        }
      });
    }
  });

  paginationButtons.appendChild(prevButton);
  paginationButtons.appendChild(nextButton);

  paginationControl.appendChild(paginationInfo);
  paginationControl.appendChild(paginationButtons);

  // 번역 기록 리스트 컨테이너 - Cursor-style
  const listContainer = document.createElement('div');
  listContainer.id = 'vopet-sidebar-translations-list';
  listContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #1e1e1e;
  `;

  sidebar.appendChild(header);
  sidebar.appendChild(opacityControl);
  sidebar.appendChild(paginationControl);
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
      // 새 항목이 추가되면 첫 페이지로 이동
      const newTranslations = changes.translations.newValue || [];
      if (newTranslations.length > 0 && newTranslations.length > (changes.translations.oldValue || []).length) {
        currentPage = 1;
      }
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
    width: 20px;
    height: 48px;
    background: #252526;
    border: 1px solid #3c3c3c;
    border-right: ${isSidebarExpanded ? 'none' : '1px solid #3c3c3c'};
    border-radius: 6px 0 0 6px;
    cursor: pointer;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: right 0.3s ease, background 0.15s ease;
    box-shadow: -2px 0 12px rgba(0, 0, 0, 0.3);
  `;

  const arrow = document.createElement('span');
  arrow.id = 'vopet-toggle-arrow';
  arrow.textContent = isSidebarExpanded ? '›' : '‹';
  arrow.style.cssText = `
    color: #a0a0a0;
    font-size: 14px;
    user-select: none;
    line-height: 1;
  `;

  toggleTab.appendChild(arrow);

  toggleTab.addEventListener('mouseenter', function() {
    this.style.background = '#3c3c3c';
    arrow.style.color = '#e0e0e0';
  });

  toggleTab.addEventListener('mouseleave', function() {
    this.style.background = '#252526';
    arrow.style.color = '#a0a0a0';
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
    if (arrow) arrow.textContent = '›';
  } else {
    // 사이드바 닫기
    translationSidebar.style.transform = `translateX(${SIDEBAR_WIDTH}px)`;
    if (toggleTab) {
      toggleTab.style.right = '0px';
      toggleTab.style.borderRight = '1px solid #3c3c3c';
    }
    if (arrow) arrow.textContent = '‹';
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
    color: #6e6e6e;
    padding: 40px 20px;
    font-size: 13px;
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
  
  // 팝업 생성 - Cursor-style Dark Theme
  const popup = document.createElement('div');
  popup.id = 'vopet-save-confirm-popup';
  popup.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    z-index: 2147483648;
    width: 420px;
    max-width: 90vw;
    max-height: 80vh;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
    color: #e0e0e0;
  `;
  
  // HTML 이스케이프 함수
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #3c3c3c; background: #252526;">
      <span style="font-size: 14px; font-weight: 600; color: #e0e0e0;">💾 CSV 저장 확인</span>
      <button id="vopet-save-confirm-close" style="background: transparent; border: none; font-size: 16px; cursor: pointer; color: #a0a0a0; padding: 4px 8px; border-radius: 4px; transition: all 0.15s;">✕</button>
    </div>
    <div style="padding: 20px; max-height: calc(80vh - 120px); overflow-y: auto; background: #1e1e1e;">
      <div style="margin-bottom: 16px; font-size: 12px; color: #6e6e6e; line-height: 1.6;">
        CSV 파일에 저장될 내용을 확인하고 수정할 수 있습니다.
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 10px; font-weight: 600; color: #6e6e6e; text-transform: uppercase; letter-spacing: 0.5px;">단어 (원문)</label>
        <input type="text" id="vopet-save-word" value="${escapeHtml(initialWord)}" style="width: 100%; padding: 10px 12px; border: 1px solid #3c3c3c; border-radius: 6px; font-size: 13px; box-sizing: border-box; background: #2d2d2d; color: #e0e0e0; outline: none; transition: border-color 0.15s;">
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 10px; font-weight: 600; color: #6e6e6e; text-transform: uppercase; letter-spacing: 0.5px;">발음</label>
        <input type="text" id="vopet-save-furigana" value="${escapeHtml(initialFurigana)}" style="width: 100%; padding: 10px 12px; border: 1px solid #3c3c3c; border-radius: 6px; font-size: 13px; box-sizing: border-box; background: #2d2d2d; color: #e0e0e0; outline: none; transition: border-color 0.15s;">
      </div>
      
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-size: 10px; font-weight: 600; color: #6e6e6e; text-transform: uppercase; letter-spacing: 0.5px;">뜻 (번역)</label>
        <textarea id="vopet-save-translation" style="width: 100%; padding: 10px 12px; border: 1px solid #3c3c3c; border-radius: 6px; font-size: 13px; min-height: 60px; resize: vertical; box-sizing: border-box; font-family: inherit; background: #2d2d2d; color: #e0e0e0; outline: none; transition: border-color 0.15s;">${escapeHtml(initialTranslation)}</textarea>
      </div>
    </div>
    <div style="display: flex; gap: 10px; padding: 16px; border-top: 1px solid #3c3c3c; background: #252526;">
      <button id="vopet-save-confirm-cancel" style="flex: 1; padding: 10px; border: 1px solid #3c3c3c; border-radius: 6px; background: #2d2d2d; color: #a0a0a0; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit;">취소</button>
      <button id="vopet-save-confirm-save" style="flex: 1; padding: 10px; border: none; border-radius: 6px; background: #0078d4; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit;">저장</button>
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
  saveButton.style.background = '#3c3c3c';
  saveButton.style.color = '#a0a0a0';
  saveButton.style.borderColor = '#3c3c3c';
  
  // 타임아웃 설정 (10초 후 자동 복구)
  const timeoutId = setTimeout(() => {
    saveButton.disabled = false;
    saveButton.textContent = '💾 저장';
    saveButton.style.background = '#2d2d2d';
    saveButton.style.color = '#e0e0e0';
    saveButton.style.borderColor = '#3c3c3c';
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
      saveButton.style.background = '#2d2d2d';
      saveButton.style.color = '#e0e0e0';
      saveButton.style.borderColor = '#3c3c3c';
      alert('연동된 파일이 없습니다. 설정에서 파일을 선택해주세요.');
      return;
    }
    
    if (fileData.syncedFileName.endsWith('.numbers')) {
      clearTimeout(timeoutId);
      saveButton.disabled = false;
      saveButton.textContent = '💾 저장';
      saveButton.style.background = '#2d2d2d';
      saveButton.style.color = '#e0e0e0';
      saveButton.style.borderColor = '#3c3c3c';
      alert('Numbers 파일은 CSV로 내보낸 후 사용해주세요.');
      return;
    }
    
    if (!fileData.syncedFileContent) {
      clearTimeout(timeoutId);
      saveButton.disabled = false;
      saveButton.textContent = '💾 저장';
      saveButton.style.background = '#2d2d2d';
      saveButton.style.color = '#e0e0e0';
      saveButton.style.borderColor = '#3c3c3c';
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
          saveButton.style.background = '#2d2d2d';
          saveButton.style.color = '#e0e0e0';
          saveButton.style.borderColor = '#3c3c3c';
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
              saveButton.style.background = '#4ec9b0';
              saveButton.style.color = '#000';
              saveButton.style.borderColor = '#4ec9b0';
              saveButton.disabled = false;
              
              setTimeout(() => {
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#2d2d2d';
                saveButton.style.color = '#e0e0e0';
                saveButton.style.borderColor = '#3c3c3c';
              }, 2000);
            } catch (error) {
              console.error('파일 쓰기 오류:', error);
              clearTimeout(timeoutId);
              saveButton.disabled = false;
              saveButton.textContent = '💾 저장';
              saveButton.style.background = '#2d2d2d';
              saveButton.style.color = '#e0e0e0';
              saveButton.style.borderColor = '#3c3c3c';
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
                saveButton.style.background = '#2d2d2d';
                saveButton.style.color = '#e0e0e0';
                saveButton.style.borderColor = '#3c3c3c';
                alert('CSV 저장 중 오류가 발생했습니다: ' + chrome.runtime.lastError.message);
                return;
              }
              
              if (response && response.success) {
                saveButton.textContent = '✓ 저장됨';
                saveButton.style.background = '#4ec9b0';
                saveButton.style.color = '#000';
                saveButton.style.borderColor = '#4ec9b0';
                setTimeout(() => {
                  saveButton.textContent = '💾 저장';
                  saveButton.style.background = '#2d2d2d';
                  saveButton.style.color = '#e0e0e0';
                  saveButton.style.borderColor = '#3c3c3c';
                }, 2000);
              } else {
                saveButton.textContent = '💾 저장';
                saveButton.style.background = '#2d2d2d';
                saveButton.style.color = '#e0e0e0';
                saveButton.style.borderColor = '#3c3c3c';
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
          saveButton.style.background = '#2d2d2d';
          saveButton.style.color = '#e0e0e0';
          saveButton.style.borderColor = '#3c3c3c';
          alert('파일 저장 중 오류가 발생했습니다: ' + getRequest.error.message);
        };
      };
    });
  });
}

/**
 * 페이지네이션 정보 업데이트
 */
function updatePaginationInfo(currentPageNum, totalPagesNum, totalItems = 0) {
  const paginationInfo = document.getElementById('vopet-pagination-info');
  if (paginationInfo) {
    if (totalItems === 0) {
      paginationInfo.textContent = '0개 항목';
    } else {
      paginationInfo.textContent = `페이지 ${currentPageNum} / ${totalPagesNum} (총 ${totalItems}개)`;
    }
  }
}

/**
 * 페이지네이션 버튼 상태 업데이트
 */
function updatePaginationButtons(currentPageNum, totalPagesNum) {
  const prevButton = document.getElementById('vopet-pagination-prev');
  const nextButton = document.getElementById('vopet-pagination-next');
  
  if (prevButton) {
    prevButton.disabled = currentPageNum <= 1;
    if (prevButton.disabled) {
      prevButton.style.opacity = '0.4';
      prevButton.style.cursor = 'not-allowed';
    } else {
      prevButton.style.opacity = '1';
      prevButton.style.cursor = 'pointer';
    }
  }
  
  if (nextButton) {
    nextButton.disabled = currentPageNum >= totalPagesNum || totalPagesNum === 0;
    if (nextButton.disabled) {
      nextButton.style.opacity = '0.4';
      nextButton.style.cursor = 'not-allowed';
    } else {
      nextButton.style.opacity = '1';
      nextButton.style.cursor = 'pointer';
    }
  }
}

/**
 * 사이드바 번역 기록 로드 (페이지네이션 적용)
 */
function loadSidebarTranslations(container) {
  chrome.storage.local.get(['translations'], function(result) {
    const translations = result.translations || [];
    
    if (translations.length === 0) {
      showEmptyMessage(container);
      // 페이지네이션 정보 업데이트
      updatePaginationInfo(0, 0);
      return;
    }
    
    // 최신순으로 정렬 (최신이 위)
    const sortedTranslations = translations.slice().reverse();
    
    // 페이지네이션 계산
    const totalItems = sortedTranslations.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    // 현재 페이지가 범위를 벗어나면 마지막 페이지로 조정
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }
    
    // 현재 페이지에 해당하는 항목만 추출
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPageItems = sortedTranslations.slice(startIndex, endIndex);
    
    // 페이지네이션 정보 업데이트
    updatePaginationInfo(currentPage, totalPages, totalItems);
    
    // 페이지네이션 버튼 상태 업데이트
    updatePaginationButtons(currentPage, totalPages);
    
    if (currentPageItems.length === 0) {
      showEmptyMessage(container);
      return;
    }
    
    currentPageItems.forEach((item, pageIndex) => {
      // 전체 배열에서의 실제 인덱스 계산 (삭제 버튼용)
      const actualIndex = startIndex + pageIndex;
      const translationItem = document.createElement('div');
      translationItem.style.cssText = `
        background: #252526;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: relative;
        transition: border-color 0.15s;
      `;
      
      translationItem.addEventListener('mouseenter', function() {
        this.style.borderColor = '#454545';
      });
      
      translationItem.addEventListener('mouseleave', function() {
        this.style.borderColor = '#3c3c3c';
      });
      
      // 삭제 버튼 (우측 상단) - Cursor-style
      const deleteItemButton = document.createElement('button');
      deleteItemButton.innerHTML = '✕';
      deleteItemButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: #6e6e6e;
        font-size: 12px;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.15s;
      `;
      
      deleteItemButton.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(241, 76, 76, 0.15)';
        this.style.color = '#f14c4c';
      });
      
      deleteItemButton.addEventListener('mouseleave', function() {
        this.style.background = 'transparent';
        this.style.color = '#6e6e6e';
      });
      
      deleteItemButton.addEventListener('click', function(e) {
        e.stopPropagation();
        chrome.storage.local.get(['translations'], function(result) {
          const translations = result.translations || [];
          // 실제 인덱스 계산 (최신순이므로 역순)
          const originalIndex = translations.length - 1 - actualIndex;
          translations.splice(originalIndex, 1);
          
          chrome.storage.local.set({ translations: translations }, function() {
            // 삭제 후 현재 페이지가 비어있으면 이전 페이지로 이동
            const remainingItems = translations.length;
            const newTotalPages = Math.ceil(remainingItems / ITEMS_PER_PAGE);
            if (currentPage > newTotalPages && newTotalPages > 0) {
              currentPage = newTotalPages;
            }
            
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
      
      // 저장 버튼 - Cursor-style
      const saveButton = document.createElement('button');
      saveButton.textContent = '💾 저장';
      saveButton.style.cssText = `
        padding: 3px 8px;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        background: #2d2d2d;
        color: #a0a0a0;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      `;
      
      saveButton.addEventListener('mouseenter', function() {
        this.style.background = '#4ec9b0';
        this.style.color = '#000';
        this.style.borderColor = '#4ec9b0';
      });
      
      saveButton.addEventListener('mouseleave', function() {
        if (!this.disabled) {
          this.style.background = '#2d2d2d';
          this.style.color = '#a0a0a0';
          this.style.borderColor = '#3c3c3c';
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
      
      // 파파고 버튼 - Cursor-style
      const papagoButton = document.createElement('button');
      papagoButton.textContent = '🌐 파파고';
      papagoButton.style.cssText = `
        padding: 3px 8px;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        background: #2d2d2d;
        color: #a0a0a0;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      `;
      
      papagoButton.addEventListener('mouseenter', function() {
        this.style.background = '#0078d4';
        this.style.borderColor = '#0078d4';
        this.style.color = '#fff';
      });
      
      papagoButton.addEventListener('mouseleave', function() {
        this.style.background = '#2d2d2d';
        this.style.borderColor = '#3c3c3c';
        this.style.color = '#a0a0a0';
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
      
      // 원본 텍스트 - Cursor-style
      const originalText = document.createElement('div');
      originalText.textContent = item.original || '';
      originalText.style.cssText = `
        font-size: 12px;
        color: #a0a0a0;
        font-weight: 500;
        padding-bottom: 6px;
        word-break: break-word;
      `;
      
      // 번역 텍스트 - Cursor-style
      const translatedText = document.createElement('div');
      translatedText.textContent = item.translated || '';
      translatedText.style.cssText = `
        font-size: 14px;
        color: #e0e0e0;
        font-weight: 600;
        padding-bottom: 28px;
        word-break: break-word;
      `;
      
      // 메타 정보 (언어, 시간) - Cursor-style
      const metaInfo = document.createElement('div');
      metaInfo.style.cssText = `
        font-size: 10px;
        color: #6e6e6e;
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
