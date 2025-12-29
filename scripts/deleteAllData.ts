/**
 * すべてのデータを削除するスクリプト
 * 
 * ⚠️ 警告: このスクリプトはすべてのデータを削除します。元に戻せません。
 * 実行前に必ずバックアップを取ってください。
 * 
 * 使用方法:
 * 1. このファイルを実行する前に、環境変数を確認してください
 * 2. Google認証が必要です（Google Drive APIのアクセストークン）
 * 3. Supabaseの接続情報が必要です
 */

import { GoogleApiService } from '../services/googleApiService';
import { ApiService } from '../services/apiService';

async function deleteAllData() {
  console.log('⚠️ 警告: すべてのデータを削除します。');
  console.log('この操作は元に戻せません。');
  
  // 確認（実際の使用時は、より安全な確認方法を使用してください）
  const confirm = process.argv.includes('--confirm');
  if (!confirm) {
    console.log('❌ 削除を実行するには --confirm フラグを追加してください。');
    console.log('例: npm run delete-all -- --confirm');
    return;
  }

  try {
    // 1. Supabaseのデータを削除
    console.log('\n📊 Supabaseのデータを削除中...');
    const apiService = new ApiService();
    
    // すべての要約を取得
    const summaries = await apiService.getSummaries();
    console.log(`   ${summaries.length}件の要約が見つかりました。`);
    
    // すべてのチャンネルを取得
    const channels = await apiService.getChannels();
    console.log(`   ${channels.length}件のチャンネルが見つかりました。`);
    
    // 注意: ApiServiceに削除メソッドがない場合、直接Supabaseを使用する必要があります
    console.log('   ⚠️ Supabaseダッシュボードから手動で削除してください。');
    console.log('   SQL Editorで以下を実行:');
    console.log('   DELETE FROM summaries;');
    console.log('   DELETE FROM channels;');

    // 2. Googleドキュメントを削除
    console.log('\n📄 Googleドキュメントを削除中...');
    
    // Google認証が必要です
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      console.log('   ⚠️ Google Client IDが設定されていません。');
      console.log('   Google Driveから手動で削除してください。');
      return;
    }

    const googleApi = new GoogleApiService(clientId);
    
    // 認証が必要（実際の実装では、認証フローを実装する必要があります）
    console.log('   ⚠️ Google認証が必要です。');
    console.log('   Google Driveから手動で「YouTube Insight Hub」フォルダを削除してください。');

    console.log('\n✅ 削除手順の案内を表示しました。');
    console.log('   実際の削除は、上記の手順に従って手動で実行してください。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// スクリプトを実行
deleteAllData();

