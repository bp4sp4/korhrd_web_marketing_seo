import * as cheerio from "cheerio";

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
  try {
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(
      keyword
    )}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: string[] = [];
    const extractedTitles = new Set<string>();

    // 스마트블록 컨테이너 찾기
    const smartBlockSelectors = [
      ".sc_new_group",
      ".content_area",
      "div[data-block-type]",
      "section.api_group",
      "div.fds-ugc-body-popular-topic",
      ".search_inner",
    ];

    smartBlockSelectors.forEach((selector) => {
      const containers = $(selector);

      containers.each((i, container) => {
        const $container = $(container);

        // 제목 추출
        const titleElement = $container.find("h2.tit, .api_title_wrap h2");
        const blockTitle = titleElement.text().trim() || "";

        // 인기주제나 연관 검색어 관련 블록 처리
        if (
          blockTitle.includes("인기주제") ||
          blockTitle.includes("연관 검색어") ||
          blockTitle.includes("스마트블록") ||
          blockTitle === ""
        ) {
          // 키워드 추출
          const keywordElements = $container.find(
            "a.fds-comps-keyword-chip span.fds-comps-keyword-chip-text, " +
              ".keyword_list li a, " +
              ".sp_keyword .list li a, " +
              "a.mr4F_5Z21LbvwbpTRB1I span.fds-comps-text"
          );

          keywordElements.each((j, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 1 && !extractedTitles.has(text)) {
              results.push(text);
              extractedTitles.add(text);
            }
          });
        }
      });
    });

    console.log(`>>> 추출된 스마트블록 키워드: ${results.length}개`);
    results.forEach((block, index) => {
      console.log(`>>>   ${index + 1}. ${block}`);
    });

    return results;
  } catch (error) {
    console.error("Cheerio 스크래핑 중 오류:", error);
    return [];
  }
}

export async function getPopularPosts(keyword: string) {
  try {
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(
      keyword
    )}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
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
    console.error("Cheerio 크롤링 중 오류 발생 (인기글):", error);
    return [];
  }
}
