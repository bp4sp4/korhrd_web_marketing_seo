import { NextResponse } from 'next/server';
import { getPopularPosts } from '@/services/naver-search';

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const popularPosts = await getPopularPosts(keyword);
    return NextResponse.json({ popularPosts });
  } catch (error) {
    console.error('Error in popular-posts API:', error);
    return NextResponse.json({ error: 'Failed to fetch popular posts' }, { status: 500 });
  }
}
