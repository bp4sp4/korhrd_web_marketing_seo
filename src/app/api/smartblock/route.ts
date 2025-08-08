import { NextRequest, NextResponse } from 'next/server';
import { getSmartBlocks } from '@/services/naver-search';

export async function POST(request: NextRequest) {
  try {
    const { keyword } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: '키워드가 필요합니다.' }, { status: 400 });
    }

    const smartBlockData = await getSmartBlocks(keyword);

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