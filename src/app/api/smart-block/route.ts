import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// 타입 정의
interface SmartBlockItem {
  title: string;
  icon: string;
  description: string;
  category: string;
}

interface SmartBlock {
  id: string;
  title: string;
  icon: string;
  type: string;
  data: SmartBlockItem[];
}

export async function POST(request: NextRequest) {
  try {
    const { keyword } = await request.json();

    if (!keyword) {
      return NextResponse.json(
        { error: "키워드가 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`>>> 스마트블록 분석 시작: ${keyword}`);

    // Cheerio를 사용한 스크래핑
    const smartBlocks = await scrapeSmartBlocksWithCheerio(keyword);

    const result = {
      keyword,
      timestamp: new Date().toLocaleString(),
      smartBlocks,
      totalBlocks: smartBlocks.length,
    };

    console.log(`>>> 스마트블록 분석 완료: ${keyword}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error("스마트블록 분석 중 오류:", error);
    return NextResponse.json(
      { error: "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

async function scrapeSmartBlocksWithCheerio(
  keyword: string
): Promise<SmartBlock[]> {
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

    const results: SmartBlock[] = [];
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
          const items: SmartBlockItem[] = [];

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
              items.push({
                title: text,
                icon: "🔥",
                description: `${text} 관련 정보`,
                category: blockTitle || "Unknown Block",
              });
              extractedTitles.add(text);
            }
          });

          if (items.length > 0) {
            results.push({
              id:
                blockTitle.replace(/\s+/g, "_") ||
                `unknown_block_${Date.now()}`,
              title: blockTitle || "Smart Block (No Title)",
              icon: "💡",
              type: "topics",
              data: items,
            });
          }
        }
      });
    });

    console.log(`>>> 추출된 스마트블록: ${results.length}개`);
    return results;
  } catch (error) {
    console.error("Cheerio 스크래핑 중 오류:", error);
    return [];
  }
}
