import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

interface FileEntry {
  url: string;
  name: string;
}

export async function POST(req: NextRequest) {
  const { files, zipName } = await req.json() as { files: FileEntry[]; zipName?: string };

  const validFiles = (files as FileEntry[]).filter(f => f?.url);
  if (!validFiles.length) {
    return NextResponse.json({ error: '다운로드할 파일이 없습니다.' }, { status: 400 });
  }

  const zip = new JSZip();

  const results = await Promise.allSettled(
    validFiles.map(async (file) => {
      const res = await fetch(file.url, {
        headers: {
          'Referer': 'https://www.g2b.go.kr/',
          'User-Agent': 'Mozilla/5.0',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${file.url}`);
      const buffer = await res.arrayBuffer();

      // 파일명이 없으면 URL 마지막 세그먼트에서 추출
      let fileName = file.name?.trim();
      if (!fileName) {
        fileName = decodeURIComponent(file.url.split('/').pop()?.split('?')[0] || 'file');
      }
      // 동일 파일명 중복 방지
      zip.file(fileName, buffer);
    })
  );

  const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
  if (failed.length === validFiles.length) {
    return NextResponse.json(
      { error: '모든 파일 다운로드에 실패했습니다. 나라장터에서 직접 받아주세요.' },
      { status: 502 }
    );
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const filename = encodeURIComponent((zipName || '첨부파일') + '.zip');

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Content-Length': String(zipBuffer.length),
    },
  });
}
