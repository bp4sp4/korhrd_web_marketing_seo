'use client'

import { useState } from 'react'

interface AnalysisResult {
  keyword: string
  popularPosts: {
    title: string
    content: string
    author: string
    date: string
    link: string
    rank: number
  }[]
  smartBlocks: {
    keyword: string
    rank: number
  }[]
  alsoSearched: {
    title: string
    rank: number
  }[]
  analysis: {
    totalResults: number
    avgTitleLength: number
    avgContentLength: number
    topKeywords: string[]
    cRankScore: number
    exposureProbability: number
    keywordDensity: number
    contentFreshness: number
    competitionLevel: string
    seoInsights: string[]
    marketTrend: string
    searchVolume: string
    difficultyLevel: string
  }
}

export default function AnalysisPage() {
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  const handleAnalyze = async () => {
    if (!keyword.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('분석 결과:', result)
        setAnalysisResult(result)
      } else {
        const errorData = await response.json()
        console.error('API 오류:', errorData)
      }
    } catch (error) {
      console.error('분석 중 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case '쉬움': return 'text-green-600'
      case '보통': return 'text-yellow-600'
      case '어려움': return 'text-orange-600'
      case '매우 어려움': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            네이버 검색 결과 종합 분석기
          </h1>
          <p className="text-lg text-gray-600">
            키워드의 상위 노출 확률, 시장 분석, SEO 인사이트를 한눈에 확인하세요
          </p>
        </div>

        {/* 검색 입력 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="분석할 키워드를 입력하세요 (예: 사회복지사, 부동산, 취업)"
              className="flex-1 px-6 py-4 text-lg border-2 border-black rounded-xl focus:border-blue-500 focus:outline-none text-black placeholder-gray-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !keyword.trim()}
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '분석 중...' : '분석 시작'}
            </button>
          </div>
        </div>

        {/* 분석 결과 */}
        {analysisResult && (
          <div className="space-y-8">
            {/* 메인 요약 카드 */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                📊 &ldquo;{analysisResult.keyword}&rdquo; 종합 분석 결과
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <div className={`text-4xl font-bold ${getScoreColor(analysisResult.analysis?.cRankScore || 0)} mb-2`}>
                    {analysisResult.analysis?.cRankScore?.toFixed(1) || '0.0'}
                  </div>
                                     <div className="text-gray-700 font-semibold">콘텐츠 노출 점수</div>
                   <div className="text-sm text-gray-600 mt-1">상위 노출 가능성</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {analysisResult.analysis?.exposureProbability ? 
                      (analysisResult.analysis.exposureProbability * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div className="text-gray-700 font-semibold">상위 노출 확률</div>
                  <div className="text-sm text-gray-600 mt-1">1페이지 진입</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <div className={`text-4xl font-bold ${getDifficultyColor(analysisResult.analysis?.difficultyLevel || '알 수 없음')} mb-2`}>
                    {analysisResult.analysis?.difficultyLevel || '알 수 없음'}
                  </div>
                  <div className="text-gray-700 font-semibold">경쟁 난이도</div>
                  <div className="text-sm text-gray-600 mt-1">시장 진입</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                  <div className="text-4xl font-bold text-orange-600 mb-2">
                    {analysisResult.analysis?.searchVolume || '보통'}
                  </div>
                  <div className="text-gray-700 font-semibold">검색량</div>
                  <div className="text-sm text-gray-600 mt-1">월간 트렌드</div>
                </div>
              </div>
            </div>

            {/* 상세 분석 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📈</span>키워드 밀도
                </h3>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {((analysisResult.analysis?.keywordDensity || 0) * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600">
                  {analysisResult.analysis?.keywordDensity < 0.01 ? '낮음 (개선 필요)' :
                   analysisResult.analysis?.keywordDensity > 0.05 ? '높음 (과도함)' : '적정 (양호)'}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🕒</span>콘텐츠 신선도
                </h3>
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {analysisResult.analysis?.contentFreshness || 0}/15
                </div>
                <div className="text-sm text-gray-600">
                  최신 콘텐츠 비율 (최근 1주일)
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">⚔️</span>경쟁 수준
                </h3>
                <div className="text-2xl font-bold text-red-600 mb-2">
                  {analysisResult.analysis?.competitionLevel || '알 수 없음'}
                </div>
                <div className="text-sm text-gray-600">
                  시장 경쟁도 분석
                </div>
              </div>
            </div>

            {/* 통합 데이터 분석 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 인기글 분석 */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-2">🔥</span>인기글 분석
                  <span className="ml-auto text-lg font-normal text-gray-500">
                    ({analysisResult.popularPosts?.length || 0}개)
                  </span>
                </h2>
                {analysisResult.popularPosts && analysisResult.popularPosts.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {analysisResult.popularPosts.map((post, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg text-blue-600 line-clamp-2">
                            {post.title || '제목 없음'}
                          </h3>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium ml-2 flex-shrink-0">
                            #{post.rank || index + 1}위
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2 line-clamp-2">{post.content || '내용 없음'}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>👤 {post.author || '알 수 없음'}</span>
                          <span>📅 {post.date || '알 수 없음'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-gray-500 text-lg mb-2">인기글이 없습니다</p>
                    <p className="text-gray-400 text-sm">이 키워드는 아직 인기글로 선정되지 않았거나, 새로운 키워드일 수 있습니다.</p>
                  </div>
                )}
              </div>

              {/* 스마트블록 & 연관 검색어 */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-2">🔗</span>연관 키워드 분석
                </h2>
                
                {/* 스마트블록 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="mr-2">💡</span>스마트블록 키워드
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      ({analysisResult.smartBlocks?.length || 0}개)
                    </span>
                  </h3>
                  {analysisResult.smartBlocks && analysisResult.smartBlocks.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {analysisResult.smartBlocks.map((block, index) => (
                        <div key={index} className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 text-center">
                          <div className="text-sm font-semibold text-gray-800 mb-1">
                            {block.keyword || '키워드 없음'}
                          </div>
                          <div className="text-xs text-gray-600">
                            순위: {block.rank || index + 1}위
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">스마트블록 데이터가 없습니다</p>
                    </div>
                  )}
                </div>

                {/* 연관 검색어 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                    <span className="mr-2">🔍</span>함께 많이 찾는 검색어
                    <span className="ml-auto text-sm font-normal text-gray-500">
                      ({analysisResult.alsoSearched?.length || 0}개)
                    </span>
                  </h3>
                  {analysisResult.alsoSearched && analysisResult.alsoSearched.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {analysisResult.alsoSearched.map((item, index) => (
                        <div key={index} className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 text-center">
                          <div className="text-sm font-semibold text-gray-800 mb-1">
                            {item.title || '키워드 없음'}
                          </div>
                          <div className="text-xs text-gray-600">
                            순위: {item.rank || index + 1}위
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">연관 검색어 데이터가 없습니다</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 키워드 분석 & SEO 인사이트 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 상위 키워드 */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-2">🎯</span>주요 키워드 분석
                </h2>
                {analysisResult.analysis?.topKeywords && analysisResult.analysis.topKeywords.length > 0 ? (
                  <div className="space-y-3">
                    {analysisResult.analysis.topKeywords.map((keyword, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                        <span className="font-semibold text-gray-800">{keyword}</span>
                        <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                          #{index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-500">키워드 데이터가 부족합니다</p>
                  </div>
                )}
              </div>

              {/* SEO 인사이트 */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-2">💡</span>SEO 인사이트
                </h2>
                {analysisResult.analysis?.seoInsights && analysisResult.analysis.seoInsights.length > 0 ? (
                  <div className="space-y-4">
                    {analysisResult.analysis.seoInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">{insight}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-gray-500">분석 데이터가 부족하여 인사이트를 제공할 수 없습니다</p>
                  </div>
                )}
              </div>
            </div>

            {/* 시장 트렌드 */}
            {analysisResult.analysis?.marketTrend && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-2">📈</span>시장 트렌드 분석
                </h2>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {analysisResult.analysis.marketTrend}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 