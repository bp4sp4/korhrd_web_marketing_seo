import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const { keyword } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: '키워드가 필요합니다.' }, { status: 400 });
    }

    const smartBlockData = await crawlNaverSearchWithPuppeteer(keyword);

    return NextResponse.json({
      keyword,
      timestamp: new Date().toLocaleString(),
      smartBlocks: smartBlockData,
      totalBlocks: smartBlockData.length
    });

  } catch (error) {
    console.error('크롤링 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

async function crawlNaverSearchWithPuppeteer(keyword: string) {
  let browser;
  try {
    // Puppeteer를 헤드리스 모드로 실행 (GUI 없이)
    browser = await puppeteer.launch({ headless: true }); 
    const page = await browser.newPage();
    
    // User-Agent 설정 (봇으로 인식되지 않도록 실제 브라우저처럼 위장)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 네이버 검색 페이지로 이동
    await page.goto(`https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`, { 
      waitUntil: 'domcontentloaded', // DOM 콘텐츠가 로드될 때까지 기다림
      timeout: 60000 // 최대 1분까지 기다림
    });

    // --- 페이지 스크롤 로직 시작 ---
    // 페이지를 끝까지 스크롤하여 모든 동적 콘텐츠 (스마트블록 포함)가 로드되도록 합니다.
    let previousHeight;
    while (true) {
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      // `page.waitForTimeout` 대신 `setTimeout`을 사용합니다.
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기하여 콘텐츠 로딩 기다림
      let newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === previousHeight) {
        break; // 더 이상 스크롤할 내용이 없으면 중단
      }
    }
    // --- 페이지 스크롤 로직 종료 ---

    // 스마트블록 컨테이너를 찾기 위한 여러 CSS 셀렉터 후보
    // 네이버의 HTML 구조는 자주 변경되므로, 여러 가능성을 시도합니다.
    const smartBlockContainerSelectors = [
        '.sc_new_group', // 가장 흔한 스마트블록 그룹
        '.content_area', // 메인 콘텐츠 영역 (상위 컨테이너)
        'div[data-block-type]', // data-block-type 속성을 가진 div
        'section.api_group', // API 그룹 섹션
        'div.fds-ugc-body-popular-topic', // 제공해주신 인기주제 컨테이너
        '.search_inner' // 또 다른 가능성 있는 상위 컨테이너
    ];

    // 발견된 첫 번째 스마트블록 컨테이너가 나타날 때까지 기다립니다.
    // 모든 컨테이너가 항상 로드되지 않을 수 있으므로, 오류를 던지지 않고 진행합니다.
    await Promise.any(smartBlockContainerSelectors.map(selector => 
        page.waitForSelector(selector, { timeout: 10000 })
    )).catch(() => console.log('>>> 어떤 스마트블록 컨테이너도 찾지 못했습니다. (최종 시도)'));

    const smartBlocks = await page.evaluate((selectors) => {
      const results: any[] = [];
      const extractedTitles = new Set(); // 중복된 키워드 추출을 방지하기 위한 Set

      selectors.forEach(selector => {
        // 각 셀렉터에 해당하는 모든 컨테이너를 선택
        const containers = document.querySelectorAll(selector);
        containers.forEach(container => {
          // 스마트블록의 제목 추출 (h2 또는 .tit 클래스 등)
          const titleElement = container.querySelector('h2.tit, .api_title_wrap h2');
          // `blockTitle`이 `undefined`가 되지 않도록 기본값 할당
          const blockTitle = titleElement ? titleElement.textContent?.trim() || '' : ''; 

          // '인기주제', '연관 검색어', 또는 제목이 없는 스마트블록 처리
          if (blockTitle.includes('인기주제') || blockTitle.includes('연관 검색어') || blockTitle.includes('스마트블록') || blockTitle === '') {
            const items: any[] = [];
            
            // 키워드 칩 또는 리스트 아이템을 추출하기 위한 다양한 셀렉터 시도
            const keywordElements = container.querySelectorAll(
              'a.fds-comps-keyword-chip span.fds-comps-keyword-chip-text, ' + // 제공해주신 인기주제 키워드 칩 텍스트
              '.keyword_list li a, ' + // 일반적인 연관 검색어 리스트 항목
              '.sp_keyword .list li a, ' + // 또 다른 일반적인 연관 검색어 리스트 항목
              'a.mr4F_5Z21LbvwbpTRB1I span.fds-comps-text' // 제공해주신 키워드 칩의 더 유연한 조합
            ); 

            keywordElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text && text.length > 1 && !extractedTitles.has(text)) { // 1글자 초과, 중복이 아닐 경우에만 추가
                items.push({
                  title: text,
                  icon: '🔥', // 인기주제 아이콘
                  description: `${text} 관련 정보`,
                  category: blockTitle || 'Unknown Block' // 제목이 없으면 'Unknown Block'으로 분류
                });
                extractedTitles.add(text); // 추출된 제목 Set에 추가
              }
            });

            if (items.length > 0) {
              results.push({
                id: blockTitle.replace(/\s+/g, '_') || `unknown_block_${Date.now()}`,
                title: blockTitle || 'Smart Block (No Title)', // 제목이 없으면 기본값 설정
                icon: '💡',
                type: 'topics', // <-- 이 부분을 'topics'로 수정했습니다.
                data: items
              });
            }
          }
          // TODO: 만약 뉴스, 지식iN 등 다른 유형의 스마트블록도 추출하고 싶다면
          // 해당 블록들의 고유한 CSS 셀렉터를 찾아 여기에 추가적인 파싱 로직을 구현해야 합니다.
        });
      });

      return results;
    }, smartBlockContainerSelectors); // page.evaluate 함수에 셀렉터 배열을 인자로 전달

    console.log(`>>> 최종 추출된 스마트블록 그룹 개수: ${smartBlocks.length}`);
    smartBlocks.forEach(block => {
        console.log(`>>>   - ${block.title} (${block.data.length}개 항목)`);
    });

    return smartBlocks;
    

  } catch (error) {
    console.error('Puppeteer 크롤링 중 예상치 못한 오류 발생:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
