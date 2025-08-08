"use client";

import { useState } from "react";
import { Search, TrendingUp, Star, ChevronDown } from "lucide-react";

interface SmartBlockItem {
  title: string;
  icon: string;
  description: string;
  category: string;
  isStarred?: boolean;
}

interface SmartBlock {
  id: string;
  title: string;
  icon: string;
  description: string;
  isStarred: boolean;
  type: string;
  data: SmartBlockItem[];
}

interface CategorizedData {
  인기주제: SmartBlockItem[];
  연관키워드: SmartBlockItem[];
  관련링크: SmartBlockItem[];
}

interface AlsoSearchedItem {
  title: string;
  imageUrl?: string;
}

interface PopularPost {
  title: string;
  link: string;
  content: string;
  author: string;
  date: string;
}

interface AnalysisResult {
  keywordDensity: number;
  contentLength: number;
  hasH1: boolean;
  hasImages: boolean;
  suggestions: string[];
}

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [smartBlocks, setSmartBlocks] = useState<SmartBlock[]>([]);
  const [alsoSearched, setAlsoSearched] = useState<AlsoSearchedItem[]>([]);

  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // New states for content analyzer
  const [analysisContent, setAnalysisContent] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );

  const handleAnalyze = async () => {
    if (!keyword.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setSmartBlocks([]);
    setAlsoSearched([]);
    setPopularPosts([]);
    setAnalysisResult(null); // Reset analysis result on new search

    try {
      // 스마트블록 API 호출
      const smartBlockResponse = await fetch("/api/smart-block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const smartBlockData = await smartBlockResponse.json();
      setSmartBlocks(smartBlockData.smartBlocks || []);

      // 함께 많이 찾는 API 호출
      const alsoSearchedResponse = await fetch("/api/related-searches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const alsoSearchedData = await alsoSearchedResponse.json();
      setAlsoSearched(alsoSearchedData.alsoSearched || []);

      // 인기글 API 호출
      const popularPostsResponse = await fetch("/api/popular-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const popularPostsData = await popularPostsResponse.json();
      setPopularPosts(popularPostsData.popularPosts || []);

      // 콘텐츠 분석 API 호출 (키워드와 분석 콘텐츠가 모두 있을 경우)
      if (analysisContent.trim() && keyword.trim()) {
        const analysisResponse = await fetch("/api/smart-block-analyzer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: analysisContent,
            keyword: keyword.trim(),
          }),
        });
        const analysisData = await analysisResponse.json();
        setAnalysisResult(analysisData);
      }
    } catch (error) {
      console.error("분석 중 오류 발생:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCategorizedData = (data: SmartBlockItem[] | CategorizedData) => {
    if (Array.isArray(data)) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm p-4 border border-blue-100 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{item.icon}</span>
                {item.isStarred && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </div>
              <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                {item.title}
              </h4>
            </div>
          ))}
        </div>
      );
    }

    const categorizedData = data as CategorizedData;
    return (
      <div className="space-y-6">
        {categorizedData.인기주제 && categorizedData.인기주제.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-blue-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
              인기주제 ({categorizedData.인기주제.length}개)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorizedData.인기주제.map((item, index) => (
                <div
                  key={index}
                  className="bg-blue-50 rounded-lg p-4 border border-blue-200 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    {item.isStarred && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {categorizedData.연관키워드 &&
          categorizedData.연관키워드.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-green-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2 text-green-500" />
                연관키워드 ({categorizedData.연관키워드.length}개)
              </h3>
              <div className="flex flex-wrap gap-2">
                {categorizedData.연관키워드.map((item, index) => (
                  <span
                    key={index}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300"
                  >
                    {item.title}
                  </span>
                ))}
              </div>
            </div>
          )}

        {categorizedData.관련링크 && categorizedData.관련링크.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-purple-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <ChevronDown className="w-5 h-5 mr-2 text-purple-500" />
              관련링크 ({categorizedData.관련링크.length}개)
            </h3>
            <div className="space-y-3">
              {categorizedData.관련링크.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="bg-purple-50 rounded-lg p-3 border border-purple-200 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg mr-2">{item.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 text-sm">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            네이버 키워드 분석기
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            스마트블록 및 함께 많이 찾는 검색어 정보를 실시간으로 확인하세요
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/analysis"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              📊 종합 분석 대시보드
            </a>
            <a
              href="/analysis"
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              🎯 SEO 분석 도구
            </a>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="검색어를 입력하세요 (예: 사회복지사, 요양보호사, 공무원 등)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    분석
                  </>
                )}
              </button>
            </div>

            {/* 콘텐츠 분석 입력 필드 추가 */}
            <div className="mt-4">
              <label
                htmlFor="analysisContent"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                분석할 콘텐츠 입력 (선택 사항):
              </label>
              <textarea
                id="analysisContent"
                value={analysisContent}
                onChange={(e) => setAnalysisContent(e.target.value)}
                placeholder="여기에 블로그 글, 웹페이지 내용 등을 붙여넣으세요. (HTML 포함 가능)"
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              ></textarea>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">추천 검색어:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "사회복지사",
                  "요양보호사",
                  "공무원",
                  "간호사",
                  "교사",
                  "프로그래머",
                  "한국어교원",
                ].map((suggested) => (
                  <button
                    key={suggested}
                    onClick={() => setKeyword(suggested)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm transition-colors"
                  >
                    {suggested}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {hasSearched && (
          <div className="max-w-6xl mx-auto mt-8">
            {loading && (
              <div className="text-center py-12 col-span-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">정보를 가져오는 중...</p>
              </div>
            )}

            {!loading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {smartBlocks.length > 0 ||
                alsoSearched.length > 0 ||
                popularPosts.length > 0 ? (
                  <>
                    {smartBlocks.length > 0 && (
                      <div className="space-y-6">
                        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">
                          스마트블록
                        </h2>
                        {smartBlocks.map((block) => (
                          <div
                            key={block.id}
                            className="bg-white rounded-xl shadow-lg overflow-hidden border border-blue-200 transform transition-transform duration-300"
                          >
                            <div className="p-6">
                              {block.type === "topics" &&
                                block.data &&
                                renderCategorizedData(block.data)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {alsoSearched.length > 0 && (
                      <div className="space-y-6">
                        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-purple-300 pb-2">
                          함께 많이 찾는 검색어
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {alsoSearched.map((item, index) => (
                            <div
                              key={index}
                              className="bg-white rounded-xl shadow-lg p-4 border border-purple-200 flex items-center space-x-4 transform transition-transform duration-300"
                            >
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-16 h-16 rounded-lg object-cover shadow-md"
                                />
                              )}
                              <span className="text-gray-800 font-semibold text-base flex-1">
                                {item.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {popularPosts.length > 0 && (
                      <div className="space-y-6">
                        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-red-300 pb-2">
                          인기글
                        </h2>
                        <div className="space-y-4">
                          {popularPosts.map((item, index) => (
                            <div
                              key={index}
                              className="bg-white rounded-xl shadow-lg p-4 border border-red-200"
                            >
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 font-semibold text-base"
                              >
                                {item.title}
                              </a>
                              <div className="flex items-center text-xs text-gray-500 mt-1 gap-2">
                                <span>{item.author}</span>
                                <span>{item.date}</span>
                              </div>
                              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                {item.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 col-span-full">
                    <p className="text-gray-600 text-lg">
                      검색 결과가 없습니다. 다른 키워드로 다시 시도해보세요.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 콘텐츠 분석 결과 표시 */}
            {!loading && analysisResult && (
              <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-green-200">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-green-300 pb-2">
                  콘텐츠 분석 결과
                </h2>
                <div className="space-y-4 text-gray-700">
                  <p>
                    <span className="font-semibold">키워드 밀도:</span>{" "}
                    {analysisResult.keywordDensity}%
                  </p>
                  <p>
                    <span className="font-semibold">콘텐츠 길이:</span>{" "}
                    {analysisResult.contentLength}자
                  </p>
                  <p>
                    <span className="font-semibold">H1 태그 사용:</span>{" "}
                    {analysisResult.hasH1 ? "예" : "아니오"}
                  </p>
                  <p>
                    <span className="font-semibold">이미지 사용:</span>{" "}
                    {analysisResult.hasImages ? "예" : "아니오"}
                  </p>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">개선 제안:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {analysisResult.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
