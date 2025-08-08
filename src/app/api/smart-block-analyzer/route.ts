import { NextResponse } from 'next/server';
import { analyzeContent } from '../../../services/naver-smart-block-analyzer';

export async function POST(request: Request) {
  try {
    const { content, keyword } = await request.json();

    if (!content || !keyword) {
      return NextResponse.json({ message: 'Content and keyword are required' }, { status: 400 });
    }

    const analysisResult = analyzeContent(content, keyword);
    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Error in smart-block-analyzer API:', error);
    return NextResponse.json({ message: 'Error analyzing content' }, { status: 500 });
  }
}
