import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import BarcodeScanner from '../components/BarcodeScanner';
import styles from '../styles/Tablet.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Tablet() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ログイン状態をlocalStorageから復元
  useEffect(() => {
    const loggedIn = localStorage.getItem('tabletLoggedIn');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // お釣り計算
  useEffect(() => {
    if (scannedData && paymentMethod === 'cash' && cashReceived) {
      const received = parseInt(cashReceived);
      if (received >= scannedData.total_amount) {
        setChangeAmount(received - scannedData.total_amount);
      }
    }
  }, [cashReceived, scannedData, paymentMethod]);

  const handleLogin = () => {
    // 簡易的なログイン(本番環境では適切な認証を実装)
    if (password === 'admin123') {
      setIsLoggedIn(true);
      localStorage.setItem('tabletLoggedIn', 'true');
      setPassword('');
      setError('');
    } else {
      setError('パスワードが正しくありません');
    }
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか?')) {
      setIsLoggedIn(false);
      localStorage.removeItem('tabletLoggedIn');
    }
  };

  // QRコードスキャン成功時の処理
  const handleQRScanned = async (qrData) => {
    setShowScanner(false);
    setError('');
    setLoading(true);

    try {
      console.log('=== QRコード読み取り開始 ===');
      console.log('生のQRデータ:', qrData);
      
      // QRデータをデコード（日本語対応）
      const decoded = decodeURIComponent(escape(atob(qrData)));
      console.log('デコード後のデータ:', decoded);
      
      const data = JSON.parse(decoded);
      console.log('パース後のデータ:', data);
      
      setScannedData(data);
      // 即座に支払い画面を表示
      setShowPayment(true);
    } catch (err) {
      console.error('=== QRコード読み取りエラー ===');
      console.error('エラー詳細:', err);
      console.error('受け取ったQRデータ:', qrData);
      setError('無効なQRコードです: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // スキャン失敗時の処理
  const handleScanTimeout = () => {
    // スキャナーは自動で閉じるので何もしない
    setShowScanner(false);
  };

  // 支払い処理
  const processPayment = async () => {
    console.log('=== 支払い処理開始 ===');
    console.log('scannedData:', scannedData);
    console.log('paymentMethod:', paymentMethod);
    console.log('cashReceived:', cashReceived);

    if (!scannedData) {
      setError('会計情報が読み込まれていません');
      return;
    }

    if (paymentMethod === 'cash') {
      const received = parseInt(cashReceived);
      if (!received || received < scannedData.total_amount) {
        setError('お預かり金額が不足しています');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // お釣り計算
      const changeAmount = paymentMethod === 'cash' 
        ? parseInt(cashReceived) - scannedData.total_amount 
        : 0;

      // 取引IDを生成（タイムスタンプベース）
      const transactionId = `TXN-${Date.now()}`;

      console.log('会計完了:', {
        transactionId,
        totalAmount: scannedData.total_amount,
        paymentMethod,
        changeAmount
      });

      // 成功メッセージ
      setSuccessMessage(`ご利用ありがとうございました\n\n合計: ¥${scannedData.total_amount.toLocaleString()}\nお釣り: ¥${changeAmount.toLocaleString()}`);
      
      // リセット
      setScannedData(null);
      setShowPayment(false);
      setCashReceived('');
      setPaymentMethod('cash');

      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (err) {
      console.error('=== 支払い処理エラー ===');
      console.error('エラー詳細:', err);
      setError('支払い処理に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 支払いキャンセル
  const cancelPayment = () => {
    setShowPayment(false);
    setScannedData(null);
    setCashReceived('');
    setPaymentMethod('cash');
  };

  // ログイン画面
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>ログイン - タブレットモード</title>
        </Head>
        <div className={styles.loginContainer}>
          <div className={styles.loginBox}>
            <h1>タブレットモード</h1>
            <p>管理者パスワードを入力してください</p>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="パスワード"
              className={styles.passwordInput}
            />
            
            <button onClick={handleLogin} className={styles.loginBtn}>
              ログイン
            </button>

            <Link href="/register" className={styles.backLink}>
              ← レジモードへ戻る
            </Link>
          </div>
        </div>
      </>
    );
  }

  // メイン画面
  return (
    <>
      <Head>
        <title>タブレットモード - POS System</title>
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1>お会計</h1>
          <div className={styles.headerActions}>
            <Link href="/register" className={styles.registerLink}>
              商品登録モードへ
            </Link>
          </div>
        </header>

        {error && (
          <div className={styles.errorBanner}>
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {successMessage && (
          <div className={styles.successBanner}>
            {successMessage}
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.scanSection}>
            <div className={styles.scanCard}>
              <h2>会計QRコードをスキャン</h2>
              <p className={styles.scanInstruction}>
                商品登録モードで生成されたQRコードを読み取ってください
              </p>
              
              <button 
                className={styles.scanButton}
                onClick={() => setShowScanner(true)}
                disabled={loading}
              >
                📷 QRコードスキャン
              </button>

              {scannedData && !showPayment && (
                <div className={styles.scannedInfo}>
                  <h3>読み取り完了</h3>
                  <p>支払い方法を選択してください</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QRコードスキャナーモーダル */}
        {showScanner && (
          <BarcodeScanner 
            onScan={handleQRScanned}
            onClose={() => setShowScanner(false)}
            onTimeout={handleScanTimeout}
            mode="qr"
            tabletMode={true}
          />
        )}

        {/* 支払いモーダル */}
        {showPayment && scannedData && (
          <div className={styles.modal}>
            <div className={styles.paymentModalContent}>
              <h2>支払い処理</h2>
              
              {/* 会計情報表示 */}
              <div className={styles.paymentInfo}>
                <h3>会計内容</h3>
                <div className={styles.itemsList}>
                  {scannedData.items.map((item, index) => (
                    <div key={index} className={styles.paymentItem}>
                      <span className={styles.itemName}>
                        {item.NAME} × {item.quantity}
                      </span>
                      <span className={styles.itemPrice}>
                        ¥{item.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className={styles.subtotalRow}>
                  <span className={styles.subtotalLabel}>小計</span>
                  <span className={styles.subtotalAmount}>
                    ¥{Math.floor(scannedData.total_amount / 1.1).toLocaleString()}
                  </span>
                </div>
                <div className={styles.taxRow}>
                  <span className={styles.taxLabel}>消費税（10%）</span>
                  <span className={styles.taxAmount}>
                    ¥{(scannedData.total_amount - Math.floor(scannedData.total_amount / 1.1)).toLocaleString()}
                  </span>
                </div>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>合計</span>
                  <span className={styles.totalAmount}>
                    ¥{scannedData.total_amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 支払い方法選択 */}
              <div className={styles.paymentMethodSection}>
                <h3>支払い方法</h3>
                <div className={styles.paymentMethods}>
                  <button
                    className={`${styles.paymentBtn} ${paymentMethod === 'cash' ? styles.active : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    💵 現金
                  </button>
                  <button
                    className={`${styles.paymentBtn} ${paymentMethod === 'credit' ? styles.active : ''}`}
                    onClick={() => setPaymentMethod('credit')}
                  >
                    💳 クレジット
                  </button>
                  <button
                    className={`${styles.paymentBtn} ${paymentMethod === 'qr' ? styles.active : ''}`}
                    onClick={() => setPaymentMethod('qr')}
                  >
                    📱 QR決済
                  </button>
                  <button
                    className={`${styles.paymentBtn} ${paymentMethod === 'emoney' ? styles.active : ''}`}
                    onClick={() => setPaymentMethod('emoney')}
                  >
                    💰 電子マネー
                  </button>
                </div>
              </div>

              {/* 現金支払いの場合 */}
              {paymentMethod === 'cash' && (
                <div className={styles.cashInput}>
                  <label>お預かり金額</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="金額を入力"
                  />
                  {cashReceived && parseInt(cashReceived) >= scannedData.total_amount && (
                    <div className={styles.change}>
                      お釣り: ¥{changeAmount.toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* アクションボタン */}
              <div className={styles.modalActions}>
                <button 
                  className={styles.cancelBtn}
                  onClick={cancelPayment}
                  disabled={loading}
                >
                  キャンセル
                </button>
                <button 
                  className={styles.confirmBtn}
                  onClick={processPayment}
                  disabled={loading}
                >
                  {loading ? '処理中...' : '会計完了'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}