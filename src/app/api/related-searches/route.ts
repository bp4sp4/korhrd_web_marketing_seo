import { NextResponse } from 'next/server';
import { getAlsoSearched } from '../../../services/naver-search';

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();
    if (!keyword) {
      return NextResponse.json({ message: 'Keyword is required' }, { status: 400 });
    }

    const alsoSearched = await getAlsoSearched(keyword);
    return NextResponse.json({ alsoSearched });
  } catch (error) {
    console.error('Error in related-searches API:', error);
    return NextResponse.json({ message: 'Error fetching related searches' }, { status: 500 });
  }
}
