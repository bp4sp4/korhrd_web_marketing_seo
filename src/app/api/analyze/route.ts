import { NextRequest, NextResponse } from 'next/server'
import { getPopularPosts, getSmartBlocks, getAlsoSearched } from '@/services/naver-search'

export async function POST(request: NextRequest) {
  try {
    const { keyword } = await request.json()
    
    if (!keyword) {
      return NextResponse.json({ error: '키워드가 필요합니다.' }, { status: 400 })
    }

    console.log(`>>> 분석 시작: ${keyword}`)

    // 모든 데이터 수집
    const [popularPosts, smartBlocks, alsoSearched] = await Promise.all([
      getPopularPosts(keyword),
      getSmartBlocks(keyword),
      getAlsoSearched(keyword)
    ])

    // 스마트블록은 이미 문자열 배열이므로 그대로 사용
    const smartBlockKeywords = smartBlocks.filter(keyword => keyword.length > 0)

    // 연관 검색어를 문자열 배열로 변환
    const alsoSearchedKeywords = alsoSearched.map(item => 
      typeof item === 'string' ? item : item.title || ''
    ).filter(keyword => keyword.length > 0)

    // 분석 로직
    const analysis = analyzeResults(popularPosts, smartBlockKeywords, alsoSearchedKeywords, keyword)

    // 데이터 검증 및 정리
    const validatedPopularPosts = popularPosts.map((post, index) => ({
      title: post.title || '',
      content: post.content || '',
      author: post.author || '',
      date: post.date || '',
      link: post.link || '',
      rank: index + 1
    }))

    const validatedSmartBlocks = smartBlocks.map((block, index) => ({
      keyword: block,
      rank: index + 1
    }))

    const validatedAlsoSearched = alsoSearched.map((item, index) => ({
      title: typeof item === 'string' ? item : item.title || '',
      rank: index + 1
    }))

    // 상세 분석 정보 추가
    const detailedAnalysis = {
      ...analysis,
      keywordDensity: calculateKeywordDensity(
        popularPosts.map(post => post.title + ' ' + post.content).join(' '), 
        keyword
      ),
      contentFreshness: calculateFreshnessScore(popularPosts),
      competitionLevel: calculateCompetitionLevel(analysis.totalResults),
      seoInsights: generateSEOInsights(popularPosts, smartBlockKeywords, alsoSearchedKeywords, keyword),
      marketTrend: generateMarketTrend(popularPosts, smartBlockKeywords, alsoSearchedKeywords, keyword),
      searchVolume: calculateSearchVolume(popularPosts, smartBlocks, alsoSearched),
      difficultyLevel: calculateDifficultyLevel(popularPosts, smartBlocks, alsoSearched, keyword)
    }

    const result = {
      keyword,
      popularPosts: validatedPopularPosts,
      smartBlocks: validatedSmartBlocks,
      alsoSearched: validatedAlsoSearched,
      analysis: {
        totalResults: analysis.totalResults || 0,
        avgTitleLength: analysis.avgTitleLength || 0,
        avgContentLength: analysis.avgContentLength || 0,
        topKeywords: analysis.topKeywords || [],
        cRankScore: analysis.cRankScore || 0,
        exposureProbability: analysis.exposureProbability || 0,
        keywordDensity: detailedAnalysis.keywordDensity,
        contentFreshness: detailedAnalysis.contentFreshness,
        competitionLevel: detailedAnalysis.competitionLevel,
        seoInsights: detailedAnalysis.seoInsights,
        marketTrend: detailedAnalysis.marketTrend,
        searchVolume: detailedAnalysis.searchVolume,
        difficultyLevel: detailedAnalysis.difficultyLevel
      }
    }

    console.log(`>>> 분석 완료: ${keyword}`)
    return NextResponse.json(result)

  } catch (error) {
    console.error('분석 중 오류:', error)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

function analyzeResults(
  popularPosts: any[],
  smartBlocks: any[],
  alsoSearched: any[],
  keyword: string
) {
  // 키워드 추출 및 분석
  const smartBlockKeywords = smartBlocks.map(block => 
    typeof block === 'string' ? block : block.title || ''
  ).filter(keyword => keyword.length > 0)
  
  const alsoSearchedKeywords = alsoSearched.map(item => 
    typeof item === 'string' ? item : item.title || ''
  ).filter(keyword => keyword.length > 0)
  
  // 기본 통계
  const totalResults = popularPosts.length + smartBlockKeywords.length + alsoSearchedKeywords.length
  
  // 제목 길이 분석 (인기글이 없을 때는 기본값 사용)
  const titleLengths = popularPosts.map(post => post.title.length)
  const avgTitleLength = titleLengths.length > 0 
    ? Math.round(titleLengths.reduce((a, b) => a + b, 0) / titleLengths.length)
    : 25 // 기본값

  // 내용 길이 분석 (인기글이 없을 때는 기본값 사용)
  const contentLengths = popularPosts.map(post => post.content.length)
  const avgContentLength = contentLengths.length > 0
    ? Math.round(contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length)
    : 150 // 기본값

  const allText = [
    ...popularPosts.map(post => post.title + ' ' + post.content),
    ...smartBlockKeywords,
    ...alsoSearchedKeywords
  ].join(' ')

  const topKeywords = extractTopKeywords(allText, keyword)

  // C-RANK 점수 계산
  const cRankScore = calculateCRankScore(popularPosts, smartBlocks, alsoSearched)

  // 상위 노출 확률 계산
  const exposureProbability = calculateExposureProbability(cRankScore, totalResults)

  return {
    totalResults,
    avgTitleLength,
    avgContentLength,
    topKeywords,
    cRankScore,
    exposureProbability
  }
}

function extractTopKeywords(text: string, mainKeyword: string): string[] {
  // 형태소 분석을 통한 키워드 추출
  const morphemes = performMorphemeAnalysis(text)
  
  // 키워드 필터링 및 가중치 계산
  const keywordScores: { [key: string]: number } = {}
  
  morphemes.forEach(morpheme => {
    if (morpheme.word !== mainKeyword && 
        morpheme.word.length > 1 && 
        /[가-힣]/.test(morpheme.word)) {
      
      let score = 1
      
      // 품사별 가중치
      switch (morpheme.pos) {
        case 'NNG': // 일반명사
        case 'NNP': // 고유명사
          score = 3
          break
        case 'VV': // 동사
        case 'VA': // 형용사
          score = 2
          break
        case 'MAG': // 일반부사
          score = 1.5
          break
        default:
          score = 0.5
      }
      
      // 길이별 보너스
      if (morpheme.word.length >= 3) score *= 1.2
      if (morpheme.word.length >= 4) score *= 1.1
      
      keywordScores[morpheme.word] = (keywordScores[morpheme.word] || 0) + score
    }
  })

  return Object.entries(keywordScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
}

function performMorphemeAnalysis(text: string): Array<{word: string, pos: string}> {
  // 간단한 형태소 분석 (실제로는 KoNLPy나 다른 라이브러리 사용)
  const morphemes: Array<{word: string, pos: string}> = []
  
  // 한글 단어 추출
  const koreanWords = text.match(/[가-힣]+/g) || []
  
  koreanWords.forEach(word => {
    // 간단한 품사 판별 규칙
    let pos = 'NNG' // 기본값: 일반명사
    
    // 동사 패턴
    if (word.match(/.*(하다|되다|있다|없다|보다|보다|보다)$/)) {
      pos = 'VV'
    }
    // 형용사 패턴
    else if (word.match(/.*(다|한|한|한|한)$/)) {
      pos = 'VA'
    }
    // 부사 패턴
    else if (word.match(/.*(게|히|이|로|에|에서|부터|까지|도|만|은|는|이|가|을|를|의|와|과|하고|며|고|지만|라도|라도)$/)) {
      pos = 'MAG'
    }
    // 고유명사 패턴 (대문자로 시작하는 경우)
    else if (word.match(/^[가-힣]{2,}$/) && word.length >= 3) {
      pos = 'NNP'
    }
    
    morphemes.push({ word, pos })
  })
  
  return morphemes
}

function calculateCRankScore(popularPosts: any[], smartBlocks: any[], alsoSearched: any[]): number {
  let score = 0

  // 1. 인기글 노출 점수 (50점) - 실제 검색 결과에서 얼마나 노출되는지
  if (popularPosts.length > 0) {
    popularPosts.forEach((post, index) => {
      // 순위별 노출 점수 (1위: 15점, 2위: 12점, 3위: 10점, ...)
      const rankScore = Math.max(0, 15 - (index * 2))
      
      // 제목 길이 최적화 점수 (20-40자가 최적)
      const titleLength = post.title.length
      const titleScore = titleLength >= 20 && titleLength <= 40 ? 10 : 
                        titleLength >= 15 && titleLength <= 50 ? 7 : 
                        titleLength >= 10 && titleLength <= 60 ? 5 : 3
      
      // 내용 길이 최적화 점수 (100-300자가 최적)
      const contentLength = post.content.length
      const contentScore = contentLength >= 100 && contentLength <= 300 ? 10 :
                          contentLength >= 50 && contentLength <= 500 ? 7 :
                          contentLength >= 20 && contentLength <= 800 ? 5 : 3
      
      // 키워드 밀도 최적화 점수 (2-5%가 최적)
      const keywordDensity = calculateKeywordDensity(post.title + ' ' + post.content, '사회복지사')
      const keywordScore = keywordDensity >= 0.02 && keywordDensity <= 0.05 ? 10 :
                          keywordDensity >= 0.01 && keywordDensity <= 0.08 ? 7 :
                          keywordDensity >= 0.005 && keywordDensity <= 0.1 ? 5 : 3
      
      // 각 인기글의 종합 노출 점수
      score += (rankScore + titleScore + contentScore + keywordScore) * (1 - index * 0.1) // 순위가 낮을수록 가중치 감소
    })
  } else {
    // 인기글이 없으면 기본 점수 (노출 기회가 적음)
    score += 10
  }

  // 2. 스마트블록 연관성 점수 (25점) - 연관 키워드가 많을수록 노출 기회 증가
  const smartBlockKeywords = smartBlocks.map(block => 
    typeof block === 'string' ? block : block.title || ''
  ).filter(keyword => keyword.length > 0)
  const smartBlockScore = Math.min(25, smartBlockKeywords.length * 2.5)
  score += smartBlockScore

  // 3. 연관 검색어 점수 (15점) - 함께 찾는 검색어가 많을수록 노출 기회 증가
  const alsoSearchedKeywords = alsoSearched.map(item => 
    typeof item === 'string' ? item : item.title || ''
  ).filter(keyword => keyword.length > 0)
  const alsoSearchedScore = Math.min(15, alsoSearchedKeywords.length * 1.5)
  score += alsoSearchedScore

  // 4. 콘텐츠 신선도 점수 (10점) - 최신 콘텐츠일수록 노출 우선순위 높음
  const freshnessScore = calculateFreshnessScore(popularPosts)
  score += freshnessScore

  return Math.min(100, Math.round(score))
}

function calculateKeywordDensity(text: string, keyword: string): number {
  const totalWords = text.split(/\s+/).length
  const keywordCount = (text.match(new RegExp(keyword, 'gi')) || []).length
  return totalWords > 0 ? keywordCount / totalWords : 0
}

function calculateFreshnessScore(posts: any[]): number {
  let score = 0
  
  if (posts.length === 0) {
    return 5 // 기본 점수
  }
  
  posts.forEach(post => {
    const date = post.date
    if (date.includes('시간 전') || date.includes('분 전')) {
      score += 5
    } else if (date.includes('일 전')) {
      const days = parseInt(date.match(/(\d+)일/)?.[1] || '0')
      score += Math.max(0, 5 - days)
    } else if (date.includes('주 전')) {
      const weeks = parseInt(date.match(/(\d+)주/)?.[1] || '0')
      score += Math.max(0, 3 - weeks)
    } else if (date.includes('개월 전')) {
      const months = parseInt(date.match(/(\d+)개월/)?.[1] || '0')
      score += Math.max(0, 2 - months)
    }
  })
  
  return Math.min(15, score)
}

function calculateCompetitionLevel(totalResults: number): string {
  if (totalResults < 10) return '낮음'
  if (totalResults < 30) return '보통'
  if (totalResults < 50) return '높음'
  return '매우 높음'
}

function generateSEOInsights(popularPosts: any[], smartBlocks: string[], alsoSearched: string[], keyword: string): string[] {
  const insights: string[] = []
  
  if (popularPosts.length === 0) {
    insights.push('이 키워드는 아직 인기글이 없습니다. 새로운 콘텐츠로 시장을 선점할 기회입니다.')
    insights.push('최신 정보와 실용적인 내용으로 차별화된 콘텐츠를 작성해보세요.')
    insights.push('인기글이 없으면 검색 결과 상위 노출이 어려울 수 있습니다.')
  } else {
    // 제목 길이 분석
    const avgTitleLength = popularPosts.reduce((sum, post) => sum + post.title.length, 0) / popularPosts.length
    if (avgTitleLength < 20) {
      insights.push('제목이 너무 짧습니다. 20-40자로 늘려보세요. (검색 노출 최적화)')
    } else if (avgTitleLength > 50) {
      insights.push('제목이 너무 깁니다. 20-40자로 줄여보세요. (검색 노출 최적화)')
    }
    
    // 키워드 밀도 분석
    const allText = popularPosts.map(post => post.title + ' ' + post.content).join(' ')
    const keywordDensity = calculateKeywordDensity(allText, keyword)
    if (keywordDensity < 0.01) {
      insights.push('키워드 밀도가 낮습니다. 자연스럽게 키워드를 더 포함해보세요. (노출 점수 향상)')
    } else if (keywordDensity > 0.05) {
      insights.push('키워드 밀도가 너무 높습니다. 과도한 키워드 삽입을 피하세요. (스팸 방지)')
    }
    
    // 콘텐츠 신선도 분석
    const recentPosts = popularPosts.filter(post => 
      post.date.includes('시간 전') || post.date.includes('일 전') && parseInt(post.date.match(/(\d+)일/)?.[1] || '0') <= 7
    )
    if (recentPosts.length < popularPosts.length * 0.3) {
      insights.push('최신 콘텐츠가 부족합니다. 최근 1주일 내 콘텐츠를 더 작성해보세요. (신선도 점수 향상)')
    }
  }
  
  // 연관 키워드 분석
  if (smartBlocks.length < 5) {
    insights.push('연관 키워드가 적습니다. 더 다양한 키워드로 콘텐츠를 확장해보세요. (노출 기회 증가)')
  } else {
    insights.push('연관 키워드가 풍부합니다. 이 키워드들을 활용하여 콘텐츠를 확장해보세요.')
  }
  
  // 경쟁 분석
  if (popularPosts.length > 10) {
    insights.push('경쟁이 치열합니다. 차별화된 콘텐츠로 차별점을 만들어보세요. (노출 점수 향상)')
  }
  
  // 연관 검색어 활용
  if (alsoSearched.length > 0) {
    insights.push('함께 많이 찾는 검색어를 활용하여 콘텐츠를 확장해보세요. (노출 기회 증가)')
  }
  
  return insights
}

function generateMarketTrend(popularPosts: any[], smartBlocks: string[], alsoSearched: string[], keyword: string): string {
  const totalData = popularPosts.length + smartBlocks.length + alsoSearched.length
  
  if (totalData === 0) {
    return `"${keyword}" 키워드는 아직 시장에서 활발하게 논의되지 않고 있습니다. 이는 새로운 기회일 수 있으며, 선도적인 콘텐츠로 시장을 개척할 수 있는 좋은 타이밍입니다.`
  }
  
  if (popularPosts.length === 0) {
    return `"${keyword}" 키워드는 연관 키워드와 함께 많이 찾는 검색어가 있지만, 아직 인기글로 선정된 콘텐츠가 없습니다. 이는 시장 진입의 좋은 기회이며, 최신 정보와 실용적인 내용으로 차별화된 콘텐츠를 제공하면 상위 노출이 가능할 것으로 예상됩니다.`
  }
  
  const recentPosts = popularPosts.filter(post => 
    post.date.includes('시간 전') || post.date.includes('일 전') && parseInt(post.date.match(/(\d+)일/)?.[1] || '0') <= 7
  )
  
  if (recentPosts.length > popularPosts.length * 0.5) {
    return `"${keyword}" 키워드는 현재 매우 활발한 시장입니다. 최신 콘텐츠가 많이 생성되고 있으며, 사용자들의 관심이 높습니다. 시의적절한 콘텐츠와 최신 정보 제공이 중요합니다.`
  }
  
  return `"${keyword}" 키워드는 안정적인 시장을 형성하고 있습니다. 연관 키워드와 함께 많이 찾는 검색어가 다양하게 존재하며, 지속적인 콘텐츠 업데이트와 품질 향상이 필요합니다.`
}

function calculateSearchVolume(popularPosts: any[], smartBlocks: any[], alsoSearched: any[]): string {
  const totalData = popularPosts.length + smartBlocks.length + alsoSearched.length
  
  if (totalData >= 20) return '높음'
  if (totalData >= 10) return '보통'
  if (totalData >= 5) return '낮음'
  return '매우 낮음'
}

function calculateDifficultyLevel(popularPosts: any[], smartBlocks: any[], alsoSearched: any[], keyword: string): string {
  const totalData = popularPosts.length + smartBlocks.length + alsoSearched.length
  
  if (totalData === 0) return '쉬움'
  if (totalData < 10) return '보통'
  if (totalData < 20) return '어려움'
  return '매우 어려움'
}

function calculateExposureProbability(cRankScore: number, totalResults: number): number {
  // C-RANK 점수와 결과 수를 기반으로 상위 노출 확률 계산
  const baseProbability = cRankScore / 100
  const competitionFactor = Math.max(0.1, 1 - (totalResults / 100))
  
  return Math.min(0.95, baseProbability * competitionFactor)
} 