import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

export async function getAlsoSearched(keyword: string) {
  const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(
    keyword
  )}`;
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const alsoSearched: { title: string; imageUrl?: string }[] = [];
  $(
    'div[data-template-id="itemKeywordGroup"][data-template-type="alsoSearch"] a[data-template-id="itemKeyword"]'
  ).each((i, elem) => {
    const title = $(elem)
      .find("span.sds-comps-text.sds-comps-text-ellipsis-1")
      .text()
      .trim();
    const imageUrl = $(elem).find("img").attr("src");
    if (title) {
      alsoSearched.push({ title, imageUrl });
    }
  });

  return alsoSearched;
}

export async function getSmartBlocks(keyword: string) {
  let browser;
  try {
    // Puppeteer를 헤드리스 모드로 실행 (GUI 없이)
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // User-Agent 설정 (봇으로 인식되지 않도록 실제 브라우저처럼 위장)
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // 네이버 검색 페이지로 이동
    await page.goto(
      `https://search.naver.com/search.naver?query=${encodeURIComponent(
        keyword
      )}`,
      {
        waitUntil: "domcontentloaded", // DOM 콘텐츠가 로드될 때까지 기다림
        timeout: 60000, // 최대 1분까지 기다림
      }
    );

    // --- 페이지 스크롤 로직 시작 ---
    // 페이지를 끝까지 스크롤하여 모든 동적 콘텐츠 (스마트블록 포함)가 로드되도록 합니다.
    let previousHeight;
    while (true) {
      previousHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      // `page.waitForTimeout` 대신 `setTimeout`을 사용합니다.
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기하여 콘텐츠 로딩 기다림
      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) {
        break; // 더 이상 스크롤할 내용이 없으면 중단
      }
    }
    // --- 페이지 스크롤 로직 종료 ---

    // 스마트블록 컨테이너를 찾기 위한 여러 CSS 셀렉터 후보
    // 네이버의 HTML 구조는 자주 변경되므로, 여러 가능성을 시도합니다.
    const smartBlockContainerSelectors = [
      ".sc_new_group", // 가장 흔한 스마트블록 그룹
      ".content_area", // 메인 콘텐츠 영역 (상위 컨테이너)
      "div[data-block-type]", // data-block-type 속성을 가진 div
      "section.api_group", // API 그룹 섹션
      "div.fds-ugc-body-popular-topic", // 제공해주신 인기주제 컨테이너
      ".search_inner", // 또 다른 가능성 있는 상위 컨테이너
    ];

    // 발견된 첫 번째 스마트블록 컨테이너가 나타날 때까지 기다립니다.
    // 모든 컨테이너가 항상 로드되지 않을 수 있으므로, 오류를 던지지 않고 진행합니다.
    await Promise.any(
      smartBlockContainerSelectors.map((selector) =>
        page.waitForSelector(selector, { timeout: 10000 })
      )
    ).catch(() =>
      console.log(">>> 어떤 스마트블록 컨테이너도 찾지 못했습니다. (최종 시도)")
    );

    const smartBlocks = await page.evaluate((selectors) => {
      const results: string[] = [];
      const extractedTitles = new Set(); // 중복된 키워드 추출을 방지하기 위한 Set

      selectors.forEach((selector) => {
        // 각 셀렉터에 해당하는 모든 컨테이너를 선택
        const containers = document.querySelectorAll(selector);
        containers.forEach((container) => {
          // 스마트블록의 제목 추출 (h2 또는 .tit 클래스 등)
          const titleElement = container.querySelector(
            "h2.tit, .api_title_wrap h2"
          );
          // `blockTitle`이 `undefined`가 되지 않도록 기본값 할당
          const blockTitle = titleElement
            ? titleElement.textContent?.trim() || ""
            : "";

          // '인기주제', '연관 검색어', 또는 제목이 없는 스마트블록 처리
          if (
            blockTitle.includes("인기주제") ||
            blockTitle.includes("연관 검색어") ||
            blockTitle.includes("스마트블록") ||
            blockTitle === ""
          ) {
            // 키워드 칩 또는 리스트 아이템을 추출하기 위한 다양한 셀렉터 시도
            const keywordElements = container.querySelectorAll(
              "a.fds-comps-keyword-chip span.fds-comps-keyword-chip-text, " + // 제공해주신 인기주제 키워드 칩 텍스트
                ".keyword_list li a, " + // 일반적인 연관 검색어 리스트 항목
                ".sp_keyword .list li a, " + // 또 다른 일반적인 연관 검색어 리스트 항목
                "a.mr4F_5Z21LbvwbpTRB1I span.fds-comps-text" // 제공해주신 키워드 칩의 더 유연한 조합
            );

            keywordElements.forEach((el) => {
              const text = el.textContent?.trim();
              if (text && text.length > 1 && !extractedTitles.has(text)) {
                // 1글자 초과, 중복이 아닐 경우에만 추가
                results.push(text);
                extractedTitles.add(text); // 추출된 제목 Set에 추가
              }
            });
          }
        });
      });

      return results;
    }, smartBlockContainerSelectors); // page.evaluate 함수에 셀렉터 배열을 인자로 전달

    console.log(
      `>>> 최종 추출된 스마트블록 키워드 개수: ${smartBlocks.length}`
    );
    smartBlocks.forEach((block, index) => {
      console.log(`>>>   ${index + 1}. ${block}`);
    });

    return smartBlocks;
  } catch (error) {
    console.error("Puppeteer 크롤링 중 예상치 못한 오류 발생:", error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function getPopularPosts(keyword: string) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.goto(
      `https://search.naver.com/search.naver?query=${encodeURIComponent(
        keyword
      )}`,
      {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }
    );

    // 페이지가 완전히 로드될 때까지 대기
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 페이지 스크롤하여 모든 콘텐츠 로드
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const maxScrolls = 20;
        let scrollCount = 0;

        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
            clearInterval(timer);
            resolve(true);
          }
        }, 200);
      });
    });

    // 추가 대기 시간
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(`>>> 페이지 로딩 완료 대기 후 스크래핑 시작`);

    const html = await page.content();
    const $ = cheerio.load(html);

    const popularPosts: {
      title: string;
      link: string;
      content: string;
      author: string;
      date: string;
    }[] = [];

    // 인기글 컨테이너 찾기 (data-meta-area="ugB_qpR")
    const popularContainer = $('div[data-meta-area="ugB_qpR"]');

    if (popularContainer.length === 0) {
      console.log(">>> 인기글 컨테이너를 찾을 수 없습니다.");

      // 전체 페이지에서 data-meta-area 속성을 가진 모든 요소 찾기
      const allMetaAreas = $("[data-meta-area]");
      console.log(
        `>>> 전체 페이지에서 data-meta-area 속성을 가진 요소 ${allMetaAreas.length}개 발견:`
      );
      allMetaAreas.each((i, elem) => {
        const metaArea = $(elem).attr("data-meta-area");
        console.log(`>>>   ${i + 1}. data-meta-area="${metaArea}"`);
      });

      return [];
    }

    // 인기글 아이템들 찾기 - 더 구체적인 선택자 사용
    let popularElements = $('div[data-meta-area="ugB_qpR"] .fds-ugc-block-mod');
    console.log(`>>> 인기글 요소 ${popularElements.length}개를 찾았습니다.`);

    // 만약 찾지 못했다면 다른 선택자 시도
    if (popularElements.length === 0) {
      const alternativeElements = $(
        'div[data-meta-area="ugB_qpR"] .fds-article-simple-box'
      );
      console.log(
        `>>> 대안 선택자로 인기글 요소 ${alternativeElements.length}개를 찾았습니다.`
      );
      if (alternativeElements.length > 0) {
        popularElements = alternativeElements;
      }
    }

    popularElements.each((i, elem) => {
      // 작성자 추출 (먼저)
      const authorElement = $(elem).find("a.fds-info-inner-text");
      let author = "";
      if (authorElement.length > 0) {
        author = authorElement.text().trim();
      }

      // 날짜 추출
      const dateElement = $(elem).find(".fds-info-sub-inner-text");
      let date = "";
      if (dateElement.length > 0) {
        date = dateElement.text().trim();
      }

      // 제목 추출 - 여러 선택자 시도
      let title = "";
      let link = "";

      const titleSelectors = [
        "a.fds-comps-right-image-text-title",
        ".fds-comps-right-image-text-title",
        "a[data-cb-target]",
        'a[target="_blank"]',
        ".fds-comps-right-image-text-container a.fds-comps-right-image-text-title",
        ".fds-comps-right-image-text-container a[data-cb-target]",
        '.fds-comps-right-image-text-container a[data-cb-trigger="true"]',
        ".fds-comps-right-image-text-container a",
        ".fds-comps-right-image-text-container .fds-comps-text",
        ".fds-comps-right-image-text-container span",
      ];

      for (const titleSelector of titleSelectors) {
        const titleElement = $(elem).find(titleSelector);
        if (titleElement.length > 0) {
          title = titleElement.first().text().trim();
          link = titleElement.first().attr("href") || "";

          // mark 태그 내부의 텍스트도 확인
          if (!title) {
            const markElement = titleElement.find("mark");
            if (markElement.length > 0) {
              title = markElement.text().trim();
            }
          }

          // 작성자 이름이 제목으로 들어간 경우 제외
          if (title === author) {
            title = "";
            continue;
          }

          if (title && link && !link.includes("keep.naver.com")) break;
        }
      }

      // 내용 추출 - 여러 선택자 시도
      let content = "";
      const contentSelectors = [
        "a.fds-comps-right-image-text-content",
        ".fds-comps-right-image-text-content",
        "a[data-cb-target]",
        ".fds-comps-right-image-text-container a.fds-comps-right-image-text-content",
        ".fds-comps-right-image-text-container a[data-cb-target]",
        '.fds-comps-right-image-text-container a[data-cb-trigger="true"]',
        ".fds-comps-right-image-text-container a",
        ".fds-comps-right-image-text-container .fds-comps-text",
        ".fds-comps-right-image-text-container span",
      ];

      for (const contentSelector of contentSelectors) {
        const contentElement = $(elem).find(contentSelector);
        if (contentElement.length > 0) {
          content = contentElement.first().text().trim();
          if (content) break;
        }
      }

      // 디버깅을 위해 첫 번째 요소의 HTML 구조 출력
      if (i === 0) {
        console.log(`>>> 첫 번째 인기글 HTML 구조:`);
        console.log($(elem).html());

        // 제목 관련 요소들 찾기
        console.log(`>>> 제목 관련 요소들:`);
        titleSelectors.forEach((selector, idx) => {
          const elements = $(elem).find(selector);
          console.log(`>>>   ${idx + 1}. ${selector}: ${elements.length}개`);
          elements.each((j, el) => {
            console.log(
              `>>>     - 텍스트: "${$(el).text().trim()}", 링크: "${
                $(el).attr("href") || "없음"
              }"`
            );
          });
        });

        // 내용 관련 요소들 찾기
        console.log(`>>> 내용 관련 요소들:`);
        contentSelectors.forEach((selector, idx) => {
          const elements = $(elem).find(selector);
          console.log(`>>>   ${idx + 1}. ${selector}: ${elements.length}개`);
          elements.each((j, el) => {
            console.log(`>>>     - 텍스트: "${$(el).text().trim()}"`);
          });
        });

        // 전체 요소에서 모든 링크 찾기
        console.log(`>>> 전체 요소의 모든 링크:`);
        $(elem)
          .find("a")
          .each((j, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr("href") || "없음";
            const classes = $(el).attr("class") || "없음";
            console.log(
              `>>>   ${
                j + 1
              }. 텍스트: "${text}", 링크: "${href}", 클래스: "${classes}"`
            );
          });

        // fds-comps-right-image-text-container 찾기
        console.log(`>>> fds-comps-right-image-text-container 찾기:`);
        const container = $(elem).find(".fds-comps-right-image-text-container");
        if (container.length > 0) {
          console.log(`>>>   컨테이너 발견: ${container.length}개`);
          container.each((j, cont) => {
            console.log(`>>>   컨테이너 ${j + 1} HTML:`);
            console.log($(cont).html());
          });
        } else {
          console.log(`>>>   컨테이너를 찾을 수 없습니다.`);
        }
      }

      console.log(
        `>>> 인기글 ${
          i + 1
        }: 제목="${title}", 작성자="${author}", 날짜="${date}", 내용="${content.substring(
          0,
          50
        )}..."`
      );

      // 제목과 링크가 있는 경우에만 추가
      if (title && link) {
        popularPosts.push({
          title,
          author,
          content,
          link,
          date,
        });
      }
    });

    console.log(`>>> 인기글 추출 완료: ${popularPosts.length}개`);
    popularPosts.forEach((post, index) => {
      console.log(`>>>   ${index + 1}. ${post.title} (${post.author})`);
    });

    return popularPosts;
  } catch (error) {
    console.error("Puppeteer 크롤링 중 오류 발생 (인기글):", error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
