// 번역 기록 사이드바 컴포넌트

let translationSidebar = null;
let isSidebarExpanded = true;
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
  arrow.textContent = isSidebarExpanded ? '▶' : '◀';
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
      
      // 버튼 컨테이너 (우측 상단)
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 4px;
        align-items: center;
      `;
      
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
      
      // 삭제 버튼
      const deleteItemButton = document.createElement('button');
      deleteItemButton.innerHTML = '×';
      deleteItemButton.style.cssText = `
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
      
      buttonContainer.appendChild(papagoButton);
      buttonContainer.appendChild(deleteItemButton);
      
      // 원본 텍스트
      const originalText = document.createElement('div');
      originalText.textContent = item.original || '';
      originalText.style.cssText = `
        font-size: 13px;
        color: #666;
        font-weight: 500;
        padding-right: 80px;
        word-break: break-word;
      `;
      
      // 번역 텍스트
      const translatedText = document.createElement('div');
      translatedText.textContent = item.translated || '';
      translatedText.style.cssText = `
        font-size: 15px;
        color: #333;
        font-weight: 600;
        padding-right: 80px;
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
}
