export interface AnalysisResult {
  keywordDensity: number;
  contentLength: number;
  hasH1: boolean;
  hasImages: boolean;
  suggestions: string[];
}

export function analyzeContent(content: string, keyword: string): AnalysisResult {
  const keywordCount = (content.match(new RegExp(keyword, 'gi')) || []).length;
  const contentLength = content.length;
  const keywordDensity = contentLength > 0 ? (keywordCount / contentLength) * 100 : 0;

  const hasH1 = /<h1.*?>.*?<\/h1>/i.test(content);
  const hasImages = /<img.*?>/i.test(content);

  const suggestions: string[] = [];
  if (keywordDensity < 0.5 || keywordDensity > 3) {
    suggestions.push('키워드 밀도를 0.5% ~ 3% 사이로 조절하는 것을 고려해보세요.');
  }
  if (contentLength < 500) {
    suggestions.push('콘텐츠 길이를 500자 이상으로 늘려 상세한 정보를 제공하는 것이 좋습니다.');
  }
  if (!hasH1) {
    suggestions.push('콘텐츠에 핵심 키워드를 포함한 <h1> 태그를 사용하는 것이 좋습니다.');
  }
  if (suggestions.length === 0) {
    suggestions.push('현재 콘텐츠는 스마트블록 노출에 유리한 기본적인 요소를 잘 갖추고 있습니다!');
  }

  return {
    keywordDensity: parseFloat(keywordDensity.toFixed(2)),
    contentLength,
    hasH1,
    hasImages,
    suggestions,
  };
}